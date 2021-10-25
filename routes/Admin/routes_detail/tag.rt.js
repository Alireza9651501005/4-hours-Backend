const express = require("express");
const { body } = require("express-validator");

const tagController = require("../../../controllers/Admin/tag.ct");

const router = express.Router();

router.get("/", tagController.getAllTags);

router.get("/:tagId", tagController.getOneTag);

router.post(
	"/",
	body("name")
		.notEmpty()
		.withMessage("لطفا نام تگ را وارد کنید")
		.bail(),
        tagController.createTag
);

router.put(
	"/:tagId",
	body("name")
		.notEmpty()
		.withMessage("لطفا نام تگ را وارد کنید")
		.bail(),
        tagController.updateOneTag 
);

router.delete("/:tagId",
  tagController.deleteOneTag
);

module.exports = router;
