const AWS = require("aws-sdk");
const config = require("../config");
AWS.config.update({ region: config.AWS_REGION });
const crypto = require("crypto");

const cognito = new AWS.CognitoIdentityServiceProvider();

const verifyUser = async (phoneNumber, confirmationCode) => {
  const hash = computeSecretHash(
    phoneNumber,
    config.USER_POOL_CLIENT_ID,
    config.USER_POOL_CLIENT_SECRET
  );
  const params = {
    ClientId: config.USER_POOL_CLIENT_ID, // Replace with your Cognito App Client ID
    Username: phoneNumber,
    ConfirmationCode: confirmationCode,
    SecretHash: hash,
  };

  try {
    const result = await cognito.confirmSignUp(params).promise();
    console.log("User verified successfully:", result);
    return result;
  } catch (error) {
    console.error("Error verifying user:", error);
    throw error;
  }
};
const registerUser = async () => {
  let phoneNumber = "918707660271";
  const hash = computeSecretHash(
    phoneNumber,
    config.USER_POOL_CLIENT_ID,
    config.USER_POOL_CLIENT_SECRET
  );
  const params = {
    ClientId: config.USER_POOL_CLIENT_ID,
    Username: phoneNumber,
    Password: "Sumit@12",
    SecretHash: hash,
    UserAttributes: [
      {
        Name: "phone_number",
        Value: "+" + phoneNumber,
      },
    ],
  };

  try {
    const result = await cognito.signUp(params).promise();
    console.log("User registered successfully:", result);
    return result;
  } catch (error) {
    console.error("Error registering user:", error);
    throw error;
  }
};

const generateToken = async () => {
  try {
    const getauth = await computeSecretHash(
      "9891361660",
      config.USER_POOL_CLIENT_ID,
      config.USER_POOL_CLIENT_SECRET
    );
    const params = {
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: config.USER_POOL_CLIENT_ID,
      AuthParameters: {
        USERNAME: "9891361660",
        PASSWORD: "Atharv@2019",
        SECRET_HASH: getauth,
      },
    };
    const authResult = await cognito.initiateAuth(params).promise();
    const getSession = await generatePassword(authResult.Session);
    console.log("Authentication successful:", authResult);
  } catch (err) {
    console.log(err);
  }
};

const computeSecretHash = (username, clientId, clientSecret) => {
  const message = username + clientId;
  return crypto
    .createHmac("SHA256", clientSecret)
    .update(message)
    .digest("base64");
};

const generatePassword = async (session) => {
  const getauth = await computeSecretHash(
    "9891361660",
    config.USER_POOL_CLIENT_ID,
    config.USER_POOL_CLIENT_SECRET
  );
  const params = {
    ChallengeName: "NEW_PASSWORD_REQUIRED",
    ClientId: config.USER_POOL_CLIENT_ID,
    Session: session,
    ChallengeResponses: {
      USERNAME: "9891361660", // The user's username
      NEW_PASSWORD: "Atharv@2019", // The new password the user wants to set
      SECRET_HASH: getauth,
    },
  };

  try {
    const response = await cognito.respondToAuthChallenge(params).promise();
    console.log("Challenge response successful:", response);

    // Extract tokens from the response
    const { IdToken, AccessToken, RefreshToken } =
      response.AuthenticationResult || {};
    return { IdToken, AccessToken, RefreshToken };
  } catch (error) {
    console.error("Error responding to challenge:", error);
    throw new Error(error.message || "Failed to respond to the challenge");
  }
};
module.exports = { generateToken, registerUser, verifyUser };
