const express = require("express");
const { body, param } = require("express-validator");

const route = express.Router();

/* controllers */
const courseController = require("../../controllers/courses.ct");
const setUserInfo = require("../../middlewares/setTrackingInfo");
const isAuth = require("../../middlewares/auth");

/**
 * prefix: '/api/v1/courses'
 * version 1
 */
route.get(
	"/:courseId",
	isAuth,
	param("courseId")
		.notEmpty()
		.withMessage("courseId didn't set")
		.bail()
		.isNumeric()
		.withMessage("courseId param is not correct"),
	courseController.getCourse
);

route.get(
	"/:courseId/chapters",
	param("courseId")
		.notEmpty()
		.withMessage("courseId didn't set")
		.bail()
		.isNumeric()
		.withMessage("courseId param is not correct"),
	courseController.getCourseChapters
);

route.get(
	"/:courseId/attachments",
	param("courseId")
		.notEmpty()
		.withMessage("courseId didn't set")
		.bail()
		.isNumeric()
		.withMessage("courseId param is not correct"),
	courseController.getCourseAttachments
);

route.get(
	"/:courseId/content-rows",
	param("courseId")
		.notEmpty()
		.withMessage("courseId didn't set")
		.bail()
		.isNumeric()
		.withMessage("courseId param is not correct"),
	courseController.getCourseContentRows
);

route.get(
	"/:courseId/status",
	param("courseId")
		.notEmpty()
		.withMessage("courseId didn't set")
		.bail()
		.isNumeric()
		.withMessage("courseId param is not correct"),
	courseController.getCourseStatus
);

route.post(
	"/:courseId/exam",
	setUserInfo,
	param("courseId")
		.notEmpty()
		.withMessage("courseId didn't set")
		.bail()
		.isNumeric()
		.withMessage("courseId param is not correct"),
	courseController.postCourseFinalExam
);

route.post(
	"/test-info",
	body("ci")
		.notEmpty()
		.withMessage("ci didn't set")
		.bail()
		.isNumeric()
		.withMessage("ci is not correct"),
	body("ui")
		.notEmpty()
		.withMessage("ui didn't set")
		.bail()
		.isNumeric()
		.withMessage("ui is not correct"),
	courseController.postMockTestInfoToGetFirstMsg
);


module.exports = route;
