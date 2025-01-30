const ffmpeg = require("fluent-ffmpeg");
const { PassThrough } = require("stream");
const { uploadToS3WithStream } = require("../services/s3Service");
const mammoth = require("mammoth");
const puppeteer = require("puppeteer");
const sharp = require("sharp");
const fs = require("fs");

const generateThumbnail = async (imageName, inputPath, seconds = 1) => {
  console.log(imageName, inputPath);
  try {
    const passThroughStream = new PassThrough();

    ffmpeg(inputPath)
      .seekInput(seconds) // Start capturing at the specified time
      .outputOptions([
        "-vframes 1", // Capture only one frame
        "-f image2pipe", // Output as an image stream
        "-c:v png", // Use PNG codec
        "-vf scale=1920:-1", // Set resolution to 1920px width, height auto-adjusted
        "-pix_fmt rgb24", // Ensure high-quality pixel format (no subsampling)
        "-q:v 2", // Set high quality for compression (lower is better, 1-31 scale)
      ])
      .pipe(passThroughStream, { end: true }); // Pipe to stream
    const url = await uploadToS3WithStream(
      passThroughStream,
      `${Date.now()}-thumbnail.png`
    );
    console.log(url);
    return url?.Location;
  } catch (err) {
    console.log("=-=-=-=-==-=-=", err);
    return "";
  }
};

const getBufferFromURL = async (url) => {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const buffer = await response.arrayBuffer(); // Use arrayBuffer for binary data
    return Buffer.from(buffer); // Convert to Node.js Buffer
  } catch (error) {
    console.error("Error fetching data from URL:", error);
    throw error;
  }
};

const generateThumbnailForDoc = async (docxPath, width = 800) => {
  const buffer = await getBufferFromURL(docxPath);
  const result = await mammoth.convertToHtml({ buffer: buffer });
  const html = result.value;

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html); // Set the HTML content

  // Optional: Set viewport size for better control
  await page.setViewport({ width: 1200, height: 800 }); // Adjust as needed

  let imagePath = Date.now() + ".png";
  imagePath = "/uploads" + imagePath;
  await page.screenshot({ path: imagePath }); // Screenshot the page
  await browser.close();

  // Resize with Sharp (as before)
  const bufferData = await sharp(imagePath).resize(width).toBuffer();
  const url = await uploadToS3WithStream(
    bufferData,
    `${Date.now()}-thumbnail.png`
  );
  console.log(url);
  fs.unlinkSync(imagePath); // Cleanup
  return url?.Location;
};

module.exports = { generateThumbnail, generateThumbnailForDoc };
