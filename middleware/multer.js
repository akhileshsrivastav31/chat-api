const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
const config = require("../config");

const s3 = new S3Client({
  credentials: {
    accessKeyId: config.IAM_USER_ACCESS_KEY,
    secretAccessKey: config.IAM_USER_SECRET_KEY,
  },
  region: config.AWS_REGION,
});

const s3Storage = multerS3({
  s3: s3,
  bucket: config.AWS_BUCKET,
  metadata: (req, file, cb) => {
    cb(null, { fieldname: file.fieldname });
  },
  key: (req, file, cb) => {
    const fileName =
      Date.now() + "_" + file.fieldname + "_" + file.originalname;
    cb(null, fileName);
  },
});

const upload = multer({
  storage: s3Storage,
});

module.exports = upload;
