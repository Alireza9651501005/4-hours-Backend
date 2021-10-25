const axios = require("axios").default;

const {
	User,
	Course,
	Lesson,
	Chapter,
	Comment,
	User_Course,
	User_Lesson,
	LessonVideoLog,
} = require("../database/models");

const ResponseBuilder = require("../utils/responseBuilder");
const requestValidator = require("../utils/requestValidator");
const mainConfig = require("../config/mainConfig");
const { lessonVideoScore, lessonInteractiveScore } = require("./score.ct");

const {
	findCourseFromLesson,
	lessonInfoGuard,
	msToTime,
} = require("../utils/helperFunction");

/**
 * For generating and getting video link base on video's id
 * @param {string} video_id video's id on arvancloud database
 */
const getSecureVideoUrl = async (video_id) => {
	try {
		const videoInfo = await axios.get(
			`https://napi.arvancloud.com/vod/2.0/videos/${video_id}`,
			{
				headers: {
					Authorization: process.env.R1_API_KEY,
				},
			}
		);
		return videoInfo.data.data;
	} catch (err) {
		console.log(err);
		return false;
	}
};

/**
 * For sending lesson detail by getting lessonId
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getLessonDetail = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const lessonId = +req.params["lessonId"];
	const user = req.userInfo; /* will use later for check */

	try {
		const lesson = await Lesson.findByPk(lessonId);

		if (!lesson) {
			response.addDevMsg("this lesson id not exist");
			return res.status(404).json(response.build());
		}

		/* For guard lesson info against invalid users */
		const access = await lessonInfoGuard(user, lesson.id);
		if (!access) {
			response.addDevMsg("This user is not allow to get lesson information");
			response.setUserMessage(
				"شما اجازه دسترسی به این محتوا را ندارید",
				"warning"
			);
			return res.status(403).json(response.build());
		}

		const thisLessonCourse = await findCourseFromLesson(lesson.id);

		const commentCount= await Comment.count({where:{
			lessonId:lesson.id
		}})
		let userLessonHistory =[]
		if(user){
			userLessonHistory = await User_Lesson.findAll({
				where: { lessonId: lesson.id, userId: user.id },
			});
			if (userLessonHistory.length === 0) {
				userLessonHistory = await User_Lesson.create({
					user_video_score: 0,
					user_interactive_score: 0,
					lessonId: lesson.id,
					userId: user.id,
				});
			} else {
				userLessonHistory = userLessonHistory[0];
			}
		}
		

		/* Getting info about viewed users of each part of a lesson */
		const usersWhoStartThisLesson = await User_Lesson.findAll({
			where: { lessonId: lesson.id },
		});
		let usersWhoDoInteractivePart = 0;
		let usersWhoDoVideoPart = 0;
		for (let i in usersWhoStartThisLesson) {
			const userLessonInfo = usersWhoStartThisLesson[i];
			if (userLessonInfo.user_interactive_score > 0) {
				usersWhoDoInteractivePart++;
			}
			if (userLessonInfo.user_video_score > 0) {
				usersWhoDoVideoPart++;
			}
		}

		const videoInfo = await getSecureVideoUrl(lesson.dataValues.video_id);

		const responseData = {
			id: lesson.dataValues.id,
			title1: lesson.dataValues.title1,
			title2: lesson.dataValues.title2,
			
			image: lesson.image
					? `http://${process.env.DOMAIN}/public/lesson-images/${lesson.courseId}/${lesson.image}?v=${mainConfig.pic_version}`
					: null,
			image_background: lesson.image_background
					? `http://${process.env.DOMAIN}/public/lesson-images/${lesson.courseId}/${lesson.image_background}?v=${mainConfig.pic_version}`
					: null,
		
			description: lesson.dataValues.description,
			likes: lesson.likes,
			user_liked_lesson: userLessonHistory.liked,
			total_hours:lesson.dataValues.total_hours,
			commentCount,
			course: {
				title: thisLessonCourse.title,
			},
			interactive: {
				url: lesson.dataValues.interactive_link,
				button_title: lesson.dataValues.button_title_interactive,
				window_title: lesson.dataValues.window_title_interactive,
				score: lesson.lesson_interactive_score,
				user_score: userLessonHistory.user_interactive_score,
				subscribers: usersWhoDoInteractivePart,
			},
			video: {
				url: videoInfo.hls_playlist ? videoInfo.hls_playlist : false,
				// cover: videoInfo.thumbnail_url, /* from video frames */
				cover: `${process.env.DOMAIN}/public/constant-material/video-on-load-cover.png` /* for constant cover */,
				// url: false,
				button_title: lesson.dataValues.button_title_video,
				timeout: mainConfig.video_timeout,
				access: mainConfig.call_for_new_video,
				score: lesson.lesson_video_score,
				user_score: userLessonHistory.user_video_score,
				subscribers: usersWhoDoVideoPart,
			},
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
		res.status(500).json(response.build());
	}
};

/**
 * For sending regenerated video link for requested lesson by getting lessonId
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.regeneratingVideoLinkForLesson = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const lessonId = +req.params["lessonId"];
	const user = req.userInfo; /* will use later for check */

	try {
		const lesson = await Lesson.findByPk(lessonId);

		if (!lesson) {
			response.addDevMsg("this lesson id not exist");
			return res.status(404).json(response.build());
		}

		/* For guard lesson info against invalid users */
		const access = await lessonInfoGuard(user, lesson.id);
		if (!access) {
			response.addDevMsg("This user is not allow to get lesson information");
			response.setUserMessage(
				"شما اجازه دسترسی به این محتوا را ندارید",
				"warning"
			);
			return res.status(403).json(response.build());
		}

		const videoInfo = await getSecureVideoUrl(lesson.dataValues.video_id);

		const responseData = {
			url: videoInfo.hls_playlist ? videoInfo.hls_playlist : false,
			cover: videoInfo.thumbnail_url,
			qualities: videoInfo.convert_info,
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
		res.status(500).json(response.build());
	}
};

exports.likeSingleLesson = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const user = req.userInfo;
	const lessonId = +req.params["lessonId"];

	try {
		const lesson = await Lesson.findByPk(lessonId);

		if (!lesson) {
			response.addDevMsg("this lesson id not exist");
			return res.status(404).json(response.build());
		}

		/* For guard lesson info against invalid users */
		const access = await lessonInfoGuard(user, lesson.id);
		if (!access) {
			response.addDevMsg("This user is not allow to get lesson information");
			response.setUserMessage(
				"شما اجازه دسترسی به این محتوا را ندارید",
				"warning"
			);
			return res.status(403).json(response.build());
		}

		const userLesson = await User_Lesson.findOne({
			where: { userId: user.id, lessonId: lesson.id },
		});

		let updatedLesson;
		if (!userLesson.liked) {
			const lessonLikes = lesson.likes;
			lesson.likes = lessonLikes + 1;
			updatedLesson = await lesson.save();
		}
		userLesson.liked = true;
		const updatedUserLesson = await userLesson.save();

		const responseData = {
			lessonId: lesson.id,
			likes: updatedLesson ? updatedLesson.likes : lesson.likes,
			user_liked_lesson: updatedUserLesson.liked,
		};

		response.setResponseData(responseData);
		response.setUserMessage("بازخورد شما ثبت شد", "success");

		return res.status(200).json(response.build());
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage(
			"مشکل در ارتباط با سرور به وجود آمده است",
			"warning",
			true
		);
		res.status(500).json(response.build());
	}
};

exports.deleteLikeSingleLesson = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const user = req.userInfo;
	const lessonId = +req.params["lessonId"];

	try {
		const lesson = await Lesson.findByPk(lessonId);

		if (!lesson) {
			response.addDevMsg("this lesson id not exist");
			return res.status(404).json(response.build());
		}

		/* For guard lesson info against invalid users */
		const access = await lessonInfoGuard(user, lesson.id);
		if (!access) {
			response.addDevMsg("This user is not allow to get lesson information");
			response.setUserMessage(
				"شما اجازه دسترسی به این محتوا را ندارید",
				"warning"
			);
			return res.status(403).json(response.build());
		}

		const userLesson = await User_Lesson.findOne({
			where: { userId: user.id, lessonId: lesson.id },
		});

		let updatedLesson;
		if (userLesson.liked > 0) {
			const lessonLikes = lesson.likes;
			lesson.likes = lessonLikes - 1;
			updatedLesson = await lesson.save();
		}
		userLesson.liked = false;
		const updatedUserLesson = await userLesson.save();

		const responseData = {
			lessonId: lesson.id,
			likes: updatedLesson ? updatedLesson.likes : lesson.likes,
			user_liked_lesson: updatedUserLesson.liked,
		};

		response.setResponseData(responseData);
		response.setUserMessage("بازخورد شما ثبت شد", "success");

		return res.status(200).json(response.build());
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage(
			"مشکل در ارتباط با سرور به وجود آمده است",
			"warning",
			true
		);
		res.status(500).json(response.build());
	}
};

/**
 * For storing video activities
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.postVideoActivityLogs = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const user = req.userInfo;
	const pureVideoRecords = req.body["records"];
	/** video record template =>
	 * {
	 * 		lesson_id: "3",
	 * 		start_time: 123232,
	 * 		stop_time: 1274374,
	 * 		video_start_time: 1,
	 * 		video_stop_time: 29382982,
	 * 		has_seek: false
	 * }[]
	 */
	try {
		const videoRecords = JSON.parse(pureVideoRecords);

		/* validating recieved video records */
		for (let i in videoRecords) {
			const record = videoRecords[i];
			if (!record.lesson_id) {
				response.addDevMsg("lesson_id not send");
				return res.status(422).json(response.build());
			}
			if (!record.start_time) {
				response.addDevMsg("start_time not send");
				return res.status(422).json(response.build());
			}
			if (!record.stop_time) {
				response.addDevMsg("stop_time not send");
				return res.status(422).json(response.build());
			}
			if (
				record.video_start_time === undefined ||
				record.video_start_time === null
			) {
				response.addDevMsg("video_start_time not send");
				return res.status(422).json(response.build());
			}
			if (!record.video_stop_time) {
				response.addDevMsg("video_stop_time not send");
				return res.status(422).json(response.build());
			}
			if (record.has_seek === undefined || record.has_seek === null) {
				response.addDevMsg("has_seek not send");
				return res.status(422).json(response.build());
			}
		}

		const completed = [];
		const lessonIDs = [];

		/* for test */
		const allTotalWatches = [];

		for (let i in videoRecords) {
			const record = videoRecords[i];
			await LessonVideoLog.create({
				lessonId: +record.lesson_id,
				userId: user.id,
				start_time: record.start_time,
				stop_time: record.stop_time,
				video_start_time: record.video_start_time,
				video_stop_time: record.video_stop_time,
				has_seek: record.has_seek,
			});

			const lessonIDExist = lessonIDs.findIndex(
				(el) => el === +record.lesson_id
			);
			if (lessonIDExist < 0) {
				lessonIDs.push(record.lesson_id);
			}
		}

		for (let i = 0; i < lessonIDs.length; i++) {
			/* place for score updating activities */
			const result = await lessonVideoScore(user, lessonIDs[i]);
			if (result.result) {
				completed.push({
					lesson_id: lessonIDs[i],
				});
			}

			/* for test */
			allTotalWatches.push(
				"L->" + lessonIDs[i] + "-" + msToTime(result.totalWatch)
			);
		}

		/* test user msg */
		let msg = "#";
		for (let i in allTotalWatches) {
			msg += allTotalWatches[i] + "#";
		}

		const responseData = {
			completed: completed,
		};
		response.setResponseData(responseData);
		/* for debug mode */
		// response.setUserMessage(msg, "success");
		return res.status(200).json(response.build());
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage(
			"مشکل در ارتباط با سرور به وجود آمده است",
			"warning",
			true
		);
		res.status(500).json(response.build());
	}
};

/**
 * For handling user interactive score process
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.updateUserLessonInteractive = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const user = req.userInfo;
	const interactiveData = req.body["data"];
	const lessonId = +req.params["lessonId"];

	try {
		const lesson = await Lesson.findByPk(lessonId);

		if (!lesson) {
			response.addDevMsg("this lesson id not exist");
			return res.status(404).json(response.build());
		}

		/* For guard lesson info against invalid users */
		const access = await lessonInfoGuard(user, lesson.id);
		if (!access) {
			response.addDevMsg("This user is not allow to get lesson information");
			response.setUserMessage(
				"شما اجازه دسترسی به این محتوا را ندارید",
				"warning"
			);
			return res.status(403).json(response.build());
		}

		let data,
			newGainedScore = 0,
			updateLesson = false;
		/**
		 * data is like this:
		 * {
		 * 		score: Number // score that user gain through lesson interactive part
		 * }
		 */
		try {
			data = JSON.parse(interactiveData);
			if (data.score === undefined) {
				throw "necessary fields not send";
			}
		} catch (err) {
			response.addDevMsg(err.toString());
			response.addDevMsg("data format is not correct");
			return res.status(422).json(response.build());
		}

		const userLesson = await User_Lesson.findOne({
			where: { userId: user.id, lessonId: lesson.id },
		});

		if (!userLesson) {
			response.addDevMsg("this lesson is not processable");
			return res.status(422).json(response.build());
		}

		const thisInteractiveScore = data.score;
		const thisLessonInteractiveScore = lesson.lesson_interactive_score;

		if (
			userLesson.user_interactive_score < thisInteractiveScore &&
			userLesson.user_interactive_score < lesson.lesson_interactive_score &&
			userLesson.done === false
		) {
			/* For saying that this lesson should reload after sending result */
			updateLesson = true;

			if (thisInteractiveScore <= thisLessonInteractiveScore) {
				newGainedScore =
					thisInteractiveScore - userLesson.user_interactive_score;
			} else {
				newGainedScore =
					thisLessonInteractiveScore - userLesson.user_interactive_score;
			}

			/* do some recording and notification process */
			lessonInteractiveScore(user, lessonId, newGainedScore);
		} else {
			const responseData = {
				update: false,
				interactive_score: 0,
			};
			response.setResponseData(responseData);

			return res.status(200).json(response.build());
		}

		const responseData = {
			update: updateLesson,
			interactive_score: +userLesson.user_interactive_score + newGainedScore,
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
