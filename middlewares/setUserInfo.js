const jwt = require("jsonwebtoken");

const { checkIsEmailOrPhone } = require("../utils/helperFunction");

const { User } = require("../database/models");

/**
 * for routes to get user information when token exist
 * @param {req} req
 * @param {res} res
 * @param {next} next function for handling gate passing and error handling
 */
const isAuth = async (req, res, next) => {
	let accessToken = req.headers["authorization"];

	// const accessTokenPayload = {
	// 	userId: user.id,
	// 	phone: user.phone,
	// 	email: user.email,
	// 	config: {
	// 		securityTime: user.security_update_time,
	// 		isRefreshToken: false,
	// 	},
	// };
	if (accessToken) {
		// for Bearer structure
		accessToken = accessToken.split(" ")[1];
		try {
			const token_information = jwt.verify(
				accessToken,
				process.env.TOKEN_SECRET
			);
			if (
				token_information &&
				token_information.config.isRefreshToken === false
				) {

				let users =null
				const phone_email= token_information.email?token_information.email:token_information.phone
				const isPhoneOrEmail = checkIsEmailOrPhone(phone_email);
				if(isPhoneOrEmail===1){
					/* send verification code for email */
					
					users = await User.findAll({
					where: {
						id: token_information.userId,
						email: phone_email,
					},
					});
				}else if(isPhoneOrEmail===2){
					//send verification code for SMS
					users = await User.findAll({
					where: {
						id: token_information.userId,
						phone: phone_email,
					},
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
				if (users.length > 0) {
					if (
						users[0].security_update_time !==
						token_information.config.securityTime
					) {
						response.addDevMsg("access denied");
						response.setUserMessage("مجددا وارد شوید", "error", true);
						res.status(403).json(response.build());
					} else {
						// making access to user row available in requires
						req.userInfo = users[0];
						next();
					}
				} else {
					next();
				}
			} else {
				next();
			}
		} catch (err) {
			next();
		}
	} else {
		next();
	}
};

module.exports = isAuth;
