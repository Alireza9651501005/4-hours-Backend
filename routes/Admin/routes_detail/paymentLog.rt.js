const express = require("express");
const { body } = require("express-validator");

const paymentLogController = require("../../../controllers/Admin/payment.ct");

const router = express.Router();

router.get("/", paymentLogController.getAllPaymentLogs);

router.get("/:paymentLogId", paymentLogController.getOnePaymentLog);

router.post(
	"/",
	body("amount")
		.notEmpty()
		.withMessage("لطفا عنوان را وارد کنید")
		.bail()
		.isLength({ min: 3 })
		.withMessage("عنوان شما بسیار کوتاه است"),
    body("status")
		.notEmpty()
		.withMessage("لطفا دوره را وارد کنید")
		.bail(),
    body("action")
		.notEmpty()
		.withMessage("لطفا دوره را وارد کنید")
        .bail(),
    body("resource")
		.notEmpty()
		.withMessage("لطفا دوره را وارد کنید")
        .bail(), 
    body("trace_code")
		.notEmpty()
		.withMessage("لطفا دوره را وارد کنید")
		.bail(),   
	paymentLogController.createPaymentLog
);
router.put(
	"/:paymentLogId",
    body("amount")
        .notEmpty()
        .withMessage("لطفا عنوان را وارد کنید")
        .bail()
        .isLength({ min: 3 })
        .withMessage("عنوان شما بسیار کوتاه است"),
    body("status")
        .notEmpty()
        .withMessage("لطفا دوره را وارد کنید")
        .bail(),
    body("action")
        .notEmpty()
        .withMessage("لطفا دوره را وارد کنید")
        .bail(),
    body("resource")
        .notEmpty()
        .withMessage("لطفا دوره را وارد کنید")
        .bail(), 
    body("trace_code")
        .notEmpty()
        .withMessage("لطفا دوره را وارد کنید")
        .bail(),
	paymentLogController.updateOnePaymentLog,
);

router.delete("/:paymentLogId",
	paymentLogController.deleteOnePaymentLog
);

module.exports = router;
