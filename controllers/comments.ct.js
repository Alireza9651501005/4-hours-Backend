const { User, Comment, Comment_User, Lesson } = require("../database/models");

const ResponseBuilder = require("../utils/responseBuilder");
const requestValidator = require("../utils/requestValidator");
const { filterBadWords } = require("../utils/input");
const {
	commentScore,
	commentReactionScore,
} = require("../controllers/score.ct");

/**
 * For handling the flow of lesson's comments
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getLessonComments = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const lessonId = +req.params["lessonId"];
	const page = +req.query["page"];
	const limit = +req.query["limit"] || 20;

	/**
	 * calculating variable for pagination
	 */
	const offset = limit * (page - 1);

	try {
		const lesson = await Lesson.findByPk(lessonId);
		if (!lesson) {
			response.addDevMsg("this lesson not found");
			response.setUserMessage("این درس وجود ندارد", "error");
			return res.status(422).json(response.build());
		}

		const requestedComments = await Comment.findAll({
			where: { lessonId: lessonId },
			order: [["score", "DESC"]],
		});

		/**
		 * when asked lesson has no comment
		 */
		if (!requestedComments) {
			return res.status(200).json(response.build());
		}

		const commentByOrder = [];
		for (let i = 0; i < requestedComments.length; i++) {
			const el = requestedComments[i];
			const commentWriter = await User.findByPk(el.userId);

			if (commentWriter) {
				commentByOrder.push({
					...el.dataValues,
					user: {
						id: commentWriter.id,
						username: commentWriter.username,
						name: commentWriter.name?commentWriter.name:'',
						image: commentWriter.profile_image
							? `http://${process.env.DOMAIN}/public/profile-images/${commentWriter.profile_image}`
							: `http://${process.env.DOMAIN}/public/profile-images/no-image.png`,
						stars: commentWriter.stars,
					},
					children: [],
				});
			}
		}

		const addSubCommentToParent = (subComment, parentId) => {
			for (let i = 0; i < commentByOrder.length; i++) {
				const el = commentByOrder[i];

				if (el.id === parentId) {
					delete subComment.children;
					el.children.push(subComment);
				}
			}
		};
		for (let i in commentByOrder) {
			const comment = commentByOrder[i];
			if (comment.parent_id) {
				let parent = [...requestedComments].find(
					(el) => el.id === comment.parent_id
				);
				if (parent.parent_id) {
					addSubCommentToParent(comment, parent.parent_id);
				} else {
					addSubCommentToParent(comment, parent.id);
				}
			}
		}

		const finalCommentsFormat = commentByOrder.filter((el) => !el.parent_id);
		/**
		 * calculating all available pages
		 */
		const pages = Math.ceil(finalCommentsFormat.length / limit);

		const thisPageComments = [];
		for (
			let i = offset;
			i < finalCommentsFormat.length && thisPageComments.length < limit;
			i++
		) {
			thisPageComments.push(finalCommentsFormat[i]);
		}

		const responseData = {
			current_page: page,
			from: 1,
			last_page: pages,
			per_page: limit,
			total: finalCommentsFormat.length,
			comments: thisPageComments,
		};

		response.setResponseData(responseData);
		return res.status(200).json(response.build());
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage(
			"مشکل در ارتباط با سرور به وجود آمده است",
			"warning",
			true
		);
		return res.status(500).json(response.build());
	}
};

/**
 * For user commenting
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.postLessonComment = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const lessonId = +req.params["lessonId"];
	const content = filterBadWords(req.body["content"]);
	const parent_id = +req.body["parent_id"];
	const user = req.userInfo;

	try {
		const lesson = await Lesson.findByPk(lessonId);

		if (!lesson) {
			response.addDevMsg("This lesson not found");
			return res.status(404).json(response.build());
		}

		let comment;
		if (parent_id) {
			/* check for valid parent_id */
			const parentCommentExist = await Comment.findAll({
				where: { id: parent_id, lessonId: lessonId },
			});
			if (parentCommentExist.length === 0) {
				response.addDevMsg("This parent_id for this lesson not found");
				return res.status(404).json(response.build());
			}

			comment = await Comment.create({
				content: content,
				parent_id: parent_id,
				lessonId: lessonId,
				userId: user.id,
				status: "تایید نشده",
			});
		} else {
			comment = await Comment.create({
				content: content,
				lessonId: lessonId,
				userId: user.id,
				status: "تایید نشده",
			});
		}

		/* place to effect comment score */
		commentScore(user, comment);

		const responseData = {
			comment: {
				...comment.dataValues,
				user: {
					id: user.id,
					username: user.username,
					image: user.profile_image
						? `http://${process.env.DOMAIN}/public/profile-images/${user.profile_image}`
						: `http://${process.env.DOMAIN}/public/profile-images/no-image.png`,
					stars: user.stars,
				},
			},
		};

		response.setResponseData(responseData);
		response.setUserMessage("نظر شما ثبت شد", "success");
		return res.status(200).json(response.build());
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage(
			"مشکل در ارتباط با سرور به وجود آمده است",
			"warning",
			true
		);
		return res.status(500).json(response.build());
	}
};

/**
 * For user reacting on a comment
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.setCommentReaction = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const REACTION_SCHEMA = {
		like: "LIKE",
		dislike: "DISLIKE",
	};

	const commentId = +req.params["commentId"];
	const reaction = req.body["reaction"];
	const user = req.userInfo;
	try {
		const comment = await Comment.findByPk(commentId);

		const loadUserReaction = await Comment_User.findAll({
			where: { commentId: commentId, userId: user.id },
		});
		if (loadUserReaction.length === 0) {
			/* When user did not reacted to the requested comment, we create it */
			await Comment_User.create({
				reaction: reaction,
				commentId: commentId,
				userId: user.id,
			});
			/* updating reactions count on the requested comment */
			if (reaction === REACTION_SCHEMA.like) {
				let newLikes = comment.likes + 1;
				comment.likes = newLikes;
			} else if (reaction === REACTION_SCHEMA.dislike) {
				let newDislikes = comment.dislikes + 1;
				comment.dislikes = newDislikes;
			}

			/* place for set score for comment writer */
			commentReactionScore(reaction, comment, 1, user);
		} else {
			/* in case that a user did react to the requested comment */
			if (reaction !== loadUserReaction[0].reaction) {
				/* change the recorded reaction */
				loadUserReaction[0].reaction = reaction;
				await loadUserReaction[0].save();
				/* updating reactions count on the requested comment */
				if (reaction === REACTION_SCHEMA.like) {
					/* like ++ */
					let newLikes = comment.likes + 1;
					comment.likes = newLikes;
					/* dislike -- */
					let newDislikes = comment.dislikes - 1;
					comment.dislikes = newDislikes;
				} else if (reaction === REACTION_SCHEMA.dislike) {
					/* dislike ++ */
					let newDislikes = comment.dislikes + 1;
					comment.dislikes = newDislikes;
					/* like -- */
					let newLikes = comment.likes - 1;
					comment.likes = newLikes;
				}
				/* place for set score for comment writer */
				/* 2, because we should do action to ignore previous reaction score on this comment */
				commentReactionScore(reaction, comment, 2, user);
			}
		}

		const updatedComment = await comment.save();

		const responseData = {
			id: updatedComment.id,
			reaction: reaction,
			likes: updatedComment.likes,
			dislikes: updatedComment.dislikes,
		};

		response.setResponseData(responseData);
		response.setUserMessage("بازخورد شما با موفقیت ثبت شد", "success");
		return res.status(200).json(response.build());
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage(
			"مشکل در ارتباط با سرور به وجود آمده است",
			"warning",
			false
		);
		return res.status(500).json(response.build());
	}
};
