const jalaali = require("jalaali-js");
const Sequelize = require("sequelize");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");


const {
    Chapter,
    Lesson
} = require("../../database/models");

const { convertPersianNumberToEnglish } = require("../../utils/input");
const MAIN_CONFIG = require("../../config/mainConfig");
const ResponseBuilder = require("../../utils/responseBuilder");
const requestValidator = require("../../utils/requestValidator"); // for validating requests efficiently

const LESSON_INFO = [
	"id",
	"title",
	"interactive_link",
    "chapterId",
    "video_id",
    "lesson_video_score",
    "lesson_interactive_score",
    "button_title_interactive",
    "window_title_interactive",
    "button_title_video",
    "likes",
    "total_hours",
    "video_time",
	"description",
	"total_hours",
	"createdAt",
];


const lessonFormatter = (lessons) => {
	const final = [];

	for (let i = 0; i < lessons.length; i++) {
		const lesson = lessons[i];
		const createdAt = jalaali.toJalaali(lesson.createdAt);
		lesson.createdAt = `${createdAt.jy}/${createdAt.jm}/${createdAt.jd}`;
        // final.push(lesson);
		if (!lesson.chapter) {
			continue;
		}

        const finalLesson = {
            ...lesson.dataValues,
            chapterId: lesson.chapter.id,
            chapterTitle: lesson.chapter.title
        }
		final.push(finalLesson);
	}
	return final;
};


/**
 * sending all lessons information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

 exports.getAllLessons = async(req, res, next) =>{
	const startFrom = req.query["_start"];
	const endFrom = req.query["_end"];
	const orderBy = req.query["_order"] || "ASC";
	const sortBy = req.query["_sort"];
	const all = req.query["_all"];
	// const stars = +req.query["stars"];
	const searchQuery = req.query["q"] || ""; 

	const id = req.query.id;
	try {
		if(id && id.length > 0){
			const lessons = []
			for (let i = 0; i < id.length; i++) {
				const lessonId = id[i];
				const lesson = await Lesson.findOne({
					where:{
						id:lessonId,
					}
				})
				lessons.push(lesson)
			}
			return res.status(200).json(lessonFormatter(lessons));
		}
		if(all){
			const allLessons = await Lesson.findAll();
			res.set("X-Total-Count", allLessons.length);
			res.set("Access-Control-Expose-Headers", "X-Total-Count");

			return res.status(200).json(lessonFormatter(allLessons));
		}
		if(searchQuery !== ""){
			let thisLessons = [],
                allLessons = [];
			if(searchQuery !== ""){
				thisLessons = await Lesson.findAll({
					where: {
						[Op.and]: [
							{
								[Op.or]: [
									{ likes: { [Op.like]: searchQuery } },
									{ title: { [Op.startsWith]: searchQuery } },
								],
							},
						],
					},
                    include:[Chapter],
					attributes: LESSON_INFO,
					order: [[sortBy, orderBy]],
					offset: +startFrom,
					limit: +endFrom - +startFrom,
				});

				allLessons = await Lesson.findAll({
					where: {
						[Op.and]: [
							{
								[Op.or]: [
									{ likes: { [Op.like]: searchQuery } },
									{ title: { [Op.startsWith]: searchQuery } },
								],
							},
						],
					},
				});
			}

			res.set("X-Total-Count", allLessons.length);
			res.set("Access-Control-Expose-Headers", "X-Total-Count");
			return res.status(200).json(lessonFormatter(thisLessons));
		}
		const thisLessons = await Lesson.findAll({
			attributes: LESSON_INFO,
			order: [[sortBy, orderBy]],
			offset: +startFrom,
			limit: +endFrom - +startFrom,
            include:[Chapter],
		});

		const allLessons = await Lesson.findAll();


		res.set("X-Total-Count", allLessons.length);
		res.set("Access-Control-Expose-Headers", "X-Total-Count");

		return res.status(200).json(lessonFormatter(thisLessons));
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
 };

/**
 * getting course information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getOneLesson = async (req, res, next) => {
	const lessonId = req.params["lessonId"];

	try {
		const lesson = await Lesson.findOne({
			where: {
				id: lessonId,
			},
			attributes: LESSON_INFO,
            include:[Chapter],

		});

		if (!lesson) {
			return res.status(404).json();
		}

		return res.status(200).json(lessonFormatter([lesson])[0]);
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
};

 /**
 * creating  Lesson
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

 exports.createLesson = async (req, res, next ) => {
	 const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}


	const {
        title,
        interactive_link,
        chapterId,
        video_id,
        lesson_video_score,
        lesson_interactive_score,
        button_title_interactive,
        button_title_video,
        window_title_interactive,
        likes,
        total_hours,
        video_time,
        description,
	} = req.body;

	try {
		// creating new lesson
		const newLesson = await Lesson.create({
			title: title,
			interactive_link: interactive_link,
			chapterId: chapterId,
			video_id: video_id,
			lesson_video_score: lesson_video_score,
			lesson_interactive_score: lesson_interactive_score,
			button_title_interactive: button_title_interactive,
			button_title_video: button_title_video,
			window_title_interactive: window_title_interactive,
			likes: likes,
			total_hours: total_hours,
			video_time: video_time,
			total_hours: total_hours,
			description: description,
		});

		return res.status(201).json(newLesson.dataValues);
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
 }

 exports.updateOneLesson = async (req, res, next) => {
	const lessonId = req.params["lessonId"];
	const {
		title,
        interactive_link,
        chapterId,
        video_id,
        lesson_video_score,
        lesson_interactive_score,
        button_title_interactive,
        button_title_video,
        window_title_interactive,
        likes,
        total_hours,
        video_time,
        description,
	 } = req.body;

	 try {
		const lesson = await Lesson.findOne({
			where: {
				id: lessonId,
			},
			attributes: LESSON_INFO,
		});

		console.log(lesson);

		if (!lesson) {
			return res.status(404).json();
		}

		lesson.title = title;
		lesson.interactive_link = interactive_link;
		lesson.chapterId = chapterId;
		lesson.video_id = video_id;
		lesson.lesson_video_score = lesson_video_score;
		lesson.lesson_interactive_score = lesson_interactive_score;
		lesson.button_title_interactive = button_title_interactive;
		lesson.button_title_video = button_title_video;
		lesson.window_title_interactive = window_title_interactive;
		lesson.likes = likes;
		lesson.total_hours = total_hours;
		lesson.video_time = video_time;
		lesson.description = description;
		const updatedLesson = await lesson.save();

		return res.status(200).json(updatedLesson);
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
};
exports.deleteOneLesson = async (req, res, next) => {
	const lessonId = req.params["lessonId"];

	try {
		const lesson = await Lesson.findOne({
			where: {
				id: lessonId,
			},
			attributes: LESSON_INFO,
		});

		if (!lesson) {
			return res.status(404).json();
		}

		await lesson.destroy();
		/* do later */
		return res.status(200).json();
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
};
