const jalali = require("jalaali-js");

const {
	User,
	Lesson,
	Chapter,
	Course,
	User_Lesson,
	User_Course,
	LessonVideoLog,
	Score,
	Network,
	Wallet,
	UserDevice,
	Message,
} = require("../database/models");
const MAIN_CONFIG = require("../config/mainConfig");

/**
 * Find course from lessonId
 * @param {Number} lessonId
 */
exports.findCourseFromLesson = async (lessonId) => {
	try {
		const lesson = await Lesson.findOne({
			where: { id: lessonId },
			include: [Course],
		});
		const course = await Course.findOne({
			where: { id: lesson.course.id },
		});
		return course;
	} catch (err) {
		console.log("finding course from lesson got error ->");
		console.log(err);
		return false;
	}
};

/**
 * For generating a code to verify user's phone number
 */
exports.generatePhoneNumberCode = () => {
	const codeLength = MAIN_CONFIG.phone_number_verification_code_length;
	let code = "";
	const characters = "0123456789";
	for (let i = 1; i <= codeLength; i++) {
		code += characters[Math.round(Math.random() * (characters.length - 1))];
	}
	return code;
};

/**
 * For managing that user have access to this course or not
 * @param {User} user user object
 * @param {Number} courseId course id
 */
exports.userOwnedCourse = async (user) => {
	if (user) {
		return user.isCostumer;
	}
	return false;
};

/**
 * For checking that input is email or phone number
 * @param {String} input input value that should check that is email or phone number
 * @returns 1 => input is email, 2 => input is phone number, 0 => isn't email or phone number
 */
 exports.checkIsEmailOrPhone = (input) => {
	if (input.trim().match(/^\S{1,}@\S{1,}\.\S{1,}$/g)) {
		return 1;
	}
	if (input.trim().match(/^0[0-9]{10}$/g)) {
		return 2;
	}
	return 0;
};

/**
 * For guarding lesson info against unowned users
 * @param {User} user
 * @param {Number} lessonId
 */
exports.lessonInfoGuard = async (user, lessonId) => {
	const lesson = await Lesson.findByPk(lessonId);
	if(!user){
		user={}
	}
	if (user.isCostumer || lesson.is_free) {
		return true;
	} else {
		return false;
	}
};

/**
 * For calculating duration to readable time format
 * @param {Number} duration
 */
exports.msToTime = (duration) => {
	let milliseconds = parseInt((duration % 1000) / 100),
		seconds = Math.floor((duration / 1000) % 60),
		minutes = Math.floor((duration / (1000 * 60)) % 60),
		hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

	hours = hours < 10 ? "0" + hours : hours;
	minutes = minutes < 10 ? "0" + minutes : minutes;
	seconds = seconds < 10 ? "0" + seconds : seconds;

	return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
};

/**
 * For converting jalali month to Persian string
 * @param {Number} monthNumber
 */
exports.convertJalaliMonthToPersian = (monthNumber) => {
	let month = "";
	/* convert numeric jalali month to word */
	switch (monthNumber) {
		case 1:
			month = "فروردین";
			break;
		case 2:
			month = "اردیبهشت";
			break;
		case 3:
			month = "خرداد";
			break;
		case 4:
			month = "تیر";
			break;
		case 5:
			month = "مرداد";
			break;
		case 6:
			month = "شهریور";
			break;
		case 7:
			month = "مهر";
			break;
		case 8:
			month = "آبان";
			break;
		case 9:
			month = "آذر";
			break;
		case 10:
			month = "دی";
			break;
		case 11:
			month = "بهمن";
			break;
		case 12:
			month = "اسفند";
			break;
	}

	return month;
};

/**
 * For calculating and finding course status
 * @param {User} user user full object
 * @param {Number} courseId
 */
exports.calculatingCourseStatus = async (user, courseId) => {
	try {
		const course = await Course.findByPk(courseId);
		const courseChapters = await course.getChapters();
		const thisUserCourse = await User_Course.findOne({
			where: { courseId: course.id, userId: user.id },
		});

		let totalCourseInteractiveScores = 0;
		let totalCourseVideoScores = 0;
		let userAllInteractiveScores = 0;
		let userAllVideoScores = 0;
		let doneLessons = 0;
		let allLessons = 0;
		let userCourseExamScore = thisUserCourse.done ? course.exam_score : 0;

		let firstChapter = courseChapters[0];
		let firstLesson;

		let lastActivityDate = 0;
		let lastLesson;
		let lastChapter;

		/* counting all lessons scores */
		for (let i in courseChapters) {
			const chapter = courseChapters[i];
			/* get all chapter's lessons */
			const chapterLessons = await chapter.getLessons();
			if (firstChapter.id === chapter.id) {
				firstLesson = chapterLessons[0];
			}
			for (let j in chapterLessons) {
				allLessons++;
				const lesson = chapterLessons[j];
				totalCourseInteractiveScores += lesson.lesson_interactive_score;
				totalCourseVideoScores += lesson.lesson_video_score;

				const userLessonsHistory = await User_Lesson.findOne({
					where: { lessonId: lesson.id, userId: user.id },
				});

				if (userLessonsHistory) {
					/* counting all done lessons */
					if (userLessonsHistory.done) {
						doneLessons++;
					}
					userAllInteractiveScores += userLessonsHistory.user_interactive_score;
					userAllVideoScores += userLessonsHistory.user_video_score;

					if (lastActivityDate < userLessonsHistory.updatedAt) {
						lastActivityDate = userLessonsHistory.updatedAt;
						lastLesson = userLessonsHistory;
						lastChapter = chapter;
					}
				}
			}
		}

		/* calculating user's course progress percentage */
		const progressPercentage = Math.floor(
			((userAllInteractiveScores + userAllVideoScores + userCourseExamScore) /
				(totalCourseInteractiveScores +
					totalCourseVideoScores +
					course.exam_score)) *
				100
		);

		const startDate = jalali.toJalaali(thisUserCourse.createdAt);
		const startDateString = `${startDate.jy}/${startDate.jm}/${startDate.jd}`;

		const lastActivity_date = jalali.toJalaali(lastActivityDate === 0 ? thisUserCourse.createdAt : lastActivityDate);
		const lastActivityDateString = `${lastActivity_date.jy}/${lastActivity_date.jm}/${lastActivity_date.jd}`;

		/* find all last lesson information */
		let thisLesson;
		if (lastLesson) {
			thisLesson = await Lesson.findByPk(lastLesson.lessonId);
		} else {
			thisLesson = firstLesson;
		}

		/* for controlling the active mode of course exam button if course had exam */
		const courseHasExam = course.has_exam;
		let activeCourseExam = false;
		if (courseHasExam) {
			const ignoreCourseCount = 1;
			const courseExamLimit = allLessons - ignoreCourseCount;
			if (courseExamLimit <= 0) {
				/* this course only got one or less than one lesson */
				if (doneLessons === ignoreCourseCount) {
					activeCourseExam = true;
				}
			} else if (doneLessons >= courseExamLimit) {
				activeCourseExam = true;
			}
		}

		return {
			total_course_interactive_scores: totalCourseInteractiveScores,
			total_course_video_scores: totalCourseVideoScores,
			total_user_interactive_scores: userAllInteractiveScores,
			total_user_video_scores: totalCourseVideoScores,
			progress_percentage: progressPercentage
				? progressPercentage >= 100
					? 100
					: progressPercentage
				: 0,
			all_lessons: allLessons,
			done_lessons: doneLessons,
			last_activity_date: lastActivityDateString,
			last_activity: lastActivityDate,
			user_course: thisUserCourse,
			start_date_string: startDateString,
			last_lesson: {
				chapter_title: lastChapter ? lastChapter.title : firstChapter.title,
				lesson_title: thisLesson.title,
				lesson_id: thisLesson.id,
			},
			course_has_exam: courseHasExam,
			active_course_exam: activeCourseExam,
		};
	} catch (err) {
		console.log("error happen in calculating course status");
		console.log(err);
	}
};
