const ffmpeg = require("fluent-ffmpeg");
const { PassThrough } = require("stream");
const { uploadToS3WithStream } = require("../services/s3Service");

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

module.exports = { generateThumbnail };
