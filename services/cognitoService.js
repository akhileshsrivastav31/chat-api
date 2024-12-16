const AWS = require("aws-sdk");
const config = require("../config");
AWS.config.update({ region: config.AWS_REGION });
const crypto = require("crypto");

const cognito = new AWS.CognitoIdentityServiceProvider();

const verifyUser = async () => {
  let username = "+916387577904";
  let otp = "830670";
  let session =
    "AYABeBLSZ6zGqI4a5CEpzPAFku0AHQABAAdTZXJ2aWNlABBDb2duaXRvVXNlclBvb2xzAAEAB2F3cy1rbXMATGFybjphd3M6a21zOmFwLXNvdXRoLTE6NjU0NDM0NDQ0NzkwOmtleS8yNjg1NWU1NC05NTMzLTRhNDctYjYxNy1hYjgwYjMyNDkxZWQAuAECAQB4IiNWL_vNLuA_HYRb4PrTYxCHn3uVXc9cwgKEMGhCAIsBbY0EPqrf8hA9o79PKoSHnAAAAH4wfAYJKoZIhvcNAQcGoG8wbQIBADBoBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDLIDhWZdHr0IAgyeZgIBEIA7U_TmA8wavB1PSSGttnrMQuwjKL_me68I7cFtSC1SyukHs3EM9kj_a4gC7c8eSczYpkzxBlD0cuCuw1MCAAAAAAwAABAAAAAAAAAAAAAAAAAAgBiOp0pMstA-AxwM7q4nx_____8AAAABAAAAAAAAAAAAAAABAAABIxV4__B9K_czlvY5iGKllp6VOc9-jfl5eAQ8vbEl-kV2Mzad51-EgT3DFKFWMU2wTe7F3Tr0aYOoCGf17g44kH0ndM_blqt4JpWJuZ8ZtDJH93A3yDUhncZw6_cdkBPMHVXKQmbqhmY1kTOF5OouAkJXRlSz3LiP6WAGGIMvGN81Rg3xN4_Ws2Yovnuvfm-vWbKxXcHjHm5yzDPCSBAW1RXrBNOvpNm8_oSNXdj5akFdj_8A2Y25Y4bO9Aoh7NXWQCCsVnlV_mt2AMNLPd1kXfqotKlQ40kDn5S5psDAX_-H7YPG65eL6SwObqVDp4XW5rIzrWK86E249DuuhbkcUrz18nvHIDtWm-su2j5Pb37lhgxlgIJ2CLk8zvUlaq6gQmTtpgQd9V3-A3NV90ePC9JufQY";
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
  let phoneNumber = "+918401355858";
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
