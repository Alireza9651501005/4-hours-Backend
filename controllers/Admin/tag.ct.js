const jalaali = require("jalaali-js");
const Sequelize = require("sequelize");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");


const {
    Tag,
} = require("../../database/models");

const { convertPersianNumberToEnglish } = require("../../utils/input");
const MAIN_CONFIG = require("../../config/mainConfig");
const ResponseBuilder = require("../../utils/responseBuilder");
const requestValidator = require("../../utils/requestValidator"); // for validating requests efficiently

const TAG_INFO = [
	"id",
	"name",
	"createdAt",
];


const tagFormatter = (tags) => {
	const final = [];

	for (let i = 0; i < tags.length; i++) {
		const tag = tags[i];
		const createdAt = jalaali.toJalaali(tag.createdAt);
		tag.createdAt = `${createdAt.jy}/${createdAt.jm}/${createdAt.jd}`;
        const finalTag = {
            ...tag.dataValues,
        }
		final.push(finalTag);
	}
	return final;
};


/**
 * sending all tags information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

 exports.getAllTags = async(req, res, next) =>{
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
			const tags = []
			for (let i = 0; i < id.length; i++) {
				const tagId = id[i];
				const tag = await Tag.findOne({
					where:{
						id:tagId,
					}
				})
				tags.push(tag)
			}
			return res.status(200).json(tagFormatter(tags));
		}
		if(all){
			const allTags = await Tag.findAll();
			res.set("X-Total-Count", allTags.length);
			res.set("Access-Control-Expose-Headers", "X-Total-Count");

			return res.status(200).json(dis(allTags));
		}
		if(searchQuery !== ""){
			let thisTags = [],
                 allTags = [];
			if(searchQuery !== ""){
				thisTags = await Tag.findAll({
					where: {
						[Op.and]: [
							{
								[Op.or]: [
									{ name: { [Op.startsWith]: searchQuery } },
								],
							},
						],
					},
					attributes: TAG_INFO,
					order: [[sortBy, orderBy]],
					offset: +startFrom,
					limit: +endFrom - +startFrom,
				});

				allTags = await Tag.findAll({
					where: {
						[Op.and]: [
							{
								[Op.or]: [
									{ name: { [Op.startsWith]: searchQuery } },
								],
							},
						],
					},
				});
			}

			res.set("X-Total-Count", allTags.length);
			res.set("Access-Control-Expose-Headers", "X-Total-Count");
			return res.status(200).json(tagFormatter(thisTags));
		}
		const thisTags = await Tag.findAll({
			attributes: TAG_INFO,
			order: [[sortBy, orderBy]],
			offset: +startFrom,
			limit: +endFrom - +startFrom,
		});

		const allTags = await Tag.findAll();


		res.set("X-Total-Count", allTags.length);
		res.set("Access-Control-Expose-Headers", "X-Total-Count");

		return res.status(200).json(tagFormatter(thisTags));
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
 };

/**
 * getting tags information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getOneTag = async (req, res, next) => {
	const tagId = req.params["tagId"];

	try {
		const tag = await Tag.findOne({
			where: {
				id: tagId,
			},
			attributes: TAG_INFO,
		});

		if (!tag) {
			return res.status(404).json();
		}

		return res.status(200).json(tagFormatter([tag])[0]);
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
};

 /**
 * creating  tag
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

 exports.createTag = async (req, res, next ) => {
	 const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}


	const {
        name,
	} = req.body;

	try {
		// creating new tag
		const newTag = await Tag.create({
			name: name,
		});

		return res.status(201).json(newTag.dataValues);
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
 }

 exports.updateOneTag = async (req, res, next) => {
	const tagId = req.params["tagId"];
	const {
        name,
	} = req.body;
	 try {
		const tag = await Tag.findOne({
			where: {
				id: tagId,
			},
			attributes: TAG_INFO,
		});

		if (!tag) {
			return res.status(404).json();
		}

		tag.name = name;
		const updatedtag = await tag.save();

		return res.status(200).json(updatedtag);
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
};
exports.deleteOneTag = async (req, res, next) => {
	const tagId = req.params["tagId"];

	try {
		const tag = await Tag.findOne({
			where: {
				id: tagId,
			},
			attributes: TAG_INFO,
		});

		if (!tag) {
			return res.status(404).json();
		}

		await tag.destroy();
		/* do later */
		return res.status(200).json();
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
};
