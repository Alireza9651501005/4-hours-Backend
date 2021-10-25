const express = require("express");
const { body } = require("express-validator");

const discountController = require("../../../controllers/Admin/discount.ct");

const router = express.Router();

router.get("/", discountController.getAllDiscounts);

router.get("/:discountId", discountController.getOneDiscount);

router.post(
	"/",
	body("code")
		.notEmpty()
		.withMessage("لطفا کد را وارد کنید")
		.bail(),
	body("amount")
		.notEmpty()
		.withMessage("لطفا مقدار را وارد کنید")
		.bail(),
	body("percent")
		.notEmpty()
		.withMessage("لطفا درصد را وارد کنید")
		.bail(),
        discountController.createDiscount
);

router.put(
	"/:discountId",
	body("code")
		.notEmpty()
		.withMessage("لطفا کد را وارد کنید")
		.bail(),
	body("amount")
		.notEmpty()
		.withMessage("لطفا مقدار را وارد کنید")
		.bail(),
	body("percent")
		.notEmpty()
		.withMessage("لطفا درصد را وارد کنید")
		.bail(),
        discountController.updateOneDiscount 
);

router.delete("/:discountId",
  discountController.deleteOneDiscount
);

module.exports = router;
