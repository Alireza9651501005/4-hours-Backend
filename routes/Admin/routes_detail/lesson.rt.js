const express = require("express");
const { body } = require("express-validator");

const lessonController = require("../../../controllers/Admin/lesson.ct");

const router = express.Router();

router.get("/", lessonController.getAllLessons);

router.get("/:lessonId", lessonController.getOneLesson);

router.post(
	"/",
	body("title")
		.notEmpty()
		.withMessage("لطفا عنوان را وارد کنید")
		.bail()
		.isLength({ min: 3 })
		.withMessage("عنوان شما بسیار کوتاه است"),
	body("video_id")
		.notEmpty()
		.withMessage("لطفا ویدیو را وارد کنید")
		.bail(),
	body("video_time")
		.notEmpty()
		.withMessage("لطفا زمان ویدیو را وارد کنید")
		.bail(),
	body("lesson_video_score")
		.notEmpty()
		.withMessage("لطفا امتیاز ویدیو  را وارد کنید")
		.bail(),
	body("button_title_video")
		.notEmpty()
		.withMessage("لطفا عنوان دکمه ی ویدیو را وارد کنید")
		.bail(),
	body("interactive_link")
		.notEmpty()
		.withMessage("لطفا لینک تعاملی را وارد کنید")
		.bail(),
	body("lesson_interactive_score")
		.notEmpty()
		.withMessage("لطفاامتیاز تعاملی درس را وارد  کنید")
		.bail(),
    body("button_title_interactive")
		.notEmpty()
		.withMessage("لطفاعنوان دکمه ی تعامل را وارد  کنید")
		.bail(),
    body("window_title_interactive")
		.notEmpty()
		.withMessage("لطفاعنوان تعامل را وارد کنید")
		.bail(),
    body("likes")
		.notEmpty()
		.withMessage("لطفاتعداد لایک را وارد کنید")
		.bail(),
    body("total_hours")
		.notEmpty()
		.withMessage("لطفا زمان درس را وارد کنید")
		.bail(),
	lessonController.createLesson
);

router.put(
	"/:lessonId",
	body("title")
		.notEmpty()
		.withMessage("لطفا عنوان را وارد کنید")
		.bail()
		.isLength({ min: 3 })
		.withMessage("عنوان شما بسیار کوتاه است"),
	body("video_id")
		.notEmpty()
		.withMessage("لطفا ویدیو را وارد کنید")
		.bail(),
	body("video_time")
		.notEmpty()
		.withMessage("لطفا زمان ویدیو را وارد کنید")
		.bail(),
	body("lesson_video_score")
		.notEmpty()
		.withMessage("لطفا امتیاز ویدیو  را وارد کنید")
		.bail(),
	body("button_title_video")
		.notEmpty()
		.withMessage("لطفا عنوان دکمه ی ویدیو را وارد کنید")
		.bail(),
	body("interactive_link")
		.notEmpty()
		.withMessage("لطفا لینک تعاملی را وارد کنید")
		.bail(),
	body("lesson_interactive_score")
		.notEmpty()
		.withMessage("لطفاامتیاز تعاملی درس را وارد  کنید")
		.bail(),
    body("button_title_interactive")
		.notEmpty()
		.withMessage("لطفاعنوان دکمه ی تعامل را وارد  کنید")
		.bail(),
    body("window_title_interactive")
		.notEmpty()
		.withMessage("لطفاعنوان تعامل را وارد کنید")
		.bail(),
    body("likes")
		.notEmpty()
		.withMessage("لطفاتعداد لایک را وارد کنید")
		.bail(),
    body("total_hours")
		.notEmpty()
		.withMessage("لطفا زمان درس را وارد کنید")
		.bail(),
	lessonController.updateOneLesson
);

router.delete("/:lessonId",
	lessonController.deleteOneLesson
);

module.exports = router;
