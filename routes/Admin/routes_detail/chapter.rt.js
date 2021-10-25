const express = require("express");
const { body } = require("express-validator");

const chapterController = require("../../../controllers/Admin/chapter.ct");

const router = express.Router();

router.get("/", chapterController.getAllChapters);

router.get("/:chapterId", chapterController.getOneChapter);

router.post(
	"/",
	body("title")
		.notEmpty()
		.withMessage("لطفا عنوان را وارد کنید")
		.bail()
		.isLength({ min: 3 })
		.withMessage("عنوان شما بسیار کوتاه است"),
    body("courseId")
		.notEmpty()
		.withMessage("لطفا دوره را وارد کنید")
		.bail(),

	chapterController.createChapter
);
router.put(
	"/:chapterId",
	body("title")
		.notEmpty()
		.withMessage("لطفا عنوان را وارد کنید")
		.bail()
		.isLength({ min: 3 })
		.withMessage("عنوان شما بسیار کوتاه است"),
    body("courseId")
		.notEmpty()
		.withMessage("لطفا دوره را وارد کنید")
		.bail(),

	chapterController.updateOneChapter,
);

router.delete("/:chapterId",
	chapterController.deleteOneChapter
);

module.exports = router;
