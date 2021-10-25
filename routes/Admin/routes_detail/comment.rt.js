const express = require("express");
const { body } = require("express-validator");

const commentController = require("../../../controllers/Admin/comment.ct");

const router = express.Router();

router.get("/", commentController.getAllComments);

// router.get("/", commentController.getUnpublishedComments);

router.get("/:commentId", commentController.getOneComment);


router.put(
	"/:commentId",
	body("content")
		.notEmpty()
		.withMessage("لطفا متن نظر را وارد کنید")
		.bail(),
    body("lessonId")
		.notEmpty()
		.withMessage("لطفا درس مربوطه را وارد کنید")
		.bail(),

        commentController.updateOneComment,
);

router.put(
	"/:commentId/status",
        commentController.acceptComment,
);

router.delete("/:commentId",
    commentController.deleteOneComment
);

module.exports = router;
