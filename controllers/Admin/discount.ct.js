const jalaali = require("jalaali-js");
const Sequelize = require("sequelize");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");


const {
    Discount,
} = require("../../database/models");

const { convertPersianNumberToEnglish } = require("../../utils/input");
const MAIN_CONFIG = require("../../config/mainConfig");
const ResponseBuilder = require("../../utils/responseBuilder");
const requestValidator = require("../../utils/requestValidator"); // for validating requests efficiently

const DISCOUNT_INFO = [
	"id",
	"title",
	"code",
    "amount",
    "percent",
    "usage_count",
    "expiration_time",
	"createdAt",
];


const discountFormatter = (discounts) => {
	const final = [];

	for (let i = 0; i < discounts.length; i++) {
		const discount = discounts[i];
		const createdAt = jalaali.toJalaali(discount.createdAt);
		discount.createdAt = `${createdAt.jy}/${createdAt.jm}/${createdAt.jd}`;
        const finalDiscount = {
            ...discount.dataValues,
        }
		final.push(finalDiscount);
	}
	return final;
};


/**
 * sending all discounts information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

 exports.getAllDiscounts = async(req, res, next) =>{
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
			const discounts = []
			for (let i = 0; i < id.length; i++) {
				const discountId = id[i];
				const discount = await Discount.findOne({
					where:{
						id:discountId,
					}
				})
				discounts.push(discount)
			}
			return res.status(200).json(discountFormatter(discounts));
		}
		if(all){
			const allDiscounts = await Discount.findAll();
			res.set("X-Total-Count", allDiscounts.length);
			res.set("Access-Control-Expose-Headers", "X-Total-Count");

			return res.status(200).json(dis(allDiscounts));
		}
		if(searchQuery !== ""){
			let thisDiscounts = [],
                 allDiscounts = [];
			if(searchQuery !== ""){
				thisDiscounts = await Discount.findAll({
					where: {
						[Op.and]: [
							{
								[Op.or]: [
									{ title: { [Op.startsWith]: searchQuery } },
									{ code: { [Op.startsWith]: searchQuery } },
								],
							},
						],
					},
					attributes: DISCOUNT_INFO,
					order: [[sortBy, orderBy]],
					offset: +startFrom,
					limit: +endFrom - +startFrom,
				});

				allDiscounts = await Discount.findAll({
					where: {
						[Op.and]: [
							{
								[Op.or]: [
									{ title: { [Op.startsWith]: searchQuery } },
									{ code: { [Op.startsWith]: searchQuery } },
								],
							},
						],
					},
				});
			}

			res.set("X-Total-Count", allDiscounts.length);
			res.set("Access-Control-Expose-Headers", "X-Total-Count");
			return res.status(200).json(discountFormatter(thisDiscounts));
		}
		const thisDiscounts = await Discount.findAll({
			attributes: DISCOUNT_INFO,
			order: [[sortBy, orderBy]],
			offset: +startFrom,
			limit: +endFrom - +startFrom,
		});

		const allDiscounts = await Discount.findAll();


		res.set("X-Total-Count", allDiscounts.length);
		res.set("Access-Control-Expose-Headers", "X-Total-Count");

		return res.status(200).json(discountFormatter(thisDiscounts));
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
 };

/**
 * getting discounts information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getOneDiscount = async (req, res, next) => {
	const discountId = req.params["discountId"];

	try {
		const discount = await Discount.findOne({
			where: {
				id: discountId,
			},
			attributes: DISCOUNT_INFO,
		});

		if (!discount) {
			return res.status(404).json();
		}

		return res.status(200).json(discountFormatter([discount])[0]);
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
};

 /**
 * creating  discount
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

 exports.createDiscount = async (req, res, next ) => {
	 const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}


	const {
        title,
        code,
        amount,
        percent,
        usage_count,
        expiration_time,
	} = req.body;

	try {
		// creating new discount
		const newDiscount = await Discount.create({
			title: title,
			code: code,
			amount: amount,
			percent: percent,
			usage_count: usage_count,
			expiration_time: expiration_time,
		});

		return res.status(201).json(newDiscount.dataValues);
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
 }

 exports.updateOneDiscount = async (req, res, next) => {
	const discountId = req.params["discountId"];
	const {
        title,
        code,
        amount,
        percent,
        usage_count,
        expiration_time,
	} = req.body;
	 try {
		const discount = await Discount.findOne({
			where: {
				id: discountId,
			},
			attributes: DISCOUNT_INFO,
		});

		if (!discount) {
			return res.status(404).json();
		}

		discount.title = title;
		discount.code = code;
		discount.amount = amount;
		discount.percent = percent;
		discount.usage_count = usage_count;
		discount.expiration_time = expiration_time;	
		const updatedDiscount = await discount.save();

		return res.status(200).json(updatedDiscount);
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
};
exports.deleteOneDiscount = async (req, res, next) => {
	const discountId = req.params["discountId"];

	try {
		const discount = await Discount.findOne({
			where: {
				id: discountId,
			},
			attributes: DISCOUNT_INFO,
		});

		if (!discount) {
			return res.status(404).json();
		}

		await discount.destroy();
		/* do later */
		return res.status(200).json();
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
};
