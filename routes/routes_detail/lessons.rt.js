const express = require("express");
const { body, param, query } = require("express-validator");

const route = express.Router();

const isAuth = require("../../middlewares/auth");

/* controllers */
const commentController = require("../../controllers/comments.ct");
const lessonController = require("../../controllers/lesson.ct");

/**
 * prefix: '/api/v1/courses'
 * version 1
 */

route.get(
	"/lessons/:lessonId",
	param("lessonId").isNumeric().withMessage("Lesson id should be number"),
	lessonController.getLessonDetail
);

route.get(
	"/lessons/:lessonId/video",
	param("lessonId").isNumeric().withMessage("Lesson id should be number"),
	lessonController.regeneratingVideoLinkForLesson
);

route.post(
	"/lessons/:lessonId/interactive",
	param("lessonId").isNumeric().withMessage("Lesson id should be number"),
	body("data").notEmpty().withMessage("data field should not be empty"),
	lessonController.updateUserLessonInteractive
);

route.post(
	"/lessons/:lessonId/like",
	param("lessonId").isNumeric().withMessage("Lesson id should be number"),
	lessonController.likeSingleLesson
);

route.delete(
	"/lessons/:lessonId/like",
	param("lessonId").isNumeric().withMessage("Lesson id should be number"),
	lessonController.deleteLikeSingleLesson
);

route.get(
	"/lessons/:lessonId/comments",
	isAuth,
	param("lessonId")
		.notEmpty()
		.withMessage("lessonId didn't set")
		.bail()
		.isNumeric()
		.withMessage("lessonId param is not correct"),
	query("page")
		.notEmpty()
		.withMessage("page QUERY did not send")
		.bail()
		.isNumeric()
		.withMessage("page QUERY should be integer"),
	commentController.getLessonComments
);

route.post(
	"/lessons/:lessonId/comment",
	isAuth,
	param("lessonId")
		.notEmpty()
		.withMessage("lessonId didn't set")
		.bail()
		.isNumeric()
		.withMessage("lessonId param is not correct"),
	body("content").notEmpty().withMessage("نظری وارد نشده است"),
	commentController.postLessonComment
);

route.post(
	"/lessons/comments/:commentId/reaction",
	param("commentId")
		.notEmpty()
		.withMessage("commentId didn't set")
		.bail()
		.isNumeric()
		.withMessage("lessonId param is not correct"),
	body("reaction")
		.notEmpty()
		.withMessage("reaction not sent")
		.bail()
		.matches(/LIKE|DISLIKE/)
		.withMessage('reaction should be "LIKE" or "DISLIKE"'),
	commentController.setCommentReaction
);

route.post(
	"/lessons/video/score",
	body("records").notEmpty().withMessage("records not send"),
	lessonController.postVideoActivityLogs
);

module.exports = route;
