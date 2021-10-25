const express = require("express");
const { body } = require("express-validator");

const walletController = require("../../../controllers/Admin/wallet.ct");

const router = express.Router();

router.get("/", walletController.getAllWallets);

router.get("/:walletId", walletController.getOneWallet);

router.post(
	"/",
	body("amount")
		.notEmpty()
		.withMessage("لطفا عنوان را وارد کنید")
		.bail(),
		// .isLength({ min: 3 })
		// .withMessage("عنوان شما بسیار کوتاه است"),
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
	walletController.createWallet
);
router.put(
	"/:walletId",
    body("amount")
        .notEmpty()
        .withMessage("لطفا عنوان را وارد کنید")
        .bail(),
        // .isLength({ min: 3 })
        // .withMessage("عنوان شما بسیار کوتاه است"),
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
	walletController.updateOneWallet,
);

router.delete("/:walletId",
	walletController.deleteOneWallet
);

module.exports = router;
