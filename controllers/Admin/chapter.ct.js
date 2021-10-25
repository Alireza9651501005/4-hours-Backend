const jalaali = require("jalaali-js");
const Sequelize = require("sequelize");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");


const {
    Course,
    Chapter,
} = require("../../database/models");

const { convertPersianNumberToEnglish } = require("../../utils/input");
const MAIN_CONFIG = require("../../config/mainConfig");
const ResponseBuilder = require("../../utils/responseBuilder");
const requestValidator = require("../../utils/requestValidator"); // for validating requests efficiently

const CHAPTER_INFO = [
	"id",
	"title",
    "courseId",
	"createdAt",
	"updatedAt",
];

const chapterFormatter = (chapters) => {
	const final = [];

	for (let i = 0; i < chapters.length; i++) {
        // console.log(chapters[i]);
		const chapter = chapters[i];
		const createdAt = jalaali.toJalaali(chapter.createdAt);
		chapter.createdAt = `${createdAt.jy}/${createdAt.jm}/${createdAt.jd}`;

		if (!chapter.course) {
			const finalChapter = {...chapter.dataValues,};
			final.push(finalChapter);
		}else{
			const finalChapter = {
				...chapter.dataValues,
				courseId: chapter.course.id,
				courseTitle: chapter.course.title
			}
			console.log(finalChapter.courseId);
			final.push(finalChapter);
		}
	}
	return final;
};


/**
 * sending all chapters information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

 exports.getAllChapters = async(req, res, next) =>{
	const startFrom = req.query["_start"];
	const endFrom = req.query["_end"];
	const orderBy = req.query["_order"] || "ASC";
	const sortBy = req.query["_sort"];
	const all = req.query["_all"];
	// const stars = +req.query["stars"];
	const searchQuery = req.query["q"] || ""; 

	try {
		if(all){
			const allChapters = await Chapter.findAll();
			console.log(allChapters);
			res.set("X-Total-Count", allChapters.length);
			res.set("Access-Control-Expose-Headers", "X-Total-Count");

			return res.status(200).json(chapterFormatter(allChapters));
		}
		if(searchQuery !== ""){
			let thisChapters = [],
				allChapters = [];
			if(searchQuery !== ""){
				thisChapters = await Chapter.findAll({
					where: {
						[Op.or]: [
						  { "$course.title$": { [Op.startsWith]: searchQuery } },
						  { title: { [Op.startsWith]: searchQuery } },
						],
					  },
					  include: [
						{
						  as: 'course',
						  model: Course,
						  required: false,
						},
					  ],
					attributes: CHAPTER_INFO,
					order: [[sortBy, orderBy]],
					offset: +startFrom,
					limit: +endFrom - +startFrom,
				});

				allChapters = await Chapter.findAll({
					where: {
						[Op.or]: [
							{ "$course.title$": { [Op.startsWith]: searchQuery } },
							{ title: { [Op.startsWith]: searchQuery } },
						],
					  },
					  include: [
						{
						  as: 'course',
						  model: Course,
						  required: false,
						},
					  ],
				});
			}
			res.set("X-Total-Count", allChapters.length);
			res.set("Access-Control-Expose-Headers", "X-Total-Count");
			return res.status(200).json(chapterFormatter(thisChapters));	
		}
		const thisChapters = await Chapter.findAll({
			attributes: CHAPTER_INFO,
			order: [[sortBy, orderBy]],
			offset: +startFrom,
			limit: +endFrom - +startFrom,
            include:[Course],
		});

		const allChapters = await Chapter.findAll();

		res.set("X-Total-Count", allChapters.length);
		res.set("Access-Control-Expose-Headers", "X-Total-Count");

		return res.status(200).json(chapterFormatter(thisChapters));
	} catch (err) {
	console.log(err);
	res.status(500).json();
	}
 };

/**
 * getting chapter information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getOneChapter = async (req, res, next) => {
	const chapterId = req.params["chapterId"];

	try {
		const chapter = await Chapter.findOne({
			where: {
				id: chapterId,
			},
			attributes: CHAPTER_INFO,
			include:[Course],
		});

		if (!chapter) {
			return res.status(404).json();
		}

		return res.status(200).json(chapterFormatter([chapter])[0]);
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
};

 /**
 * creating  chapter
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

 exports.createChapter = async (req, res, next ) => {
	 const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const {
		title,
		courseId,
		// courseTitle
	} = req.body;

	try {
		// creating new chapter
		const newChapter = await Chapter.create({
			title: title,
			courseId: courseId,
			// courseTitle: courseTitle  THIS IS NEW COMMENT I CREATED
		});

		return res.status(201).json(newChapter.dataValues);
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
}

 exports.updateOneChapter = async (req, res, next) => {
	const chapterId = req.params["chapterId"];
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}
	const { 
		title,
		courseId,
	 } = req.body;

	 try {
		 console.log(courseId);
		 console.log(title);
		const chapter = await Chapter.findOne({
			where: {
				id: chapterId,
			},
			attributes: CHAPTER_INFO,
		});

		if (!chapter) {
			return res.status(404).json();
		}

		const hasAnotherChapterByThisInfo = await Chapter.findOne({
			where: Sequelize.and(Sequelize.or({ title,courseId }), {
				id: { [Op.ne]: Chapter.id },
			}),
		});

		if (hasAnotherChapterByThisInfo) {
			return res.status(422).json();
		}


		chapter.title = title;
		chapter.courseId = courseId;
		const updatedChapter = await chapter.save();

		return res.status(200).json(updatedChapter);
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
};

exports.deleteOneChapter = async (req, res, next) => {
	const chapterId = req.params["chapterId"];

	try {
		const chapter = await Chapter.findOne({
			where: {
				id: chapterId,
			},
			attributes: CHAPTER_INFO,
		});

		if (!chapter) {
			return res.status(404).json();
		}

		await chapter.destroy();
		/* do later */
		return res.status(200).json();
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
};
