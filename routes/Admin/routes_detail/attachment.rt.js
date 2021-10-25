const express = require("express");
const { body } = require("express-validator");

const attachmentController = require("../../../controllers/Admin/attachment.ct");

const router = express.Router();

router.get("/", attachmentController.getAllAttachments);

router.get("/:attachmentId", attachmentController.getOneAttachment);

router.post(
	"/",
	body("title")
		.notEmpty()
		.withMessage("لطفا عنوان را وارد کنید")
		.bail(),
        body("type")
		.notEmpty()
		.withMessage("لطفا نوع فایل را وارد کنید")
		.bail(),
        body("filename")
		.notEmpty()
		.withMessage("لطفا فایل را انتخاب کنید")
		.bail(),
        attachmentController.createAttachment
);

router.put(
	"/:attachmentId",
    body("title")
    .notEmpty()
    .withMessage("لطفا عنوان را وارد کنید")
    .bail(),
    body("type")
    .notEmpty()
    .withMessage("لطفا نوع فایل را وارد کنید")
    .bail(),
    body("filename")
    .notEmpty()
    .withMessage("لطفا فایل را انتخاب کنید")
    .bail(),
        attachmentController.updateOneAttachment 
);

router.delete("/:attachmentId",
  attachmentController.deleteOneAttachment
);

module.exports = router;
