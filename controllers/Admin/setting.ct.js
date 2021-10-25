const jalaali = require("jalaali-js");
const Sequelize = require("sequelize");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");


const {
   Setting
} = require("../../database/models");

const { convertPersianNumberToEnglish } = require("../../utils/input");
const MAIN_CONFIG = require("../../config/mainConfig");
const ResponseBuilder = require("../../utils/responseBuilder");
const requestValidator = require("../../utils/requestValidator"); // for validating requests efficiently

const SETTING_INFO = [
	"id",
	"key",
	"value",
    "other_values",
	"createdAt",
];


const settingsFormatter = (settings) => {
	const final = [];

	for (let i = 0; i < settings.length; i++) {
		const setting = settings[i];
		const createdAt = jalaali.toJalaali(setting.createdAt);
		setting.createdAt = `${createdAt.jy}/${createdAt.jm}/${createdAt.jd}`;
        // final.push(lesson);
        const finalSetting = {
            ...setting.dataValues,
        }
		final.push(finalSetting);
	}
	return final;
};


/**
 * sending all setting information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

 exports.getAllSettings = async(req, res, next) =>{
	const startFrom = req.query["_start"];
	const endFrom = req.query["_end"];
	const orderBy = req.query["_order"] || "ASC";
	const sortBy = req.query["_sort"];
	const all = req.query["_all"];
	// const stars = +req.query["stars"];
	const searchQuery = req.query["q"] || ""; 

	try {
		if(all){
			const allSettings = await Setting.findAll();
			res.set("X-Total-Count", allSettings.length);
			res.set("Access-Control-Expose-Headers", "X-Total-Count");

			return res.status(200).json(settingsFormatter(allSettings));
		}
		if(searchQuery !== ""){
			let thisSettings = [],
                allSettings = [];
			if(searchQuery !== ""){
				thisSettings = await Setting.findAll({
					where: {
						[Op.and]: [
							{
								[Op.or]: [
									{ key: { [Op.startsWith]: searchQuery } },
								],
							},
						],
					},
					attributes: SETTING_INFO,
					order: [[sortBy, orderBy]],
					offset: +startFrom,
					limit: +endFrom - +startFrom,
				});

				allSettings = await Setting.findAll({
					where: {
						[Op.and]: [
							{
								[Op.or]: [
									{ key: { [Op.startsWith]: searchQuery } },
								],
							},
						],
					},
				});
			}

			res.set("X-Total-Count", allSettings.length);
			res.set("Access-Control-Expose-Headers", "X-Total-Count");
			return res.status(200).json(settingsFormatter(thisSettings));
		}
		const thisSettings = await Setting.findAll({
			attributes: SETTING_INFO,
			order: [[sortBy, orderBy]],
			offset: +startFrom,
			limit: +endFrom - +startFrom,
		});

		const allSetting = await Setting.findAll();


		res.set("X-Total-Count", allSetting.length);
		res.set("Access-Control-Expose-Headers", "X-Total-Count");

		return res.status(200).json(settingsFormatter(thisSettings));
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
 };

/**
 * getting setting information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getOneSetting = async (req, res, next) => {
	const settingId = req.params["settingId"];

	try {
		const setting = await Setting.findOne({
			where: {
				id: settingId,
			},
			attributes: SETTING_INFO,
		});

		if (!setting) {
			return res.status(404).json();
		}

		return res.status(200).json(settingsFormatter([setting])[0]);
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
};

 /**
 * creating  setting
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

 exports.createSetting = async (req, res, next ) => {
	 const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}


	const {
        key,
        value,
        other_values,
	} = req.body;

	try {
		// creating new setting
		const newSetting = await Setting.create({
			key: key,
			value: value,
			other_values: other_values,
		});

		return res.status(201).json(newSetting.dataValues);
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
 }

 exports.updateOneSetting = async (req, res, next) => {
	const settingId = req.params["settingId"];
	const {
        key,
        value,
        other_values,
	} = req.body;
	 try {
		const setting = await Setting.findOne({
			where: {
				id: settingId,
			},
			attributes: SETTING_INFO,
		});

		// console.log(setting);

		if (!setting) {
			return res.status(404).json();
		}

		setting.key = key;
		setting.value = value;
		setting.other_values = other_values;
		const updatedSetting = await setting.save();

		return res.status(200).json(updatedSetting);
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
};
exports.deleteOneSetting = async (req, res, next) => {
	const settingId = req.params["settingId"];

	try {
		const setting = await Setting.findOne({
			where: {
				id: settingId,
			},
			attributes: SETTING_INFO,
		});

		if (!setting) {
			return res.status(404).json();
		}

		await setting.destroy();
		/* do later */
		return res.status(200).json();
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
};
