const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const { inviteCodeScore } = require("./score.ct");
const { User, UserCheck, UserDevice, Wallet, Course } = require("../database/models");
const ResponseBuilder = require("../utils/responseBuilder");
const requestValidator = require("../utils/requestValidator"); // for validating requests efficiently
const { convertPersianNumberToEnglish } = require("../utils/input");
const { addSMSForVerification } = require("../utils/smsHandler");
const MAIN_CONFIG = require("../config/mainConfig");


const { addEmailForVerification } = require("../utils/emailHandler");
const { generatePhoneNumberCode , checkIsEmailOrPhone } = require("../utils/helperFunction");

/**
 * for calculating the expire time
 */
const expireTimeCalculator = () => {
  const refreshTokenExpireTime = MAIN_CONFIG.refresh_token_expires_in;
  const days = refreshTokenExpireTime.split(" ")[0];

  return (parseInt(days) * 24 * 60 * 60).toString();
};

/**
 * for creating a unique invite code for user
 */
const createAndSetInviteCode = async (user) => {
  const inviteCodeLength = MAIN_CONFIG.user_invite_code_length;
  let inviteCode = "";
  const easyLetters = "0123456789";
  const letters =
    "1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let userWithThisInviteCodeExist = true;

  let tryCount = 0;

  while (userWithThisInviteCodeExist) {
    if (tryCount >= Math.pow(10, MAIN_CONFIG.user_invite_code_length)) {
      break;
    }

    tryCount++;
    inviteCode = "";
    for (let i = 1; i <= inviteCodeLength; i++) {
      inviteCode +=
        easyLetters[Math.round(Math.random() * (easyLetters.length - 1))];
    }
    const sameUser = await User.findAll({ where: { invite_code: inviteCode } });
    userWithThisInviteCodeExist = sameUser.length !== 0;
  }

  /* when code strength is not enough */
  while (
    userWithThisInviteCodeExist &&
    tryCount >= Math.pow(10, MAIN_CONFIG.user_invite_code_length)
  ) {
    inviteCode = "";
    for (let i = 1; i <= inviteCodeLength; i++) {
      inviteCode += letters[Math.round(Math.random() * (letters.length - 1))];
    }
    const sameUser = await User.findAll({ where: { invite_code: inviteCode } });
    userWithThisInviteCodeExist = sameUser.length !== 0;
  }

  /* when we sure that invite key is unique */
  try {
    user.invite_code = inviteCode;
    await user.save();
  } catch (err) {
    console.log(err);
  }
};

/**
 * For check that this user exist or not and if not exist, send verification code to the user
 * @param {req} req request
 * @param {req} res response
 * @param {next} next
 */
exports.checkUserPhoneNumberOrEmail = async (req, res, next) => {
  const response = new ResponseBuilder();

  const isRequestInvalid = requestValidator(req, response);
  if (isRequestInvalid) {
    return res.status(422).json(isRequestInvalid);
  }

  const phone_email =convertPersianNumberToEnglish( req.body["phone_email"]).trim();
  const from =req.body["from"];
  console.log(from,)
  try {
    const verificationCode = generatePhoneNumberCode();

    const isPhoneOrEmail = checkIsEmailOrPhone(phone_email);
    let user=null;
    if(isPhoneOrEmail===1){
      user = await User.findOne({
        where: { email: phone_email},
      });
      if(!user && from==1){
        console.log(user, 'i am fardin')
        response.addDevMsg('user is not registered');
        response.setUserMessage(
        "لطفا ابتدا ثبت نام کنید",
        "error",
        false
      );
        return res.status(404).json(response.build());
      }else if (from!=1 && user) {
        response.addDevMsg('user is registered');
        response.setUserMessage(
        "شما قبلا با این ایمیل ثبت نام کرده اید",
        "error",
        false
      );
        return res.status(400).json(response.build());
      }
      /* send verification code for email */
				addEmailForVerification(phone_email, verificationCode);
    }else if(isPhoneOrEmail===2){
      user = await User.findAll({
        where: { phone: phone_email},
      });
      if(!user[0] && from==1){
        response.addDevMsg('user is not registered');
        response.setUserMessage(
        "لطفا ابتدا ثبت نام کنید",
        "error",
        false
      );
        return res.status(404).json(response.build());
      }else if (from!=1 && user[0]) {
        response.addDevMsg('user is registered');
        response.setUserMessage(
        "شما قبلا با این شماره تلفن ثبت نام کرده اید",
        "error",
        false
      );
        return res.status(400).json(response.build());
      }
      //send verification code for SMS
      addSMSForVerification(phone_email, verificationCode);
    }else{
      response.addDevMsg('input field is not Email or Phone number');
      response.setUserMessage(
        "لطفا شماره همراه یا ایمیل خود را وارد کنید",
        "warning",
        true
      );
      res.status(400).json(response.build());
    }
    const newUserCheck = await UserCheck.create({
      phone_email: phone_email,
      verification_code: verificationCode,
    });


    setTimeout(async () => {
      await newUserCheck.destroy();
    }, MAIN_CONFIG.phone_number_verification_code_timeout * 1000);

    response.setResponseData({
      timeout: MAIN_CONFIG.phone_number_verification_code_timeout,
    });
    return res.status(200).json(response.build());
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
};

/**
 * For check that new user entered valid phone number or not by code
 * @param {req} req request
 * @param {req} res response
 * @param {next} next
 */
exports.verifyUserCode = async (req, res, next) => {
  const response = new ResponseBuilder();

  const isRequestInvalid = requestValidator(req, response);
  if (isRequestInvalid) {
    return res.status(422).json(isRequestInvalid);
  }

  const phone_number = req.body["phone_number"];
  const code = req.body["code"];

  try {
    const verifiedUser = await UserCheck.findAll({
      where: { phone: phone_number, verification_code: code },
    });

    if (verifiedUser.length === 0) {
      response.setResponseData({
        result: false,
      });
      response.setUserMessage("کد وارد شده صحیح نمی باشد", "error");
      return res.status(422).json(response.build());
    }

    response.setResponseData({
      result: true,
      invite_code_description:
        "با وارد کردن کد معرف از مزایای هدیه ثبت نام ۱۰۰ هزار تومانی و شرکت در جوایز ماهانه و سالانه برخوردار شوید!",
    });
    return res.status(200).json(response.build());
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
};

/**
 * for handling user login
 * @param {req} req
 * @param {req} res
 * @param {next} next
 */
exports.login = async (req, res, next) => {
  const response = new ResponseBuilder();

  const phone_email =convertPersianNumberToEnglish( req.body["phone_email"]).trim();
  const verifyCode= convertPersianNumberToEnglish(req.body["code"]).trim();

  const client_secret = req.headers["client_secret"];
  if (client_secret !== MAIN_CONFIG.__APP_CLIENT_SECRET) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const isRequestInvalid = requestValidator(req, response);

  if (isRequestInvalid) {
    res.status(422).json(isRequestInvalid);
  } else {
    // in case that required field exist
    try {

      let user =null
      const isPhoneOrEmail = checkIsEmailOrPhone(phone_email);

      if(isPhoneOrEmail===1){
        /* send verification code for email */
        user = await User.findAll({
          where: { email: phone_email},
        });
      }else if(isPhoneOrEmail===2){
        //send verification code for SMS
        user = await User.findAll({
          where: { phone: phone_email },
        });
      }else{
        response.addDevMsg('input field is not Email or Phone number');
        response.setUserMessage(
          "لطفا شماره همراه یا ایمیل خود را وارد کنید",
          "warning",
          true
        );
        res.status(400).json(response.build());
      }
      
      user = user[0];
      // check if this user with this info exist
      if (user) {
        const verifiedUser = await UserCheck.findAll({
          where: { phone_email: phone_email, verification_code: verifyCode },
        });
    
        if (verifiedUser.length === 0) {
          response.setResponseData({
            result: false,
          });
          response.setUserMessage("کد وارد شده صحیح نمی باشد", "error");
          return res.status(422).json(response.build());
        }
          /* check user device_uuid */
          let finalDeviceUUID = req.userDevice.device_uuid;

          const userDevices = await UserDevice.findAll({
            where: { userId: user.id, logged_in: true },
          });
          if (userDevices.length + 1 > MAIN_CONFIG.user_device_limit) {
            response.addDevMsg("User devices pass the device limit");
            response.setUserMessage(
              "دستگاه های فعال روی این حساب بیش از حد مجاز است",
              "error",
              true
            );
            return res.status(403).json(response.build());
          }

          const thisUserDevice = await UserDevice.findOne({
            where: { device_uuid: req.userDevice.device_uuid },
          });
          thisUserDevice.userId = user.id;
          thisUserDevice.logged_in = true;
          await thisUserDevice.save();

          // creating a access_token and refresh_token payloads
          const accessTokenPayload = {
            userId: user.id,
            phone: user.phone ?user.phone:user.email,
            device_uuid: finalDeviceUUID,
            config: {
              securityTime: user.security_update_time,
              isRefreshToken: false,
            },
          };

          const refreshTokenPayload = {
            userId: user.id,
            phone: user.phone ?user.phone:user.email,
            device_uuid: finalDeviceUUID,
            config: {
              securityTime: user.security_update_time,
              isRefreshToken: true,
            },
          };

          // generating access_token and refresh_token
          const access_token = jwt.sign(
            accessTokenPayload,
            process.env.TOKEN_SECRET,
            {
              expiresIn: MAIN_CONFIG.access_token_expires_in,
            }
          );

          const refresh_token = jwt.sign(
            refreshTokenPayload,
            process.env.REFRESH_SECRET,
            {
              expiresIn: MAIN_CONFIG.refresh_token_expires_in,
            }
          );

          const responseData = {
            type: "Bearer",
            expires_in: expireTimeCalculator(),
            access_token: access_token,
            refresh_token: refresh_token,
          };

          let userGeneratedTokens = user.generated_tokens_count;
          user.generated_tokens_count = userGeneratedTokens + 1;
          await user.save();

          response.setResponseData(responseData);
          response.setUserMessage("خوش آمدید", "success");
          res.status(200).json(response.build());
        
      } else {
        response.setUserMessage("کاربری با این شماره تلفن وجود ندارد", "error");
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

exports.profile = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}
	const user = req.userInfo;
	if (!user){
		response.addDevMsg("User not found");
		response.setUserMessage(
		  "کاربر وجود ندارد",
		  "error",
		  true
		);
		return res.status(404).json(response.build());
	}
  let userLevels=[];

  const courses = await Course.findAll({where : {has_exam:true}})

  courses.filter
  console.log(courses)
	const responseData = {
		name:user.name,
    personal_type:user.personal_type,
    image:user.profile_image,
    levels:userLevels
	  };
	response.setResponseData(responseData);

	response.addDevMsg("User devices pass the device limit");
            response.setUserMessage(
              "کد تخفیف مورد نظر اعمال شد",
              "success",
              true
            );
	return res.status(200).json(response.build());
};

/**
 * for handling user sign-up
 * @param {req} req
 * @param {res} res
 * @param {next} next
 */
exports.register = async (req, res, next) => {
  const response = new ResponseBuilder();

  const client_secret = req.headers["client_secret"];
  if (client_secret !== MAIN_CONFIG.__APP_CLIENT_SECRET) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const isRequestInvalid = requestValidator(req, response);

  if (isRequestInvalid) {
    res.status(422).json(isRequestInvalid);
  } else {
    const phone_email =convertPersianNumberToEnglish( req.body["phone_email"]).trim();
    const verifyCode= convertPersianNumberToEnglish(req.body["code"]).trim();
    try {

      const usersCount = await User.findAndCountAll();

      const isPhoneOrEmail = checkIsEmailOrPhone(phone_email);

      let users=null;
      if(isPhoneOrEmail===1){
        /* find with email */
        users = await User.findAll({where:{
          email:phone_email
        }})
      }else if(isPhoneOrEmail===2){
        //find with phone number
        users = await User.findAll({where:{
          phone:phone_email
        }})
      }else{
        response.addDevMsg('input field is not Email or Phone number');
        response.setUserMessage(
          "لطفا شماره همراه یا ایمیل خود را وارد کنید",
          "warning",
          true
        );
        res.status(400).json(response.build());
      }
      
      if (users.length !==0) {
        response.setResponseData({
          result: false,
          error:"number is taken"
        });
        response.setUserMessage("این شماره قبلا ثبت نام کرده است", "error");
        return res.status(400).json(response.build());
      }
      const verifiedUser = await UserCheck.findAll({
        where: { phone_email: phone_email, verification_code: verifyCode },
      });
  
      if (verifiedUser.length === 0) {
        response.setResponseData({
          result: false,
        });
        response.setUserMessage("کد وارد شده صحیح نمی باشد", "error");
        return res.status(422).json(response.build());
      }
      // creating new user
      let newUser=null;

      if(isPhoneOrEmail===1){
        /* create new user with email */
        newUser = await User.create({
          email: phone_email,
          isCostumer: false,
          security_update_time: new Date().toString(),
          generated_tokens_count: 1,
          email_verified: true,
          monthly_rank: usersCount.count + 1,
          yearly_rank: usersCount.count + 1,
        });
      }else if(isPhoneOrEmail===2){
        //create new user with phone number
        newUser = await User.create({
          phone: phone_email,
          isCostumer: false,
          security_update_time: new Date().toString(),
          generated_tokens_count: 1,
          phone_verified: true,
          monthly_rank: usersCount.count + 1,
          yearly_rank: usersCount.count + 1,
        });
      }else{
        response.addDevMsg('input field is not Email or Phone number');
        response.setUserMessage(
          "لطفا شماره همراه یا ایمیل خود را وارد کنید",
          "warning",
          true
        );
        res.status(400).json(response.build());
      }
      
        
       console.log(newUser)

      /* for generating unique invite code for this user */
      // createAndSetInviteCode(newUser);

      /* by tracking information, user device stored in latest middle-wares */
      const userDevice = await UserDevice.findOne({
        where: { device_uuid: req.userDevice.device_uuid },
      });
      userDevice.logged_in = true;
      userDevice.userId = newUser.id;
      await userDevice.save();
      const finalDeviceUUID = userDevice.device_uuid;

      const accessTokenPayload = {
        userId: newUser.id,
        phone: newUser.phone,
        device_uuid: finalDeviceUUID,
        config: {
          securityTime: newUser.security_update_time,
          isRefreshToken: false,
        },
      };

      const refreshTokenPayload = {
        userId: newUser.id,
        phone: newUser.phone,
        device_uuid: finalDeviceUUID,
        config: {
          securityTime: newUser.security_update_time,
          isRefreshToken: true,
        },
      };

      // generating access_token and refresh_token
      const access_token = jwt.sign(
        accessTokenPayload,
        process.env.TOKEN_SECRET,
        {
          expiresIn: MAIN_CONFIG.access_token_expires_in,
        }
      );

      const refresh_token = jwt.sign(
        refreshTokenPayload,
        process.env.REFRESH_SECRET,
        {
          expiresIn: MAIN_CONFIG.refresh_token_expires_in,
        }
      );

      const responseData = {
        type: "Bearer",
        expires_in: expireTimeCalculator(),
        access_token: access_token,
        refresh_token: refresh_token,
      };

      response.setUserMessage("خوش آمدید", "success");
      response.setResponseData(responseData); // Data should check!!
      res.status(200).json(response.build());
    } catch (err) {
      console.log(err);
      response.addDevMsg(err.toString());
      response.setUserMessage(
        "مشکلی در ارتباط با سرور به وجود آمده است",
        "warning",
        true
      );
      res.status(500).json(response.build());
    }
  }
};

/**
 * for refreshing token when access token expired
 * @param {req} req
 * @param {res} res
 * @param {next} next
 */
exports.refreshToken = async (req, res, next) => {
  const response = new ResponseBuilder();

  const client_secret = req.headers["client_secret"];
  if (client_secret !== MAIN_CONFIG.__APP_CLIENT_SECRET) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const isRequestInvalid = requestValidator(req, response);

  if (isRequestInvalid) {
    res.status(422).json(isRequestInvalid);
  } else {
    const { access_token, refresh_token } = req.body;

    try {
      const accessPayload = jwt.verify(access_token, process.env.TOKEN_SECRET, {
        ignoreExpiration: true,
      });
      const refreshPayload = jwt.verify(
        refresh_token,
        process.env.REFRESH_SECRET
      );
      /* const accessTokenPayload = {
				userId: newUser.id,
				phone: newUser.phone,
				client_id: newUser.client_id,
				device_uuid: finalDeviceUUID,
				config: {
					securityTime: newUser.security_update_time,
					isRefreshToken: false,
				},
			}; */
      if (refreshPayload) {
        if (
          refreshPayload.userId === accessPayload.userId &&
          refreshPayload.phone === accessPayload.phone &&
          refreshPayload.device_uuid === accessPayload.device_uuid &&
          refreshPayload.config.isRefreshToken
        ) {
          // when all conditions corrects and refresh_token really verified, do the magic =>
          const users = await User.findAll({
            where: {
              id: refreshPayload.userId,
              phone: refreshPayload.phone,
            },
          });
          if (
            users.length === 1 &&
            users[0].security_update_time === refreshPayload.config.securityTime
          ) {
            const accessTokenPayload = {
              userId: users[0].id,
              phone: users[0].phone,
              device_uuid: accessPayload.device_uuid,
              config: {
                securityTime: users[0].security_update_time,
                isRefreshToken: false,
              },
            };
            const refreshTokenPayload = {
              userId: users[0].id,
              phone: users[0].phone,
              device_uuid: accessPayload.device_uuid,
              config: {
                securityTime: users[0].security_update_time,
                isRefreshToken: true,
              },
            };
            const new_access_token = jwt.sign(
              accessTokenPayload,
              process.env.TOKEN_SECRET,
              {
                expiresIn: MAIN_CONFIG.access_token_expires_in,
              }
            );
            const new_refresh_token = jwt.sign(
              refreshTokenPayload,
              process.env.REFRESH_SECRET,
              {
                expiresIn: MAIN_CONFIG.refresh_token_expires_in,
              }
            );
            const responseData = {
              type: "Bearer",
              expires_in: expireTimeCalculator(),
              access_token: new_access_token,
              refresh_token: new_refresh_token,
            };
            response.setResponseData(responseData);
            response.setUserMessage("خوش آمدید", "success");
            res.status(200).json(response.build());
          } else {
            response.setUserMessage("لطفا مجددا وارد شوید", "error", true);
            res.status(403).json(response.build());
          }
        }
      } else {
        response.addDevMsg("refresh token is not valid");
        response.setUserMessage(
          "مشکلی در احراز هویت به وجود آمده است",
          "error",
          true
        );
        res.status(403).json(response.build());
      }
    } catch (err) {
      console.log(err);
      response.addDevMsg(err.toString());
      response.setUserMessage(
        "مشکلی در احراز هویت به وجود آمده است",
        "error",
        true
      );
      res.status(403).json(response.build());
    }
  }
};

/**
* For sending user a verification code to verify user and allow him/her to change password
* @param {req} req request
* @param {res} res response
* @param {next} next
*/
exports.startUserForgotPassword = async (req, res, next) => {
  const response = new ResponseBuilder();

  const isRequestInvalid = requestValidator(req, response);

  if (isRequestInvalid) {
    return res.status(422).json(isRequestInvalid);
  }

  const phone_number = req.body["phone_number"];

  try {
    const users = await User.findAll({ where: { phone: phone_number } });
    if (users.length === 0) {
      response.setResponseData({ registered: false });
      response.setUserMessage("کاربری با این شماره تلفن ثبت نشده است", "error");
      return res.status(200).json(response.build());
    }

    const verificationCode = generatePhoneNumberCode();

    const newUserCheck = await UserCheck.create({
      phone: phone_number,
      verification_code: verificationCode,
    });

    addSMSForVerification(phone_number, verificationCode);

    const responseData = {
      registered: true,
      timeout: MAIN_CONFIG.phone_number_verification_code_timeout,
    };

    setTimeout(async () => {
      await newUserCheck.destroy();
    }, MAIN_CONFIG.phone_number_verification_code_timeout * 1000);

    response.setResponseData(responseData);
    return res.status(200).json(response.build());
  } catch (err) {
    console.log(err);
    response.addDevMsg(err.toString());
    response.setUserMessage(
      "مشکلی در در ارتباط با سرور به وجود آمده است",
      "error",
      true
    );
    res.status(500).json(response.build());
  }
};

/**
 * For change user password in forgot password
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.changeUserPasswordInForgotPassword = async (req, res, next) => {
  const response = new ResponseBuilder();

  const isRequestInvalid = requestValidator(req, response);

  if (isRequestInvalid) {
    return res.status(422).json(isRequestInvalid);
  }

  const phone_number = req.body["phone_number"];
  const new_password = req.body["new_password"];
  const logout_all = req.body["logout_all"] || false;

  try {
    const users = await User.findAll({ where: { phone: phone_number } });
    if (users.length === 0) {
      response.setUserMessage("کاربری با این شماره تلفن ثبت نشده است", "error");
      return res.status(422).json(response.build());
    }
    const user = users[0];
    const hashPassword = bcrypt.hashSync(
      convertPersianNumberToEnglish(new_password),
      10
    );

    user.password = hashPassword;
    if (logout_all) {
      user.security_update_time = new Date().toString();
    }
    await user.save();

    response.setUserMessage("رمز عبور با موفقیت تغییر یافت", "success");
    return res.status(200).json(response.build());
  } catch (err) {
    console.log(err);
    response.addDevMsg(err.toString());
    response.setUserMessage(
      "مشکلی در در ارتباط با سرور به وجود آمده است",
      "error",
      true
    );
    res.status(500).json(response.build());
  }
};
