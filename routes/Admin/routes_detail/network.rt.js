const express = require("express");
const { body } = require("express-validator");

const networkController = require("../../../controllers/Admin/network.ct");

const router = express.Router();

router.get("/", networkController.getAllNetworks);

router.get("/:networkId", networkController.getOneNetwork);

router.post(
	"/",
	body("score")
		.notEmpty()
		.withMessage("لطفا امتیاز را وارد کنید")
		.bail(),
    // body("negative")
	// 	.notEmpty()
	// 	.withMessage("لطفا دوره را وارد کنید")
	// 	.bail(),
    body("guest_id")
		.notEmpty()
		.withMessage("لطفا آیدی مهمان را وارد کنید")
        .bail(),
    body("level")
		.notEmpty()
		.withMessage("لطفا سطح را وارد کنید")
        .bail(), 
        networkController.createNetwork
);
router.put(
	"/:networkId",
    body("score")
    .notEmpty()
    .withMessage("لطفا امتیاز را وارد کنید")
    .bail(),
body("negative")
    .notEmpty()
    .withMessage("لطفا دوره را وارد کنید")
    .bail(),
body("guest_id")
    .notEmpty()
    .withMessage("لطفا آیدی مهمان را وارد کنید")
    .bail(),
body("level")
    .notEmpty()
    .withMessage("لطفا سطح را وارد کنید")
    .bail(), 
    networkController.updateOneNetwork
);

router.delete("/:networkId",
	networkController.deleteOneNetwork
);

module.exports = router;
