const express = require("express");
const { body, header } = require("express-validator");

const { checkIsEmailOrPhone } = require("../../utils/helperFunction");

// Importing required models

const route = express.Router();

/* controllers */
const authController = require("../../controllers/auth.ct");
const User = require("../../models/User.model");

/**
 * prefix: '/api/v1/user'
 * version 1
 */

route.post(
	"/check",
	body("phone_email")
		.notEmpty()
		.withMessage("لطفا شماره همراه یا ایمیل خود را وارد کنید")
		.bail()
		.custom((value) => {
			const isPhoneOrEmail = checkIsEmailOrPhone(value);
			if (isPhoneOrEmail === 0) {
				throw "";
			} else {
				return true;
			}
		})
		.withMessage("مقدار ورودی ایمیل یا شماره همراه نمی باشد"),
		body("from")
		.notEmpty()
		.withMessage("لطفا فیلد from را پر کنید")
		.bail(),
	authController.checkUserPhoneNumberOrEmail
);

route.post(
	"/verify",
	body("phone_number")
		.notEmpty()
		.withMessage("شماره تلفن خود را وارد کنید")
		.bail()
		.matches(/^0[0-9]{10}$/)
		.withMessage("شماره تلفن وارد شده صحیح نیست"),
	body("code").notEmpty().withMessage("کد ارسالی را وارد کنید").bail(),
	authController.verifyUserCode
);


route.post(
	"/login",
	header("os")
		.notEmpty()
		.withMessage("header os field should not be empty")
		.bail()
		.custom((value) => {
			if (+value === 1 || +value === 2 || +value === 3) {
				return true;
			} else {
				throw "";
			}
		})
		.withMessage("os is not correct"),
	header("os_version")
		.notEmpty()
		.withMessage("header os_version field should not be empty"),
	header("device_brand")
		.notEmpty()
		.withMessage("header device_brand field should not be empty"),
	header("device_uuid")
		.notEmpty()
		.withMessage("header device_uuid field should not be empty"),
	/* -------------------------------------------------------------------------- */
	body("code").notEmpty().withMessage("کد ارسالی را وارد کنید"),
	body("phone_email")
		.notEmpty()
		.withMessage("لطفا شماره همراه یا ایمیل خود را وارد کنید")
		.bail()
		.custom((value) => {
			const isPhoneOrEmail = checkIsEmailOrPhone(value);
			if (isPhoneOrEmail === 0) {
				throw "";
			} else {
				return true;
			}
		})
		.withMessage("مقدار ورودی ایمیل یا شماره همراه نمی باشد"),
	authController.login
);

route.post(
	"/register",
	header("os")
		.notEmpty()
		.withMessage("header os field should not be empty")
		.bail()
		.custom((value) => {
			if (+value === 1 || +value === 2 || +value === 3 || +value === 4) {
				return true;
			} else {
				throw "";
			}
		})
		.withMessage("os is not correct"),
	header("os_version")
		.notEmpty()
		.withMessage("header os_version field should not be empty"),
	header("device_brand")
		.notEmpty()
		.withMessage("header device_brand field should not be empty"),
	header("device_uuid").custom((value, { req }) => {
		if (+req.headers["os"] !== 4 && !value) {
			throw new Error("header device_uuid field should not be empty");
		}
		return true;
	}),
	// .notEmpty()
	// .withMessage("header device_uuid field should not be empty"),
	/* -------------------------------------------------------------------------- */

	body("phone_email")
	.notEmpty()
	.withMessage("لطفا شماره همراه یا ایمیل خود را وارد کنید")
	.bail()
	.custom((value) => {
		const isPhoneOrEmail = checkIsEmailOrPhone(value);
		if (isPhoneOrEmail === 0) {
			throw "";
		} else {
			return true;
		}
	})
	.withMessage("مقدار ورودی ایمیل یا شماره همراه نمی باشد"),
	body("code")
		.notEmpty()
		.withMessage("لطفا کد ارسالی را وارد کنید")
		.bail(),
	authController.register
);

route.post(
	"/refresh-token",
	body("access_token").notEmpty().withMessage("please enter access token"),
	body("refresh_token").notEmpty().withMessage("please enter refresh token"),
	authController.refreshToken
);

route.post(
	"/forgot-password",
	body("phone_number")
		.notEmpty()
		.withMessage("شماره تلفن خود را وارد کنید")
		.bail()
		.matches(/^0[0-9]{10}$/)
		.withMessage("شماره تلفن وارد شده صحیح نیست"),
	authController.startUserForgotPassword
);

route.put(
	"/forgot-password",
	body("phone_number")
		.notEmpty()
		.withMessage("شماره تلفن خود را وارد کنید")
		.bail()
		.matches(/^0[0-9]{10}$/)
		.withMessage("شماره تلفن وارد شده صحیح نیست"),
	body("new_password")
		.notEmpty()
		.withMessage("لطفا رمز عبور خود را وارد کنید")
		.bail()
		.isLength({ min: 8 })
		.withMessage("رمز عبور وارد شده باید بیش از 8 حرف باشد")
		.bail()
		.matches(
			/^.{0,}[a-zA-Z]{1,}.{0,}[0-9]{1,}.{0,}$|^.{0,}[0-9]{1,}.{0,}[a-zA-Z]{1,}.{0,}$/
		)
		.withMessage("رمز عبور باید شامل حروف لاتین و عدد باشد"),
	body("logout_all")
		.custom((value) => {
			if (value !== undefined) {
				if (typeof value === "boolean") {
					return true;
				} else {
					throw "";
				}
			} else {
				return true;
			}
		})
		.withMessage(
			"'logout_all' should be 'true' or 'false'. If did not send, default is 'true'"
		),
	authController.changeUserPasswordInForgotPassword
);

module.exports = route;
