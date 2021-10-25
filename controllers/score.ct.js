/* in this controller, user's score handled. Then comment stars affected by activities here */
const jalali = require("jalaali-js");
const sequelize = require("sequelize");
const Op = sequelize.Op;

const database = require("../database/database");

const {
	User,
	Lesson,
	Chapter,
	Course,
	User_Lesson,
	LessonVideoLog,
	Score,
	Network,
	Wallet,
	UserDevice,
	Message,
} = require("../database/models");

const {
	notification_topics,
	notification_payload_generator,
	subscribeUserToTopic,
	unsubscribeUserFromTopic,
	sendNotification_OneUser,
} = require("../utils/pushNotification");

const { findCourseFromLesson } = require("../utils/helperFunction");

const { VIEWS } = require("../config/app");

/* For updating user stars on EVERY SCORE GAINING ACTION */
const userStarUpdater = async (userId) => {
	/* ========= Start Configuration ========= */
	/* star score limits */
	const starScoreLimit = [
		[0, 500] /* 0 stars */,
		[500, 2000] /* 1 stars */,
		[2000, 5000] /* 2 stars */,
		[5000, 10000] /* 3 stars */,
		[10000, 20000] /* 4 stars */,
		[20000] /* 5 stars */,
	];
	/* =========  End Configuration  ========= */

	try {
		const [total_score_row] = await database.query(
			`SELECT SUM(IF(\`negative\` = 1, -1, 1) * \`score\`) AS total_score FROM \`scores\` WHERE \`scores\`.\`userId\` = ${userId};`
		);
		const [total_network_row] = await database.query(
			`SELECT SUM(IF(\`negative\` = 1, -1, 1) * \`score\`) AS total_network FROM \`networks\` WHERE \`networks\`.\`userId\` = ${userId};`
		);

		const userStarScore =
			+total_score_row[0].total_score + +total_network_row[0].total_network;
		let finalStar = 0;

		for (let i = 0; i < starScoreLimit.length; i++) {
			const limit = starScoreLimit[i];
			if (
				i !== starScoreLimit.length - 1 &&
				userStarScore >= limit[0] &&
				userStarScore < limit[1]
			) {
				finalStar = i;
				break;
			} else if (i === starScoreLimit.length - 1 && userStarScore >= limit[0]) {
				finalStar = i;
				break;
			}
		}

		const user = await User.findByPk(userId);
		const oldUserStars = user.stars;
		user.stars = finalStar;
		await user.save();

		if (oldUserStars !== finalStar) {
			if (oldUserStars > finalStar) {
				await Message.create({
					userId: userId,
					title: `متاسفانه از ستاره های شما ${
						oldUserStars - finalStar
					} ستاره کاسته شد`,
					description: `
						<p>متاسفانه از ستاره های شما ${oldUserStars - finalStar} ستاره کاسته شده است</p>
						<p>می توانید علت این کاهش را در صفحه امتیازات عملی خود بررسی کنید و با انجام فعالیت های  بیشتر و کسب امتیاز، تعداد ستاره های خود را افزایش دهید</p>
						<p>موفق و پیروز باشید</p>
						`,
				});

				/* sending notification */
				const notificationPayload = notification_payload_generator(
					`${oldUserStars - finalStar} ستاره از شما کم شد`,
					`متاسفانه تعداد ${
						oldUserStars - finalStar
					}ستاره از حساب شما کاسته شد. جهت بررسی کلیک کنید`,
					null,
					{
						type: VIEWS.profile_view,
						title: "پروفایل کاربری",
					},
					"#000",
					"#fff"
				);
				sendNotification_OneUser(userId, notificationPayload);
			}
			if (oldUserStars < finalStar) {
				await Message.create({
					userId: userId,
					title: `تبریک! شما موفق به کسب ${
						finalStar - oldUserStars
					} ستاره دیگر شدید`,
					description: `<p>به شما بابت کسب ${finalStar - oldUserStars} ستاره تبریک می گوییم</p><p>موفق و پیروز باشید 😎</p>`,
				});

				/* sending notification */
				const notificationPayload = notification_payload_generator(
					`${finalStar - oldUserStars} ستاره به شما اضافه شد`,
					`تبریک! تعداد ${
						finalStar - oldUserStars
					}ستاره به حساب شما اضافه شد. جهت بررسی کلیک کنید`,
					null,
					{
						type: VIEWS.profile_view,
						title: "پروفایل کاربری",
					},
					"#000",
					"#fff"
				);
				sendNotification_OneUser(userId, notificationPayload);
			}

			/* notification management part */
			if (oldUserStars !== 0) {
				unsubscribeUserFromTopic(
					userId,
					notification_topics[`Star${oldUserStars}`]
				);
			}
			if (finalStar !== 0) {
				subscribeUserToTopic(userId, notification_topics[`Star${finalStar}`]);
			}
		}
	} catch (err) {
		console.log("update user stars got error ------>");
		console.log(err);
	}
};

exports.lessonVideoScore = async (user, lessonId) => {
	/* ========= Start Configuration ========= */
	/* ignore time in ms from end of video */
	const ignorePercentage = 20;
	/* =========  End Configuration  ========= */

	try {
		const lesson = await Lesson.findByPk(lessonId);
		const thisUserLesson = await User_Lesson.findOne({
			where: { userId: user.id, lessonId: lessonId },
		});

		if (!thisUserLesson || thisUserLesson.done) {
			return {
				result: false,
				totalWatch: 0,
			};
		}

		/* calculating total video time in miliseconds */
		let lessonVideoTimeToMS = 0;
		const lessonVideoTimeArray = lesson.video_time.split(/:/g);
		for (let i = 0; i < lessonVideoTimeArray.length; i++) {
			if (lessonVideoTimeArray.length === 2) {
				/* in case that we only got minutes and seconds */
				switch (i) {
					case 0:
						/* minutes */
						const min = +lessonVideoTimeArray[i];
						lessonVideoTimeToMS += min * 60 * 1000;
						break;
					case 1:
						/* seconds */
						const sec = +lessonVideoTimeArray[i];
						lessonVideoTimeToMS += sec * 1000;
						break;
				}
			} else if (lessonVideoTimeArray.length === 3) {
				/* in case that we got hours, minutes and seconds */
				switch (i) {
					case 0:
						/* hours */
						const hour = +lessonVideoTimeArray[i];
						lessonVideoTimeToMS += hour * 60 * 60 * 1000;
						break;
					case 1:
						/* minutes */
						const min = +lessonVideoTimeArray[i];
						lessonVideoTimeToMS += min * 60 * 1000;
						break;
					case 2:
						/* seconds */
						const sec = +lessonVideoTimeArray[i];
						lessonVideoTimeToMS += sec * 1000;
						break;
				}
			}
		}

		const userLessonVideoLogs = await LessonVideoLog.findAll({
			where: { userId: user.id, lessonId: lessonId, has_seek: false },
			order: [["video_start_time", "ASC"]],
		});

		const videoLogs = [];
		/* action due to formatting userLessonVideoLogs for use */
		for (let i = 0; i < userLessonVideoLogs.length; i++) {
			const thisLog = userLessonVideoLogs[i];
			const videoLog = {
				id: thisLog.id,
				start_time: thisLog.start_time,
				stop_time: thisLog.stop_time,
				video_start_time: thisLog.video_start_time,
				video_stop_time: thisLog.video_stop_time,
				/* new field */
				ignoreTimes: [] /* { igStart: Number, igStop: Number }[] */,
				ignore: false /* use when video become unusable to ignore this log */,
			};
			videoLogs.push(videoLog);
		}

		/* calculating ignoreTimes on each log block */
		for (let i = 0; i < videoLogs.length; i++) {
			const mainLog = videoLogs[i];
			/* compare other remained logs to this mainLog */
			for (let j = i + 1; j < videoLogs.length; j++) {
				const thisLog = videoLogs[j];
				let igStart, igStop;
				/* defining igStart */
				if (
					mainLog.video_start_time <= thisLog.video_start_time &&
					thisLog.video_start_time < mainLog.video_stop_time
				) {
					igStart = thisLog.video_start_time;
				}
				/* defining igStop */
				if (
					thisLog.video_start_time < mainLog.video_stop_time &&
					mainLog.video_stop_time <= thisLog.video_stop_time
				) {
					igStop = mainLog.video_stop_time;
				} else if (mainLog.video_stop_time >= thisLog.video_stop_time) {
					igStop = thisLog.video_stop_time;
				}

				if (igStart !== undefined && igStop !== undefined) {
					const ignoreTime = {
						igStart: igStart,
						igStop: igStop,
					};
					thisLog.ignoreTimes.push(ignoreTime);
					videoLogs[j] = thisLog;
				}
			}
		}

		/* cleaning logs */
		for (let i = 0; i < videoLogs.length; i++) {
			const thisLog = videoLogs[i];
			const igTimes = thisLog.ignoreTimes;

			/* in case that no ignore time exist */
			if (igTimes.length === 0) {
				continue;
			}

			let finalIGStop;
			let finalIGStart; /* no need but for algorithm clearance */

			const allIGStops = [];
			for (let j in igTimes) {
				allIGStops.push(igTimes[j].igStop);
			}

			finalIGStop = Math.max(...allIGStops);
			/* due to using order in select data from database,
			   always finalIGStart in all igTimes is same */
			finalIGStart = igTimes[0].igStart;

			/* correct video log to use */
			thisLog.video_start_time = finalIGStop;
			if (thisLog.video_start_time === thisLog.video_stop_time) {
				thisLog.ignore = true;
			}
			videoLogs[i] = thisLog;
		}

		/* to extract only usable video logs and sort them by video_start_time */
		const correctedVideoLogs = videoLogs
			.filter((el) => el.ignore === false)
			.sort((a, b) => a.video_start_time - b.video_start_time);

		/* main task */
		let userFinishedVideo = false;

		/* calculating remain video time base on ignorePercentage */
		const remainVideoTime = Math.floor(
			((100 - ignorePercentage) / 100) * lessonVideoTimeToMS
		);

		let totalUserWatchTime = 0;

		for (let i = 0; i < correctedVideoLogs.length; i++) {
			const thisLog = correctedVideoLogs[i];

			totalUserWatchTime += thisLog.video_stop_time - thisLog.video_start_time;
		}

		/* check if user spend least non-repeated time in video */
		if (totalUserWatchTime >= remainVideoTime) {
			userFinishedVideo = true;
		}

		if (userFinishedVideo) {
			thisUserLesson.user_video_score = lesson.lesson_video_score;

			/* in case that other dependencies of this lesson completed (check),
			   we should turn that lesson done :) */
			if (
				thisUserLesson.user_interactive_score >= lesson.lesson_interactive_score
			) {
				thisUserLesson.done = true;
			}
			await thisUserLesson.save();

			await Score.create({
				score: lesson.lesson_video_score,
				field: "lesson_video",
				element_id: lesson.id,
				userId: user.id,
			});

			/* for updating user stars */
			userStarUpdater(user.id);

			/* find course from lesson's id */
			const thisLessonCourse = await findCourseFromLesson(lesson.id);

			/* notification management part */
			const notificationPayload = notification_payload_generator(
				`کسب امتیاز ویدئو ${lesson.title}`,
				"شما موفق به کسب امتیاز ویدئویی این دوره شدید",
				null,
				{
					id: thisLessonCourse.id,
					type: VIEWS.course_status_view,
					title: thisLessonCourse.title,
				},
				"#000",
				"#fff"
			);

			sendNotification_OneUser(user.id, notificationPayload);

			return {
				result: true,
				totalWatch: totalUserWatchTime,
			};
		}

		/* in case that user did not watch video completely */
		return {
			result: false,
			totalWatch: totalUserWatchTime,
		};
	} catch (err) {
		console.log(
			"-----------------\n    !! set lesson video score got problem\n-----------------"
		);
		console.log(err);
	}
};

/**
 * For handling user interactive score recording
 * @param {Object} user user object
 * @param {Number} lessonId lesson id
 * @param {Number} score score that should recorded on user score list
 */
exports.lessonInteractiveScore = async (user, lessonId, score) => {
	/* notification should add later */
	try {
		const lesson = await Lesson.findByPk(lessonId);
		const thisUserLesson = await User_Lesson.findOne({
			where: { userId: user.id, lessonId: lessonId },
		});

		if (!thisUserLesson) {
			return 0;
		}

		if (score === 0 || thisUserLesson.done) {
			return 0;
		}
		console.log("updating user interactive score ->", score);
		thisUserLesson.user_interactive_score =
			thisUserLesson.user_interactive_score + score;
		const updatedUserLesson = await thisUserLesson.save();

		await Score.create({
			score: score,
			field: "lesson_interactive",
			element_id: lesson.id,
			userId: user.id,
		});

		/* in case that other dependencies of this lesson completed (check),
			   we should turn that lesson done :) */
		if (
			updatedUserLesson.user_video_score >= lesson.lesson_video_score &&
			updatedUserLesson.user_interactive_score >=
				lesson.lesson_interactive_score
		) {
			updatedUserLesson.done = true;
			await updatedUserLesson.save();
		}

		/* for updating user stars */
		userStarUpdater(user.id);

		/* find course from lesson's id */
		const thisLessonCourse = await findCourseFromLesson(lesson.id);

		/* notification management part */
		const notificationPayload = notification_payload_generator(
			"کسب امتیاز برای آموزش تعاملی",
			`${score} امتیاز آموزش تعاملی برای شما ثبت شد`,
			null,
			{
				id: thisLessonCourse.id,
				type: VIEWS.course_status_view,
				title: thisLessonCourse.title,
			},
			"#000",
			"#fff"
		);
		sendNotification_OneUser(user.id, notificationPayload);

		return true;
	} catch (err) {
		console.log(
			"-----------------\n    !! set lesson interactive score got problem\n-----------------"
		);
		console.log(err);
	}
};
//
exports.commentScore = async (user, comment) => {
	/* ========= Start Configuration ========= */
	/* score for commentting */
	const commentScore = 1;
	const commentReplyScore = 2;
	/* =========  End Configuration  ========= */

	let finalScore = 0;

	try {
		/* set record for comments */
		if (comment.parent_id) {
			await Score.create({
				userId: user.id,
				field: "lesson_commenting",
				score: commentReplyScore,
				element_id: comment.id,
			});

			finalScore = commentReplyScore;
		} else {
			await Score.create({
				userId: user.id,
				field: "lesson_commenting",
				score: commentScore,
				element_id: comment.id,
			});

			finalScore = commentScore;
		}

		const lesson = await Lesson.findByPk(comment.lessonId);

		/* for updating user stars */
		userStarUpdater(user.id);

		/* notification management part */
		const notificationPayload = notification_payload_generator(
			"کسب امتیاز برای نوشتن نظر",
			`شما برای نوشتن نظر، ${finalScore} امتیاز کسب کردید`,
			null,
			{
				type: VIEWS.score_history_view,
				title: "امتیاز علمی",
			},
			"#000",
			"#fff"
		);
		sendNotification_OneUser(user.id, notificationPayload);
	} catch (err) {
		console.log(
			"-----------------\n    !! set comment score got problem\n-----------------"
		);
		console.log(err);
	}
};
//
exports.commentReactionScore = async (
	reaction,
	comment,
	repeatAction,
	user
) => {
	/* ========= Start Configuration ========= */
	/* score for commentting */
	const likeReactionScore = 3;
	const dislikeReactionScore = 3; /* NEGATIVE */
	/* reaction schema */
	const REACTION_SCHEMA = {
		like: "LIKE",
		dislike: "DISLIKE",
	};
	/* like radio */
	const likeRadioScore = 2;
	/* dislike radio */
	const dislikeRadioScore = 1;
	/* =========  End Configuration  ========= */

	try {
		const lesson = await Lesson.findByPk(comment.lessonId);

		if (reaction === REACTION_SCHEMA.like) {
			/* update comment score */
			const commentScore = comment.score;
			comment.score = commentScore + likeRadioScore;
			await comment.save();

			for (let i = 0; i < repeatAction; i++) {
				await Score.create({
					userId: comment.userId,
					field: "user_comment_like",
					score: likeReactionScore,
					element_id: comment.id,
				});
			}

			/* for updating user stars */
			userStarUpdater(comment.userId);

			if (comment.userId !== user.id) {
				const notificationPayload = notification_payload_generator(
					"نظر شما مورد پسند قرار گرفت",
					"جهت مشاهده کلیک کنید",
					null,
					{
						type: VIEWS.score_history_view,
						title: "امتیاز علمی",
					},
					"#000",
					"#fff"
				);

				sendNotification_OneUser(comment.userId, notificationPayload);
			}
		} else if (reaction === REACTION_SCHEMA.dislike) {
			/* update comment score */
			const commentScore = comment.score;
			comment.score = commentScore - dislikeRadioScore;
			await comment.save();

			for (let i = 0; i < repeatAction; i++) {
				await Score.create({
					userId: comment.userId,
					field: "user_comment_dislike",
					score: dislikeReactionScore,
					element_id: comment.id,
					negative: true,
				});
			}

			/* for updating user stars */
			userStarUpdater(comment.userId);

			if (comment.userId !== user.id) {
				const notificationPayload = notification_payload_generator(
					"یک مخالفت با نظر شما ثبت شد",
					"جهت مشاهده کلیک کنید",
					null,
					{
						type: VIEWS.score_history_view,
						title: "امتیاز علمی",
					},
					"#000",
					"#fff"
				);

				sendNotification_OneUser(comment.userId, notificationPayload);
			}
		}
	} catch (err) {
		console.log(
			"-----------------\n    !! set comment score got problem\n-----------------"
		);
		console.log(err);
	}
};
//
exports.inviteCodeScore = {
	___sample_code_for_delete_network_record___should_not_use_in_client_code:
		async (id) => {
			try {
				/* find the record */
				const networkRecord = await Network.findByPk(id);
				/* get guest_id of requested record */
				const networkGuestId = networkRecord.guest_id;
				/* delete record itself */
				await networkRecord.destroy();

				/* find related records base on matched guest_id */
				const network_related_records = await Network.findAll({
					where: { guest_id: networkGuestId },
				});
				for (let i in network_related_records) {
					/* delete related record due to guest_id */
					const record = network_related_records[i];
					await record.destroy();
				}
			} catch (err) {
				console.log(err);
			}
		},
	checkInviteCodeIsUsable: async (code, newUserDevice) => {
		/* ========= Start Configuration ========= */
		/* network limit record */
		const networkRecordLimit = 5;
		/* =========  End Configuration  ========= */

		try {
			const codePattern = /^\S{1,}$/;
			if (!code.trim().match(codePattern)) {
				return {
					result: false,
					message: "کد وارد شده معتبر نیست",
				};
			}

			const parent = await User.findOne({ where: { invite_code: code } });
			if (!parent) {
				console.log("no user with this invite code exist");
				return {
					result: false,
					message: "کد وارد شده معتبر نیست",
				};
			}

			/* check for not repeated device */
			const allParentDevices = await UserDevice.findAll({
				where: { userId: parent.id },
			});
			for (let i in allParentDevices) {
				if (newUserDevice.device_uuid === allParentDevices[i].device_uuid) {
					console.log("device exsist");
					return {
						result: false,
						message: "کد معرف غیر قابل استفاده است",
					};
				}
			}

			const parentNetworkLVL1 = await Network.findAll({
				where: {
					userId: parent.id,
					level: "1",
				},
				order: [["createdAt", "DESC"]],
			});
			if (parentNetworkLVL1.length > networkRecordLimit) {
				return {
					result: false,
					message: "کد معرف غیر قابل استفاده است",
				};
			}
			if (parentNetworkLVL1.length === networkRecordLimit) {
				/* in this case, if user get all his/her records in 1 week, this network score happen */
				const weekInMS = 7 * 24 * 60 * 60 * 1000;

				const timePeriod =
					parentNetworkLVL1[0].createdAt -
					parentNetworkLVL1[networkRecordLimit - 1].createdAt;
				if (timePeriod > weekInMS) {
					return {
						result: false,
						message: "کد معرف غیر قابل استفاده است",
					};
				}
			}

			return {
				result: true,
				parent: parent,
			};
		} catch (err) {
			console.log(err);
			return {
				result: false,
				message: "کد وارد شده معتبر نیست",
			};
		}
	},
	executeNetworkScoreProcess: async (user, parent) => {
		/* ========= Start Configuration ========= */
		/* scores */
		const levelScores = [
			{ score: 80, level: "یک" },
			{ score: 40, level: "دو" },
			{ score: 20, level: "سه" },
			{ score: 10, level: "چهار" },
		];
		/* gift payment for new user */
		const initialCreditForNewUser = 100000;
		/* =========  End Configuration  ========= */

		try {
			if (!parent) {
				console.log("no user with this invite code exist");
				throw "parent not sent to the fuction";
			}

			/* for store parents network record information in iterations */
			let parentChildren = {
				userId: parent.id,
			};

			for (let i = 0; i <= levelScores.length; i++) {
				/* For add record score for parent which has a limit in level one */
				if (i === 0) {
					/* add 100,000 Toman to new user wallet */
					await Wallet.create({
						amount: initialCreditForNewUser,
						description: "هدیه عضویت با کد دعوت",
						status: "1",
						action: "1",
						resource: "3",
						trace_code: "0000000-3",
						userId: user.id,
					});

					user.has_credit_gift = true;
					await user.save();

					/* add message for new user in message inbox */
					await Message.create({
						userId: user.id,
						title: "دریافت اعتبار به دلیل استفاده از کد معرف",
						description: `
						<h3>${user.username} عزیز، خوش آمدید</h3>
						<p>بابت ارائه کد معرف در زمان ثبت نام، صد هزار تومان اعتبار اولیه به حساب شما اضافه شد.</p>
						<p>موفق و پیروز باشید 😎</p>
						`,
					});

					/* notification for new user which useed invite_code on registeration */
					const notificationPayload = notification_payload_generator(
						"دریافت اعتبار",
						`مبلغ ${initialCreditForNewUser} تومان به اعتبار شما اضافه شد`,
						null,
						{
							type: VIEWS.credit_view,
							title: "اعتبار",
						},
						"#000",
						"#fff"
					);

					sendNotification_OneUser(user.id, notificationPayload);
				}
				/* add record for parent_(parent) * i */
				/* ---------------------------------- */
				let thisParent;
				if (i === 0) {
					thisParent = parentChildren;
				} else {
					thisParent = await Network.findOne({
						where: { guest_id: parentChildren.userId, level: "1" },
					});
				}
				/* If this level of parent not exist, loop must break */
				if (!thisParent) {
					break;
				}
				/* add network record to this parent by network's level */
				await Network.create({
					score: levelScores[i].score,
					guest_id: user.id,
					level: `${i + 1}`,
					userId: thisParent.userId,
				});

				/* for updating user stars */
				userStarUpdater(thisParent.userId);

				/* add message for each parent */
				await Message.create({
					userId: thisParent.userId,
					title: `${levelScores[i].score} امتیاز شبکه سازی برایتان ثبت شد`,
					description: `
						<p>${levelScores[i].score} امتیاز شبکه سازی در سطح ${levelScores[i].level} به دلیل عضویت کاربر جدید در شبکه شما ثبت گردید.</p>
						<p>موفق و پیروز باشید 😎</p>
						`,
				});

				const notificationPayload = notification_payload_generator(
					"افزایش امتیاز شبکه سازی",
					`شما ${levelScores[i].score} امتیاز شبکه سازی کسب کردید. جهت مشاهده کلیک کنید`,
					null,
					{
						type: VIEWS.network_view,
						title: "شبکه سازی",
					},
					"#000",
					"#fff"
				);

				sendNotification_OneUser(thisParent.userId, notificationPayload);

				/* replace thisParent on parentChilder */
				parentChildren = thisParent;
			}
		} catch (err) {
			console.log(err);
		}
	},
};

exports.courseFinalExamScore = async (course, user) => {
	try {
		await Score.create({
			userId: user.id,
			field: "course_final_exam",
			score: course.exam_score,
			element_id: course.id,
		});

		/* for updating user stars */
		userStarUpdater(user.id);

		const notificationPayload = notification_payload_generator(
			`کسب امتیاز آزمون برای دوره ${course.title}`,
			`${course.exam_score} امتیاز بابت قبولی در آزمون دوره ${course.title} به دست آوردید`,
			null,
			{
				type: VIEWS.course_view,
				title: course.title,
				id: course.id,
			},
			"#000",
			"#fff"
		);

		sendNotification_OneUser(user.id, notificationPayload);
	} catch (err) {
		console.log("\n handling course final exam score got problem \n");
		console.log(err);
	}
};

/* cronjob for updating monthly and yearly */
/**
 * 1- yearly and monthly rank base on its period score in user row
 * 2- reset user score to 0 on its period at the begining of the period
 */
exports.updateMonthlyAndYearlyRank = async (interval) => {
	if (!interval) {
		throw "interval did not send to the update monthly and yearly rank updater";
	}

	/* ========= Start Configuration ========= */
	/* score radioes */
	const network_score_radio = 1;
	const scientific_score_radio = 1;
	/* =========  End Configuration  ========= */

	setInterval(async () => {
		// setTimeout(async () => {
		const now = new Date();
		const nowToJalali = jalali.toJalaali(now);

		const beginDateOfYear = jalali.toGregorian(nowToJalali.jy, 1, 1);
		const endDateOfYear = jalali.toGregorian(
			nowToJalali.jy,
			12,
			jalali.jalaaliMonthLength(nowToJalali.jy, nowToJalali.jm)
		);

		const beginDateOfMonth = jalali.toGregorian(
			nowToJalali.jy,
			nowToJalali.jm,
			1
		);
		const endDateOfMonth = jalali.toGregorian(
			nowToJalali.jy,
			nowToJalali.jm,
			jalali.jalaaliMonthLength(nowToJalali.jy, nowToJalali.jm)
		);

		try {
			const userIdList = await User.findAll({
				attributes: [
					"id",
					"network_score",
					"scientific_score",
					"network_score_yearly",
					"scientific_score_yearly",
				],
			});

			console.log("updating network and scientific score started");
			for (let i in userIdList) {
				let NetworkScoreMonthly = 0;
				let NetworkScoreYearly = 0;
				let ScientificScoreMonthly = 0;
				let ScientificScoreYearly = 0;

				const userInformation = userIdList[i];

				const userYearlyScore = await Score.findAll({
					where: {
						userId: userInformation.id,
						createdAt: {
							[Op.between]: [
								new Date(
									`${beginDateOfYear.gy}-${beginDateOfYear.gm}-${beginDateOfYear.gd} UTC`
								),
								new Date(
									`${endDateOfYear.gy}-${endDateOfYear.gm}-${endDateOfYear.gd} UTC`
								),
							],
						},
					},
				});

				for (let j in userYearlyScore) {
					const score = userYearlyScore[j];
					if (score.negative) {
						ScientificScoreYearly -= score.score;
					} else {
						ScientificScoreYearly += score.score;
					}
				}

				const userYearlyNetworkScore = await Network.findAll({
					where: {
						userId: userInformation.id,
						createdAt: {
							[Op.between]: [
								new Date(
									`${beginDateOfYear.gy}-${beginDateOfYear.gm}-${beginDateOfYear.gd} UTC`
								),
								new Date(
									`${endDateOfYear.gy}-${endDateOfYear.gm}-${endDateOfYear.gd} UTC`
								),
							],
						},
					},
					attributes: ["score", "negative"],
				});

				for (let j in userYearlyNetworkScore) {
					const score = userYearlyNetworkScore[j];
					if (score.negative) {
						NetworkScoreYearly -= score.score;
					} else {
						NetworkScoreYearly += score.score;
					}
				}

				const userMonthlyScore = await Score.findAll({
					where: {
						userId: userInformation.id,
						createdAt: {
							[Op.between]: [
								new Date(
									`${beginDateOfMonth.gy}-${beginDateOfMonth.gm}-${beginDateOfMonth.gd} UTC`
								),
								new Date(
									`${endDateOfMonth.gy}-${endDateOfMonth.gm}-${endDateOfMonth.gd} UTC`
								),
							],
						},
					},
				});

				for (let j in userMonthlyScore) {
					const score = userMonthlyScore[j];
					if (score.negative) {
						ScientificScoreMonthly -= score.score;
					} else {
						ScientificScoreMonthly += score.score;
					}
				}

				const userMonthlyNetworkScore = await Network.findAll({
					where: {
						userId: userInformation.id,
						createdAt: {
							[Op.between]: [
								new Date(
									`${beginDateOfMonth.gy}-${beginDateOfMonth.gm}-${beginDateOfMonth.gd} UTC`
								),
								new Date(
									`${endDateOfMonth.gy}-${endDateOfMonth.gm}-${endDateOfMonth.gd} UTC`
								),
							],
						},
					},
					attributes: ["score", "negative"],
				});

				for (let j in userMonthlyNetworkScore) {
					const score = userYearlyNetworkScore[j];
					if (score.negative) {
						NetworkScoreMonthly -= score.score;
					} else {
						NetworkScoreMonthly += score.score;
					}
				}

				userInformation.network_score = NetworkScoreMonthly;
				userInformation.network_score_yearly = NetworkScoreYearly;
				userInformation.scientific_score = ScientificScoreMonthly;
				userInformation.scientific_score_yearly = ScientificScoreYearly;
				await userInformation.save();
			}
			console.log("updating network and scientific score ended");

			console.log("update ranking");

			await database.query(
				`UPDATE users SET yearly_rank = (@rownum := 1 + @rownum) WHERE 0 = (@rownum := 0) ORDER BY users.network_score_yearly * ${network_score_radio} + users.scientific_score_yearly * ${scientific_score_radio} DESC, createdAt ASC;`
			);
			await database.query(
				`UPDATE users SET monthly_rank = (@rownum := 1 + @rownum) WHERE 0 = (@rownum := 0) ORDER BY users.network_score * ${network_score_radio} + users.scientific_score * ${scientific_score_radio} DESC, createdAt ASC;`
			);

			console.log("update ranking finished");
		} catch (err) {
			console.log("update ranking got error --->>");
			console.log(err);
		}
	}, interval);
};
