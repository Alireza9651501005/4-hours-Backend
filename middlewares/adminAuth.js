const jwt = require("jsonwebtoken");

const { Admin } = require("../database/models");
const ResponseBuilder = require("../utils/responseBuilder");

/**
 * for admin routes guarding
 * @param {req} req
 * @param {res} res
 * @param {next} next function for handling gate passing and error handling
 */
const isAdminAuth = async (req, res, next) => {
	const response = new ResponseBuilder();
  // let accessToken = req.headers["access_token"];
  let accessToken = req.headers["authorization"];
  if (accessToken) {
    // for Bearer structure
    accessToken = accessToken.split(" ")[1];
    try {
      const token_information = jwt.verify(
        accessToken,
        process.env.ADMIN_TOKEN_SECRET
      );
      if (
        token_information &&
        token_information.config.isRefreshToken === false
      ) {
        const admins = await Admin.findAll({
          where: {
            id: token_information.adminId,
            username: token_information.username,
          },
        });
        console.log(token_information);
        if (admins.length > 0) {
          if (
            admins[0].security_update_time !==
            token_information.config.securityTime
          ) {
            response.addDevMsg("access denied");
            response.setUserMessage("مجددا وارد شوید", "error", true);
            res.status(403).json(response.build());
          } else {
            // making access to user row available in requires
            req.adminInfo = admins[0];
            next();
          }
        } else {
          response.addDevMsg("access denied");
          response.setUserMessage(
            "شما به این محتوا دسترسی ندارید",
            "error",
            true
          );
          res.status(403).json(response.build());
        }
      } else {
        response.addDevMsg("access_token is not valid");
        res.status(401).json(response.build());
      }
    } catch (err) {
      console.log(err);
      response.addDevMsg("access_token is not valid");
      response.addDevMsg(err.toString());
      res.status(401).json(response.build());
    }
  } else {
    response.addDevMsg("access_token is not include");
    res.status(403).json(response.build());
  }
};

module.exports = isAdminAuth;
