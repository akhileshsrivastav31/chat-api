const AWS = require("aws-sdk");
const {
  AWS_BUCKET,
  AWS_REGION,
  IAM_USER_ACCESS_KEY,
  IAM_USER_SECRET_KEY,
} = require("../config");

AWS.config.update({
  accessKeyId: IAM_USER_ACCESS_KEY,
  secretAccessKey: IAM_USER_SECRET_KEY,
  region: AWS_REGION,
});

const s3 = new AWS.S3();

const uploadToS3WithStream = (stream, key, contentType = "image/png") => {
  const params = {
    Bucket: AWS_BUCKET,
    Key: key,
    Body: stream,
    ContentType: contentType,
  };

  return s3.upload(params).promise();
};

module.exports = {
  uploadToS3WithStream,
};
