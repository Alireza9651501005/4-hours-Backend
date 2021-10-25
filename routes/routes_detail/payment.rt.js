const express = require("express");
const { query, param, body } = require("express-validator");

/* controllers */
const paymentController = require("../../controllers/payment.ct");

const route = express.Router();

/**
 * prefix: /api/v1/payment
 */
route.post(
	"/order",
	body("user_token").notEmpty().withMessage("token not send"),
	paymentController.make_order
);


route.post(
	"/activationcode",
	body("activation_code")
		.notEmpty()
		.withMessage("activatin code not send")
		.bail(),
	paymentController.activationCodeChecker
);
route.post(
	"/discount",
	body("code")
		.notEmpty()
		.withMessage("discount code not send")
		.bail(),
	paymentController.discountCodeChecker
);

route.post(
	"/course/info",
	body("user_token").notEmpty().withMessage("token not send"),
	body("course_id")
		.notEmpty()
		.withMessage("course id not send")
		.bail()
		.isNumeric()
		.withMessage("course id is not number"),
	body("order_id")
		.notEmpty()
		.withMessage("order id not send")
		.bail()
		.isNumeric()
		.withMessage("order id is not number"),
	paymentController.secondOrderStep_get_course_info
);

route.post(
	"/course/cancel",
	body("user_token").notEmpty().withMessage("token not send"),
	body("order_id")
		.notEmpty()
		.withMessage("order id not send")
		.bail()
		.isNumeric()
		.withMessage("order id is not number"),
	paymentController.onCancelCoursePayment
);

route.post(
	"/course/link",
	body("user_token").notEmpty().withMessage("token not send"),
	body("order_id")
		.notEmpty()
		.withMessage("order id not send")
		.bail()
		.isNumeric()
		.withMessage("order id is not number"),
	paymentController.thirdOrderStep_before_go_bank
);

route.post(
	"/course/library",
	// body("user_token").notEmpty().withMessage("token not send"),
	body("order_key").notEmpty().withMessage("order id not send"),
	paymentController.fourthOrderStep_after_bank
);

module.exports = route;
