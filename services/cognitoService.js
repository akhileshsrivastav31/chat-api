const AWS = require("aws-sdk");
const config = require("../config");
AWS.config.update({ region: config.AWS_REGION });
const crypto = require("crypto");

const cognito = new AWS.CognitoIdentityServiceProvider();

const verifyUser = async () => {
  let username = "";
  let otp = "";
  let session = "";
  const params = {
    ClientId: config.USER_POOL_CLIENT_ID, // Replace with your Cognito App Client ID
    ChallengeName: "CUSTOM_CHALLENGE",
    Session: session, // Session token from initiateAuth
    ChallengeResponses: {
      USERNAME: username,
      ANSWER: otp, // OTP entered by the user
    },
  };

  try {
    const response = await cognito.respondToAuthChallenge(params).promise();
    console.log("Challenge response successful:", response);
    return response; // Contains tokens if successful
  } catch (error) {
    console.error("Error responding to challenge:", error);
    throw error;
  }
};
const registerUser = async () => {
  let phoneNumber = "+916387577904";
  const params = {
    ClientId: config.USER_POOL_CLIENT_ID,
    Username: phoneNumber,
    Password: "Test123@12",
    UserAttributes: [
      {
        Name: "phone_number",
        Value: "" + phoneNumber,
      },
    ],
  };

  try {
    const result = await cognito.signUp(params).promise();
    await generateToken();
    console.log("User registered successfully:", result);
    return result;
  } catch (error) {
    console.error("Error registering user:", error);
    throw error;
  }
};

const generateToken = async () => {
  try {
    const params = {
      AuthFlow: "CUSTOM_AUTH",
      ClientId: config.USER_POOL_CLIENT_ID,
      AuthParameters: {
        USERNAME: "+916387577904",
      },
    };
    const authResult = await cognito.initiateAuth(params).promise();
    console.log("Authentication successful:", authResult);
  } catch (err) {
    console.log(err);
  }
};

module.exports = { generateToken, registerUser, verifyUser };
