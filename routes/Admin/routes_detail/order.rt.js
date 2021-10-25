const express = require("express");
const { body } = require("express-validator");

const orderController = require("../../../controllers/Admin/order.ct");

const router = express.Router();

router.get("/", orderController.getAllOrders);

router.get("/:orderId", orderController.getOneOrder);

router.post(
	"/",
	body("total_amount")
		.notEmpty()
		.withMessage("لطفا مقدار کل را وارد کنید")
		.bail(),
    body("cash_amount")
		.notEmpty()
		.withMessage("لطفا مقدار وجه را وارد کنید")
		.bail(),
    body("wallet_amount")
		.notEmpty()
		.withMessage("لطفا مقدار کیف پول را وارد کنید")
        .bail(),
    body("stars_discount_amount")
		.notEmpty()
		.withMessage("لطفا مقدار ستاره تخفیف را وارد کنید")
        .bail(), 
    body("discount_amount")
		.notEmpty()
		.withMessage("لطفا مقدار تخفیف را وارد کنید")
        .bail(), 
    body("description")
		.notEmpty()
		.withMessage("لطفا توضیحات را وارد کنید")
        .bail(), 
    body("status")
		.notEmpty()
		.withMessage("لطفا وضعیت سفارش را وارد کنید")
        .bail(), 
    body("order_key")
		.notEmpty()
		.withMessage("لطفا کد سفارش را وارد کنید")
        .bail(),
        orderController.createOrder
);
router.put(
	"/:orderId",
    body("total_amount")
        .notEmpty()
        .withMessage("لطفا مقدار کل را وارد کنید")
        .bail(),
    body("cash_amount")
        .notEmpty()
        .withMessage("لطفا مقدار وجه را وارد کنید")
        .bail(),
    body("wallet_amount")
        .notEmpty()
        .withMessage("لطفا مقدار کیف پول را وارد کنید")
        .bail(),
    body("stars_discount_amount")
        .notEmpty()
        .withMessage("لطفا مقدار ستاره تخفیف را وارد کنید")
        .bail(), 
    body("discount_amount")
        .notEmpty()
        .withMessage("لطفا مقدار تخفیف را وارد کنید")
        .bail(), 
    body("description")
        .notEmpty()
        .withMessage("لطفا توضیحات را وارد کنید")
        .bail(), 
    body("status")
        .notEmpty()
        .withMessage("لطفا وضعیت سفارش را وارد کنید")
        .bail(), 
    body("order_key")
        .notEmpty()
        .withMessage("لطفا کد سفارش را وارد کنید")
        .bail(),
    orderController.updateOneOrder
);

router.delete("/:orderId",
	orderController.deleteOneOrder
);

module.exports = router;
