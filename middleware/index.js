const config = require("../config");
const { error } = require("../handlers");
const jwt = require("jsonwebtoken");
const jwkToPem = require("jwk-to-pem");
const User = require("../models/userModel");
const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccount.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
let pems = {};
// const getPems = async () => {
//   if (Object.keys(pems).length) return pems;

//   const url = `https://cognito-idp.${config.AWS_REGION}.amazonaws.com/${config.USER_POOL_ID}/.well-known/jwks.json`;
//   const response = await fetch(url);
//   const data = await response.json();
//   data.keys.forEach((key) => {
//     pems[key.kid] = jwkToPem(key);
//   });

//   return pems;
// };

// const verifyToken = async (req, res, next) => {
//   const token = req.headers?.authorization?.split(" ")[1];
//   if (!token) {
//     return error(res, {
//       msg: "Authorization token is required",
//       statusCode: 419,
//     });
//   }
//   try {
//     const decoded = jwt.decode(token, { complete: true });
//     if (!decoded) {
//       return error(res, {
//         msg: "Invalid token",
//         statusCode: 401,
//       });
//     }

//     const pems = await getPems();
//     const pem = pems[decoded.header.kid];
//     if (!pem) {
//       return error(res, {
//         msg: "Invalid token",
//         statusCode: 401,
//       });
//     }
//     const user = jwt.verify(token, pem, { algorithms: ["RS256"] });
//     const dbUser = await User.findOne({
//       cognitoUserId: user.sub,
//     });
//     if (!dbUser && !req.url?.endsWith("/api/auth") && req.method !== "POST") {
//       return error(res, {
//         msg: "User not found!!",
//         statusCode: 404,
//       });
//     }
//     if (dbUser) {
//       if (!dbUser.isActive) {
//         return error(res, {
//           msg: "Your account is inactive. Contact admin to activate your account",
//           statusCode: 403,
//         });
//       }
//       req.user = dbUser;
//     }
//     req.cognitoUser = user;
//     next();
//   } catch (err) {
//     console.log(err);
//     return error(res, {
//       msg: "Invalid token",
//       statusCode: 401,
//     });
//   }
// };

const verifyToken = async (req, res, next) => {
  let token = req.headers?.authorization?.split(" ")[1];
  if (!token) {
    return error(res, {
      msg: "Authorization token is required",
      statusCode: 419,
    });
  }
  try {
    const tokenArr = token.split(" ");
    if (tokenArr.length > 1) token = tokenArr[1];
    const user = await admin.auth().verifyIdToken(token);
    const dbUser = await User.findOne({
      cognitoUserId: user.sub,
    });
    console.log(req.method);
    if (
      !dbUser &&
      !req.url?.endsWith("/api/v1/auth") &&
      !["POST", "GET"].includes(req.method)
    ) {
      return error(res, {
        msg: "User not found!!",
        statusCode: 404,
      });
    }
    if (dbUser) {
      if (!dbUser.isActive) {
        return error(res, {
          msg: "Your account is inactive. Contact admin to activate your account",
          statusCode: 403,
        });
      }
      req.user = dbUser;
    }
    req.cognitoUser = user;
    next();
  } catch (err) {
    console.log(err);
    return error(res, {
      msg: "Invalid token",
      statusCode: 401,
    });
  }
};

module.exports = {
  verifyToken,
};
