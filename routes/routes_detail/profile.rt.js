const express = require("express");
const { body, query, param } = require("express-validator");

// Importing required models

const route = express.Router();

/* controllers */
const profileController = require("../../controllers/profile.ct");
/**
 * prefix: '/api/v1/user/profile'
 * version 1
 */

route.get("", profileController.getUserProfile);

route.post(
	"/optional-info",
	body("name").notEmpty().withMessage("نام و نام خانوادگی نباید خالی باشد"),
	body("username").notEmpty().withMessage("نام کاربری نباید خالی باشد"),
	profileController.setUserOptionalInfo
);

route.get("/optional-info", profileController.getUserOptionalInfo);

route.get(
	"/my-courses",
	query("page")
		.notEmpty()
		.withMessage("page Query not send")
		.bail()
		.isNumeric()
		.withMessage("page Query should be number"),
	// query("filter")
	// 	.notEmpty()
	// 	.withMessage("filter Query not send")
	// 	.bail()
	// 	.isNumeric()
	// 	.withMessage("filter Query should be number"),
	profileController.getUserCourse
);

route.get(
	"/my-messages",
	query("page")
		.notEmpty()
		.withMessage("page Query not send")
		.bail()
		.isNumeric()
		.withMessage("page Query should be number"),
	profileController.getUserAdminMessages
);

route.get(
	"/my-messages/:messageId",
	param("messageId")
		.notEmpty()
		.withMessage("messageId not exist")
		.bail()
		.isNumeric()
		.withMessage("messageId should be number"),
	profileController.getUserAdminMessagesDescription
);

route.delete(
	"/my-messages/:messageId",
	param("messageId")
		.notEmpty()
		.withMessage("messageId not exist")
		.bail()
		.isNumeric()
		.withMessage("messageId should be number"),
	profileController.deleteUserAdminMessage
);

route.post(
	"/username",
	body("username")
		.notEmpty()
		.withMessage("لطفا نام کاربری جدید خود را وارد کنید")
		.bail()
		.matches(/^\S+$/g)
		.withMessage("در نام کاربری از فاصله استفاده نکنید")
		.bail()
		.isLength({ min: 3 })
		.withMessage("نام کاربری انتخابی بسیار کوتاه است")
		.bail()
		.custom((value) => {
			if (value.match(/^@/)) {
				throw "";
			}
			return true;
		})
		.withMessage("نام کاربری نباید با @ شروع شود"),
	profileController.changeUsername
);

route.post(
	"/change-password",
	body("password")
		.notEmpty()
		.withMessage("لطفا رمز عبور جدید خود را وارد کنید"),
	body("new_password")
		.notEmpty()
		.withMessage("لطفا رمز عبور خود را وارد کنید")
		.bail()
		.isLength({ min: 8 })
		.withMessage("رمز عبور جدید باید بیش از 8 حرف باشد")
		.bail()
		.matches(
			/^.{0,}[a-zA-Z]{1,}.{0,}[0-9]{1,}.{0,}$|^.{0,}[0-9]{1,}.{0,}[a-zA-Z]{1,}.{0,}$/
		)
		.withMessage("رمز عبور جدید باید شامل حروف لاتین و عدد باشد"),
	profileController.changePassword
);

route.post(
	"/phone-email",
	body("phone_email")
		.notEmpty()
		.withMessage("شماره تلفن  یا ایمیل خود را وارد کنید")
		.bail(),
	profileController.startChangePhoneNumberAndEmail
);

route.post(
	"/phone-email/verification-code",
	body("phone_email")
		.notEmpty()
		.withMessage("شماره تلفن خود را وارد کنید")
		.bail(),
	body("code").notEmpty().withMessage("کد ارسالی را وارد کنید"),
	profileController.endChangePhoneNumberAndEmail
);

route.post(
	"/library",
	body("course_id")
		.notEmpty()
		.withMessage("course_id did not send")
		.bail()
		.isNumeric()
		.withMessage("wrong course_id, data type"),
	profileController.addFreeCourseToUserLibrary
);

route.get(
	"/score-report",
	query("page")
		.notEmpty()
		.withMessage("page Query not send")
		.bail()
		.isNumeric()
		.withMessage("page Query should be number"),
	profileController.getUserScoresReport
);

route.get("/wallet-info", profileController.getUserWalletInfo);

route.get(
	"/payment-report",
	query("page")
		.notEmpty()
		.withMessage("page Query not send")
		.bail()
		.isNumeric()
		.withMessage("page Query should be number"),
	profileController.getUserPaymentLogs
);

route.get(
	"/yearly-rank",
	query("page")
		.notEmpty()
		.withMessage("page Query not send")
		.bail()
		.isNumeric()
		.withMessage("page Query should be number"),
	profileController.getYearlyLeaderboard
);

route.get(
	"/monthly-rank",
	query("page")
		.notEmpty()
		.withMessage("page Query not send")
		.bail()
		.isNumeric()
		.withMessage("page Query should be number"),
	profileController.getMonthlyLeaderboard
);

route.get("/network-report", profileController.getUserNetworkScores);

route.post("/logout", profileController.logoutUser);

route.delete("/image", profileController.deleteUserProfileImage);

module.exports = route;
