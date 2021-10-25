const express = require("express");
const { body } = require("express-validator");

const messageController = require("../../../controllers/Admin/message.ct");


const router = express.Router();

router.get("/", messageController.getAllMessages);

router.get("/:messageId", messageController.getOneMessage);

router.post(
	"/",
	body("title")
		.notEmpty()
		.withMessage("لطفا عنوان را وارد کنید")
		.bail(),
    body("description")
		.notEmpty()
		.withMessage("لطفا متن پیام را وارد کنید")
		.bail(),
	messageController.createMessage
);
router.put(
	"/:messageId",
    body("title")
    .notEmpty()
    .withMessage("لطفا عنوان را وارد کنید")
    .bail(),
    body("description")
    .notEmpty()
    .withMessage("لطفا متن پیام را وارد کنید")
    .bail(),
    messageController.updateOneMessage
);

router.delete("/:messageId",
	messageController.deleteOneMessage
);

module.exports = router;
