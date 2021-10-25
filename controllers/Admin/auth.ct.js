const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const { Admin } = require("../../database/models");
const ResponseBuilder = require("../../utils/responseBuilder");
const requestValidator = require("../../utils/requestValidator"); // for validating requests efficiently
const { convertPersianNumberToEnglish } = require("../../utils/input");
const MAIN_CONFIG = require("../../config/mainConfig");

const { generatePhoneNumberCode } = require("../../utils/helperFunction");

/**
 * for calculating the expire time
 */
const expireTimeCalculator = () => {
  const refreshTokenExpireTime = MAIN_CONFIG.refresh_token_admin_expires_in;
  const days = refreshTokenExpireTime.split(" ")[0];

  return (parseInt(days) * 24 * 60 * 60).toString();
};

/**
 * for handling admin login
 * @param {req} req
 * @param {req} res
 * @param {next} next
 */
exports.login = async (req, res, next) => {
  const response = new ResponseBuilder();

  const username = req.body["username"];
  const password = req.body["password"];

  const client_secret = req.headers["client_secret"];
  // if (client_secret !== MAIN_CONFIG.__ADMIN_CLIENT_ID) {
  //   return res.status(403).json({ message: "Unauthorized" });
  // }

  const isRequestInvalid = requestValidator(req, response);

  if (isRequestInvalid) {
    res.status(422).json(isRequestInvalid);
  } else {
    // in case that required field exist
    try {
      const admin = await Admin.findOne({
        where: { username: username },
      });
      // check if this admin with this info exist
      if (admin) {
        const passwordIsCorrect = bcrypt.compareSync(
          convertPersianNumberToEnglish(password),
          admin.password
        );
        // check if password correct
        if (passwordIsCorrect) {
          // adminId: admin.id, logged_in: true;

          // creating a access_token and refresh_token payloads
          const accessTokenPayload = {
            adminId: admin.id,
            username: admin.username,
            config: {
              securityTime: admin.security_update_time,
              isRefreshToken: false,
            },
          };

          // const refreshTokenPayload = {
          //   adminId: admin.id,
          //   username: admin.username,
          //   config: {
          //     securityTime: admin.security_update_time,
          //     isRefreshToken: true,
          //   },
          // };

          // generating access_token 
          const access_token = jwt.sign(
            accessTokenPayload,
            process.env.ADMIN_TOKEN_SECRET,
            {
              expiresIn: MAIN_CONFIG.refresh_token_admin_expires_in,
            }
          );

          const responseData = {
            type: "Bearer",
            expires_in: expireTimeCalculator(),
            access_token: access_token,
          };

          let adminGeneratedTokens = admin.generated_tokens_count;
          admin.generated_tokens_count = adminGeneratedTokens + 1;
          await admin.save();

          response.setResponseData(responseData);
          response.setUserMessage("خوش آمدید", "success");
          res.status(200).json(response.build());
        } else {
          response.setUserMessage("رمزعبور وارد شده صحیح نمی باشد", "error");
          res.status(422).json(response.build());
        }
      } else {
        response.setUserMessage("کاربری با این نام کاربری  وجود ندارد", "error");
        res.status(422).json(response.build());
      }
    } catch (err) {
      console.log(err);
      response.addDevMsg(err.toString());
      response.setUserMessage(
        "مشکل در ارتباط با سرور به وجود آمده است",
        "warning",
        true
      );
      res.status(500).json(response.build());
    }
  }
};

exports.check = async (req, res, next) => {
  const token = req.body.token;
  try {
    const accessToken = token.split(" ")[1];
    jwt.verify(accessToken, process.env.ADMIN_TOKEN_SECRET);
    res.status(200).send();
  } catch (error) {
    console.log(error);
    res.status(403).send();
  }
} 

