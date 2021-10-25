const express = require("express");
const { body } = require("express-validator");

const courseController = require("../../../controllers/Admin/course.ct");

const router = express.Router();

router.get("/", courseController.getAllCourses);

router.get("/:courseId", courseController.getOneCourse);

router.post(
	"/",
	body("title")
		.notEmpty()
		.withMessage("لطفا عنوان را وارد کنید")
		.bail()
		.isLength({ min: 3 })
		.withMessage("عنوان شما بسیار کوتاه است"),
	body("level")
		.notEmpty()
		.withMessage("لطفا سطح دوره را انتخاب کنید")
		.bail(),

	body("image_background_color")
		.notEmpty()
		.withMessage("لطفا پس زمینه را انتخاب کنید")
		.bail(),
	body("price_title")
		.notEmpty()
		.withMessage("لطفاهزینه دوره را وارد کنید")
		.bail(),
	body("price")
		.notEmpty()
		.withMessage("لطفا قیمت را وارد کنید")
		.bail(),
	body("description")
		.notEmpty()
		.withMessage("لطفا توضیحات را وارد کنید")
		.bail(),
	body("short_description")
		.notEmpty()
		.withMessage("لطفا توضیحات کوتاه را وارد کنید")
		.bail(),
	body("total_hours")
		.notEmpty()
		.withMessage("لطفا مدت زمان دوره را وارد کنید")
		.bail(),
	body("has_exam")
		.notEmpty()
		.withMessage("لطفا وضعیت آزمون را تعیین  کنید")
		.bail(),

	courseController.createCourse
);
router.put(
	"/:courseId",
	body("title")
		.notEmpty()
		.withMessage("لطفا عنوان را وارد کنید")
		.bail()
		.isLength({ min: 3 })
		.withMessage("عنوان شما بسیار کوتاه است"),
	body("level")
		.notEmpty()
		.withMessage("لطفا سطح دوره را انتخاب کنید")
		.bail(),

	body("image_background_color")
		.notEmpty()
		.withMessage("لطفا پس زمینه را انتخاب کنید")
		.bail(),
	body("price_title")
		.notEmpty()
		.withMessage("لطفاهزینه دوره را وارد کنید")
		.bail(),
	body("price")
		.notEmpty()
		.withMessage("لطفا قیمت را وارد کنید")
		.bail(),
	body("description")
		.notEmpty()
		.withMessage("لطفا توضیحات را وارد کنید")
		.bail(),
	body("short_description")
		.notEmpty()
		.withMessage("لطفا توضیحات کوتاه را وارد کنید")
		.bail(),
	body("total_hours")
		.notEmpty()
		.withMessage("لطفا مدت زمان دوره را وارد کنید")
		.bail(),
	body("has_exam")
		.notEmpty()
		.withMessage("لطفا وضعیت آزمون را تعیین  کنید")
		.bail(),
	body("exam_try_count")
		.notEmpty()
		.withMessage("لطفا وضعیت آزمون را تعیین  کنید")
		.bail(),
	body("exam_score")
		.notEmpty()
		.withMessage("لطفا امتیاز آزمون را وارد  کنید")
		.bail(),
	courseController.updateOneCourse
);

router.delete("/:courseId", 
	courseController.deleteOneCourse
);

module.exports = router;
