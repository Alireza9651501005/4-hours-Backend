const jalali = require("jalaali-js");

const {
	Course,
	Chapter,
	Attachment,
	Tag,
	User_Course,
	Comment,
	User_Lesson,
	Lesson,
	User,
} = require("../database/models");

const ResponseBuilder = require("../utils/responseBuilder");
const requestValidator = require("../utils/requestValidator");
const { courseFinalExamScore } = require("./score.ct");

const {
	userOwnedCourse,
	calculatingCourseStatus,
} = require("../utils/helperFunction");

/* setting config */
const settingConfig = require("../config/setting");
const mainConfig = require("../config/mainConfig");
const { VIEWS } = require("../config/app");

/**
 * For handling the flow of courses data
 * @param {req} req request
 * @param {res} res response
 * @param {next} next next function
 */
exports.getCourse = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const courseId = +req.params["courseId"];
	const user = req.userInfo;

	try {
		
		const courses = await Course.findAll({ where: { id: courseId } });
		if (courses.length === 0) {
			response.addDevMsg("this course not exist");
			response.setUserMessage("دوره مورد نظر یافت نشد", "warning", true);
			return res.status(200).json(response.build());
		}
		
		let access = await userOwnedCourse(user);
		
		/* for get user that use this course count */
		const usersThatUseThisCourse = await User_Course.findAll({
			where: { courseId: courseId },
		});
		// /* for get this course chapter count */
		// const courseChapters = await Chapter.findAll({
		// 	where: { courseId: courseId },
		// });

		const lessons = await Lesson.findAll({where:{
			courseId:courseId
		}})

		let userLessons=[];
		const doneLessons = await User_Lesson.findAll({where:{
			userId:user.id,
			done:true
		}})
		lessons.forEach((lesson) => {
			let thisLesson={
				id:lesson.id,
				title1:lesson.title1,
				title2:lesson.title2,
				is_done:false,
				description:lesson.description,
				is_free:lesson.is_free,
				access:user.isCostumer||lesson.is_free?true:false,
				courseId:lesson.courseId,
				image: lesson.image
				? `http://${process.env.DOMAIN}/public/lesson-images/${courseId}/${lesson.image}?v=${mainConfig.pic_version}`
				: null,
				image_background: lesson.image_background
				? `http://${process.env.DOMAIN}/public/lesson-images/${courseId}/${lesson.image_background}?v=${mainConfig.pic_version}`
				: null,
			}
			doneLessons.forEach((isDone) => {
				if ( isDone.lessonId===lesson.id) {
					thisLesson.is_done=true
				}
			});
			userLessons.push(thisLesson)

		});
		const course = courses[0];
		// const canUserUseCourse = access || course.price === 0;

		const responseData = {
			id: courseId,
			access: access,
			title1: course.title1,
			title2: course.title2,
			engagement: usersThatUseThisCourse ? usersThatUseThisCourse.length : 0,
			level: course.level,
			total_hours: course.total_hours,
			// total_chapters: courseChapters ? courseChapters.length : 0,
			
			image: course.image
				? `http://${process.env.DOMAIN}/public/course-images/${course.image}?v=${mainConfig.pic_version}`
				: null,
			image_background: course.image_background
				? `http://${process.env.DOMAIN}/public/course-images/${course.image_background}?v=${mainConfig.pic_version}`
				: null,
			
			description: course.description,
			lessons:userLessons,
			short_description: course.short_description,
			// main_button: main_button_content,
			share_content: `متن اشتراک گذاری دوره ${course.title}`,
		};

		if ((access === false) & (course.price !== 0)) {
			responseData.payment = {
				price_title: course.price_title,
				price: course.price,
				last_price: course.last_price,
				free: course.price === 0,
			};
		}
		if (access === true) {
			responseData.exam = {
				url: `http://mocky-pages.myfreenet.ir/test.html?id=1`,
				button_title: "آزمون",
				window_title: "آزمون",
			};
		}

		response.setResponseData(responseData);
		return res.status(200).json(response.build());
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage(
			"مشکل در ارتباط با سرور به وجود آمده است",
			"warning",
			false
		);
		res.status(500).json(response.build());
	}
};

/**
 * For handling the flow of course's chapter
 * @param {req} req request
 * @param {res} res response
 * @param {next} next next function
 */
exports.getCourseChapters = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const courseId = +req.params["courseId"];

	try {
		let access = await userOwnedCourse(req.userInfo, courseId);

		const courses = await Course.findAll({
			where: { id: courseId },
			include: Chapter,
		});
		if (courses.length === 0) {
			response.addDevMsg("this course not exist");
			response.setUserMessage("دوره مورد نظر یافت نشد", "warning", false);
			return res.status(200).json(response.build());
		}
		const course = courses[0];

		/* gathering lessons from chapters */
		if (access) {
			const chapters_content = [];

			for (let i in course.chapters) {
				const chapter = course.chapters[i];
				const chapterContent = { id: chapter.id, title: chapter.title };
				const chapterLessons = await chapter.getLessons();

				/* for formatting lessons */
				const lessons_content = [];
				for (let j in chapterLessons) {
					const lesson = chapterLessons[j];

					/* get this lessons comments count */
					const lessonComments = await lesson.getComments();

					/* get user score for this lesson */
					const userLessonHistory = await User_Lesson.findOne({
						where: { userId: req.userInfo.id, lessonId: lesson.id },
					});
					let user_score = 0;
					if (userLessonHistory) {
						user_score =
							userLessonHistory.user_interactive_score +
							userLessonHistory.user_video_score;
					}

					/* calculate lesson score */
					const lesson_score =
						lesson.lesson_interactive_score + lesson.lesson_video_score;

					const lessonContent = {
						id: lesson.id,
						title: lesson.title,
						color: lesson.image_background_color,
						image: lesson.image,
						lesson_score: lesson_score,
						user_score: user_score,
						user_done: userLessonHistory ? userLessonHistory.done : false,
						total_hours: lesson.total_hours,
						likes: lesson.likes,
						total_comments: lessonComments ? lessonComments.length : 0,
					};

					lessons_content.push(lessonContent);
				}
				chapterContent.lessons = lessons_content;
				chapters_content.push(chapterContent);
			}

			const responseData = {
				id: course.id,
				access: access,
				chapters: chapters_content,
			};
			response.setResponseData(responseData);
			return res.status(200).json(response.build());
		}

		/* in case that user has access to this course */
		const responseData = {
			id: course.id,
			access: access,
			chapters: [],
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
 * For handling the flow of course's attachments
 * @param {req} req request
 * @param {res} res response
 * @param {next} next next function
 */
exports.getCourseAttachments = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const courseId = +req.params["courseId"];

	try {
		let access = await userOwnedCourse(req.userInfo, courseId);

		const courses = await Course.findAll({
			where: { id: courseId },
			include: Attachment,
		});
		if (courses.length === 0) {
			response.addDevMsg("this course not exist");
			response.setUserMessage("دوره مورد نظر یافت نشد", "warning", true);
			return res.status(200).json(response.build());
		}
		const course = courses[0];

		if (access) {
			const attachments = [];
			course.attachments.forEach((attachment) => {
				const attachmentUniqueName =
					(attachment.id % 10).toString() +
					attachment.createdAt.getTime().toString();

				const attachment_content = {
					type: attachment.type.toUpperCase(),
					title: attachment.title,
					url: `${process.env.DOMAIN}/public/course-attachments/${attachment.filename}`,
					icon: `${process.env.DOMAIN}/public/constant-material/pdf.png` /* should change base on file extension */,
					file_unique_name: attachmentUniqueName,
				};
				attachments.push(attachment_content);
			});

			const responseData = {
				id: course.id,
				access: access,
				attachments: attachments,
			};

			response.setResponseData(responseData);
			return res.status(200).json(response.build());
		} else {
			const responseData = {
				id: course.id,
				access: access,
				attachments: [],
			};

			response.setResponseData(responseData);
			return res.status(200).json(response.build());
		}
	} catch (err) {
		response.addDevMsg(err.toString());
		response.setUserMessage(
			"مشکل در ارتباط با سرور به وجود آمده است",
			"warning",
			true
		);
		return res.status(500).json(response.build());
	}
};

exports.getCourseStatus = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const courseId = +req.params["courseId"];
	const user = req.userInfo;

	try {
		let access = await userOwnedCourse(req.userInfo, courseId);
		if (!access) {
			response.addDevMsg("This content cannot be served");
			return res.status(403).json(response.build());
		}

		const course = await Course.findByPk(courseId);

		const {
			active_course_exam,
			course_has_exam,
			all_lessons,
			done_lessons,
			last_activity_date,
			last_lesson,
			progress_percentage,
			start_date_string,
			user_course,
			total_course_interactive_scores,
			total_course_video_scores,
			total_user_interactive_scores,
			total_user_video_scores,
		} = await calculatingCourseStatus(user, course.id);

		const responseData = {
			total_course_interactive_scores: total_course_interactive_scores,
			total_course_video_scores: total_course_video_scores,
			total_user_interactive_scores: total_user_interactive_scores,
			total_user_video_scores: total_user_video_scores,
			course_lessons_count: all_lessons,
			user_done_lessons_count: done_lessons,
			progress_percentage: progress_percentage,
			course_start_time: start_date_string,
			course_last_activity_time: last_activity_date,
			exam: course_has_exam
				? {
						active: active_course_exam,
						title: user_course.user_exam_count > 0 ? "آزمون مجدد" : "آزمون",
						action: {
							type: "browse",
							in_app: true,
							url: course.exam_link + `?ci=${courseId}&ui=${user.id}`,
						},
				  }
				: null,
			last_lesson: last_lesson,
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
 * For handling course final exam passing
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.postCourseFinalExam = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}
	const examResult = req.body["data"];
	/**
	 * ( mock )
	 * examResult structure: {
	 * 		pass_exam: Boolean
	 * }
	 */
	const courseId = +req.params["courseId"];
	const user = req.userInfo;
	let examResultParsed;

	try {
		const userOwnThisCourse = await userOwnedCourse(user, courseId);
		if (!userOwnThisCourse) {
			response.addDevMsg("This course is not accessable for this user");
			return res.status(403).json(response.build());
		}

		try {
			examResultParsed = JSON.parse(examResult);
			if (examResultParsed.pass_exam === undefined) {
				throw "pass_exam field is not in exam result object";
			}
		} catch (err) {
			console.log(err);
			response.addDevMsg(err.toString());
			return res.status(422).json(response.build());
		}

		const thisCourse = await Course.findByPk(courseId);
		const thisUserCourse = await User_Course.findOne({
			where: { courseId: thisCourse.id, userId: user.id },
		});

		if (
			thisUserCourse.user_exam_count >= thisCourse.exam_try_count ||
			thisUserCourse.done
		) {
			/* for preventing user from gain out of limit try for doing exam */
			let msg;
			if (thisUserCourse.done) {
				msg = "شما قبلا در این آزمون قبول شده‌اید";
			} else {
				msg = "فرصت شما برای گذراندن این آزمون تمام شده است";
			}
			response.setResponseData({
				update: false,
			});
			response.setUserMessage(msg, "warning");
			return res.status(200).json(response.build());
		}

		if (!examResultParsed.pass_exam) {
			/* in this step, this process done with mock test page api call */
			// const nowTryCount = thisUserCourse.user_exam_count;
			// thisUserCourse.user_exam_count = nowTryCount + 1;
			// const updatedThisUserCourse = await thisUserCourse.save();

			const remainTryOnThisExam =
				thisCourse.exam_try_count - thisUserCourse.user_exam_count;
			response.setUserMessage(
				`متاسفانه در آزمون قبول نشدید ${
					thisCourse.exam_try_count > thisUserCourse.user_exam_count
						? `شما ${remainTryOnThisExam} فرصت دیگر دارید`
						: "دیگر فرصتی برای اتمام آزمون ندارید"
				}`,
				"warning"
			);
			response.setResponseData({
				update: false,
			});
			return res.status(200).json(response.build());
		} else {
			/* in this step, this process done with mock test page api call */
			// const nowTryCount = thisUserCourse.user_exam_count;
			// thisUserCourse.user_exam_count = nowTryCount + 1;
			thisUserCourse.done = true;
			await thisUserCourse.save();

			await courseFinalExamScore(thisCourse, user);

			response.setResponseData({
				update: true,
			});
			response.setUserMessage("تبریک، در آزمون قبول شدید", "success");
			return res.status(200).json(response.build());
		}
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
 * For handling course final exam web page loading message
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.postMockTestInfoToGetFirstMsg = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const courseId = req.body["ci"];
	const userId = req.body["ui"];

	try {
		const user = await User.findByPk(userId);
		const userOwnThisCourse = await userOwnedCourse(user, courseId);
		if (!userOwnThisCourse) {
			response.addDevMsg("This course is not accessable for this user");
			return res.status(403).json(response.build());
		}

		const thisCourse = await Course.findByPk(courseId);
		const thisUserCourse = await User_Course.findOne({
			where: { courseId: thisCourse.id, userId: user.id },
		});

		if (
			thisUserCourse.user_exam_count >= thisCourse.exam_try_count ||
			thisUserCourse.done
		) {
			/* for preventing user from gain out of limit try for doing exam */
			let msg;
			if (thisUserCourse.done) {
				msg = "شما قبلا در این آزمون قبول شده‌اید";
			} else {
				msg = "فرصت شما برای گذراندن این آزمون تمام شده است";
			}
			response.setUserMessage(msg, "warning");
			return res.status(200).json(response.build());
		}

		const nowTryCount = thisUserCourse.user_exam_count;
		thisUserCourse.user_exam_count = nowTryCount + 1;
		const updatedUserCourse = await thisUserCourse.save();
		const remainTryOnThisExam =
			thisCourse.exam_try_count - updatedUserCourse.user_exam_count;

		response.setUserMessage(
			`${
				thisCourse.exam_try_count > thisUserCourse.user_exam_count
					? `شما ${remainTryOnThisExam} فرصت دیگر دارید`
					: "دیگر فرصتی برای اتمام آزمون ندارید"
			}`,
			"warning"
		);

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
 * For handling the flow of course page content-rows
 * @param {req} req request
 * @param {res} res response
 * @param {next} next next function
 */
exports.getCourseContentRows = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const courseId = +req.params["courseId"];
	const limit = +req.query["limit"] || settingConfig.item_on_content_rows;

	try {
		const courses = await Course.findAll({
			where: { id: courseId },
			include: Tag,
		});
		if (courses.length === 0) {
			response.addDevMsg("this course not exist");
			response.setUserMessage("دوره مورد نظر یافت نشد", "warning", true);
			return res.status(200).json(response.build());
		}
		const course = courses[0];
		const courseTags = course.tags;
		const relatedCourses = [];

		// /* For prevent to show repeated courses */
		// const addUniqueRelatedCourses = (course) => {
		// 	let courseExist = false;
		// 	if (relatedCourses.length > 0) {
		// 		for (let i = 0; i < relatedCourses.length; i++) {
		// 			if (relatedCourses[i].id === course.id || course.id === courseId) {
		// 				courseExist = true;
		// 				break;
		// 			}
		// 			if (!courseExist && i === relatedCourses.length - 1) {
		// 				relatedCourses.push(course);
		// 			}
		// 		}
		// 	} else if (course.id !== courseId) {
		// 		relatedCourses.push(course);
		// 	}
		// };

		// // let tagsCount = courseTags.length - 1;

		// const courseFormatter = async (courses) => {
		// 	const final = [];
		// 	for (let i in courses) {
		// 		const course = courses[i];

		// 		const finalFormat = {
		// 			...course.dataValues,
		// 			image: `${process.env.DOMAIN}/public/course-images/${course.image}`,
		// 			color: course.image_background_color,
		// 			title: course.title,
		// 			action: {
		// 				id: course.id,
		// 				type: VIEWS.course_view,
		// 				title: course.title,
		// 			},
		// 		};
		// 		delete finalFormat.updatedAt;
		// 		delete finalFormat.createdAt;
		// 		delete finalFormat.image_background_color;
		// 		delete finalFormat.description;
		// 		delete finalFormat.score;
		// 		delete finalFormat.has_exam;
		// 		delete finalFormat.exam_link;
		// 		delete finalFormat.course_tag;

		// 		final.push(finalFormat);
		// 	}

		// 	return final;
		// };

		// let courseCount = 0;
		// for (let i in courseTags) {
		// 	if (courseCount >= limit) {
		// 		break;
		// 	}
		// 	const tag = courseTags[i];
		// 	const allTagInformation = await Tag.findOne({
		// 		where: { id: tag.id },
		// 		include: [{ model: Course, order: [["createdAt", "DESC"]] }],
		// 	});

		// 	const allTagCourses = allTagInformation.courses;
		// 	for (let j in allTagCourses) {
		// 		const thisCourse = allTagCourses[j];
		// 		if (courseCount >= limit) {
		// 			break;
		// 		}
		// 		if (thisCourse.id !== courseId) {
		// 			courseCount++;
		// 		}
		// 		addUniqueRelatedCourses(thisCourse);
		// 	}
		// }

		// const responseData = {
		// 	content_rows: [
		// 		{
		// 			type: "item-list",
		// 			item_layout: "course",
		// 			title: "دوره های مشابه",
		// 			button_title: "بیشتر",
		// 			button_action: {
		// 				item_layout: "course",
		// 				id: courseId,
		// 				type: "item-list",
		// 				api: "", // should change late to the more api
		// 				title: "دوره های مشابه",
		// 			},
		// 			items: await courseFormatter(relatedCourses),
		// 		},
		// 	],
		// };

		const responseData = {
			content_rows: [],
		};

		response.setResponseData(responseData);
		return res.status(200).json(response.build());
	} catch (err) {
		response.addDevMsg(err.toString());
		response.setUserMessage(
			"مشکل در ارتباط با سرور به وجود آمده است",
			"warning",
			true
		);
		return res.status(500).json(response.build());
	}
};

// exports.getRelatedCoursesToACourse = async (req, res, next) => {
// 	const response = new ResponseBuilder();

// 	const isRequestInvalid = requestValidator(req, response);
// 	if (isRequestInvalid) {
// 		return res.status(422).json(isRequestInvalid);
// 	}

// 	const courseId = +req.params["courseId"];
// 	const page = +req.query["page"];
// 	const limit = +req.query["limit"] || 20;

// 	/**
// 	 * calculating variable for pagination
// 	 */
// 	const offset = limit * (page - 1);

// 	try {
// 		const courses = await Course.findAll({
// 			where: { id: courseId },
// 			include: Tag,
// 		});
// 		if (courses.length === 0) {
// 			response.addDevMsg("this course not exist");
// 			response.setUserMessage("دوره مورد نظر یافت نشد", "warning", true);
// 			return res.status(200).json(response.build());
// 		}
// 		const course = courses[0];
// 		const courseTags = course.tags;
// 		const relatedCourses = [];

// 		// For prevent to show repeated courses
// 		const addUniqueRelatedCourses = (course) => {
// 			let courseExist = false;
// 			if (relatedCourses.length > 0) {
// 				for (let i = 0; i < relatedCourses.length; i++) {
// 					if (relatedCourses[i].id === course.id || course.id === courseId) {
// 						courseExist = true;
// 						break;
// 					}
// 					if (!courseExist && i === relatedCourses.length - 1) {
// 						relatedCourses.push(course);
// 					}
// 				}
// 			} else if (course.id !== courseId) {
// 				relatedCourses.push(course);
// 			}
// 		};

// 		// let tagsCount = courseTags.length - 1;

// 		const courseFormatter = async (courses) => {
// 			const final = [];
// 			for (let i in courses) {
// 				const course = courses[i];

// 				const finalFormat = {
// 					...course.dataValues,
// 					image: `${process.env.DOMAIN}/public/course-images/${course.image}`,
// 					color: course.image_background_color,
// 					title: course.title,
// 					action: {
// 						id: course.id,
// 						type: VIEWS.course_view,
// 						title: course.title,
// 					},
// 				};
// 				delete finalFormat.updatedAt;
// 				delete finalFormat.createdAt;
// 				delete finalFormat.image_background_color;
// 				delete finalFormat.description;
// 				delete finalFormat.score;
// 				delete finalFormat.has_exam;
// 				delete finalFormat.exam_link;
// 				delete finalFormat.course_tag;

// 				final.push(finalFormat);
// 			}

// 			return final;
// 		};

// 		let courseCount = 0;
// 		for (let i in courseTags) {
// 			const tag = courseTags[i];
// 			const allTagInformation = await Tag.findOne({
// 				where: { id: tag.id },
// 				include: [{ model: Course, order: [["createdAt", "DESC"]] }],
// 			});

// 			const allTagCourses = allTagInformation.courses;
// 			for (let j in allTagCourses) {
// 				const thisCourse = allTagCourses[j];
// 				if (thisCourse.id !== courseId) {
// 					courseCount++;
// 				}
// 				addUniqueRelatedCourses(thisCourse);
// 			}
// 		}

// 		const responseData = {
// 			content_rows: [
// 				{
// 					type: "item-list",
// 					item_layout: "course",
// 					title: "دوره های مشابه",
// 					button_title: "بیشتر",
// 					button_action: {
// 						item_layout: "course",
// 						id: courseId,
// 						type: "item-list",
// 						api: "", // should change late to the more api
// 						title: "دوره های مشابه",
// 					},
// 					items: await courseFormatter(relatedCourses),
// 				},
// 			],
// 		};

// 		response.setResponseData(responseData);
// 		return res.status(200).json(response.build());
// 	} catch (err) {
// 		response.addDevMsg(err.toString());
// 		response.setUserMessage(
// 			"مشکل در ارتباط با سرور به وجود آمده است",
// 			"warning",
// 			true
// 		);
// 		return res.status(500).json(response.build());
// 	}
// };
