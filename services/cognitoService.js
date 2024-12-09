const AWS = require("aws-sdk");
const config = require("../config");
AWS.config.update({ region: config.AWS_REGION });

const cognito = new AWS.CognitoIdentityServiceProvider();

const generateToken = async () => {
  try {
    const params = {
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: config.USER_POOL_CLIENT_ID,
      AuthParameters: {
        USERNAME: "6387577904",
        PASSWORD: "Sumit@12",
      },
    };
    const authResult = await cognito.initiateAuth(params).promise();
    console.log("Authentication successful:", authResult);
  } catch (err) {
    console.log(err);
  }
};

module.exports = { generateToken };
