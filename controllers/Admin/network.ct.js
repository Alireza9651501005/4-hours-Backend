const jalaali = require("jalaali-js");
const Sequelize = require("sequelize");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");


const {
    Network,
    User,
} = require("../../database/models");

const { convertPersianNumberToEnglish } = require("../../utils/input");
const MAIN_CONFIG = require("../../config/mainConfig");
const ResponseBuilder = require("../../utils/responseBuilder");
const requestValidator = require("../../utils/requestValidator"); // for validating requests efficiently
const { trace } = require("console");

const NETWORK_INFO = [
	"id",
	"score",
    "negative",
	"userId",
	"guest_id",
	"level",
	"createdAt",
];

const networkFormatter = (networks) => {
    const final = [];
  
    for (let i = 0; i < networks.length; i++) {
      // console.log(comments[i]);
      const network = networks[i];
      const createdAt = jalaali.toJalaali(network.createdAt);
      network.createdAt = `${createdAt.jy}/${createdAt.jm}/${createdAt.jd}`;
  
      if (!network.user) {
        const finalNetwork = { ...network.dataValues };
        final.push(finalNetwork);
      } else {
        const finalNetwork = {
          ...network.dataValues,
          userId: network.user.id,
        };
        final.push(finalNetwork);
      }
    }
    return final;
  };


/**
 * sending all networks information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

 exports.getAllNetworks= async(req, res, next) =>{
	const startFrom = req.query["_start"];
	const endFrom = req.query["_end"];
	const orderBy = req.query["_order"] || "ASC";
	const sortBy = req.query["_sort"];
	const all = req.query["_all"];
	// const stars = +req.query["stars"];
	const searchQuery = req.query["q"] || ""; 

	try {
		if(all){
			const allnetworks = await Network.findAll();
			console.log(allnetworks);
			res.set("X-Total-Count", allnetworks.length);
			res.set("Access-Control-Expose-Headers", "X-Total-Count");

			return res.status(200).json(networkFormatter(allnetworks));
		}
		if(searchQuery !== ""){
			let thisNetworks = [],
				allnetworks = [];
			if(searchQuery !== ""){
				thisNetworks = await Network.findAll({
					where: {
                        [Op.or]: [
                          { "$user.username$": { [Op.startsWith]: searchQuery } },
                          { "$user.name$": { [Op.startsWith]: searchQuery } },
                          { level: { [Op.like]: searchQuery } },
						  { guest_id: { [Op.like]: searchQuery } },
                        ],
                      },
                      include: [
                        {
						  as: 'user',
                          model: User,
                          required: false,
                        },
                      ],
					attributes: NETWORK_INFO,
					order: [[sortBy, orderBy]],
					offset: +startFrom,
					limit: +endFrom - +startFrom,
				});

				allnetworks = await Network.findAll({
					where: {
                        [Op.or]: [
                          { "$user.username$": { [Op.startsWith]: searchQuery } },
                          { "$user.name$": { [Op.startsWith]: searchQuery } },
                          { level: { [Op.like]: searchQuery } },
						  { guest_id: { [Op.like]: searchQuery } },
                        ],
                      },
                      include: [
                        {
						  as: 'user',
                          model: User,
                          required: false,
                        },
                      ],
				});
			}
			res.set("X-Total-Count", allnetworks.length);
			res.set("Access-Control-Expose-Headers", "X-Total-Count");
			return res.status(200).json(networkFormatter(thisNetworks));	
		}
		const thisNetworks = await Network.findAll({
			attributes: NETWORK_INFO,
			order: [[sortBy, orderBy]],
			offset: +startFrom,
			limit: +endFrom - +startFrom,
            include:[User],
		});

		// console.log("=============================================================================")
		// console.log(thisNetworks)
		// console.log("=============================================================================")

		const allnetworks = await Network.findAll();

		res.set("X-Total-Count", allnetworks.length);
		res.set("Access-Control-Expose-Headers", "X-Total-Count");

		return res.status(200).json(networkFormatter(thisNetworks));
	} catch (err) {
	console.log(err);
	res.status(500).json();
	}
 };

/**
 * getting network information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getOneNetwork = async (req, res, next) => {
	const networkId = req.params["networkId"];

	try {
		const network = await Network.findOne({
			where: {
				id: networkId,
			},
			attributes: NETWORK_INFO,
            include:[User],
		});

		if (!network) {
			return res.status(404).json();
		}

		return res.status(200).json(networkFormatter([network])[0]);
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
};

 /**
 * creating  network
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

 exports.createNetwork= async (req, res, next ) => {
	 const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const {
        score,
        negative,
        userId,
        guest_id,
        level,
	} = req.body;

	try {
		// creating new network
		const newNetwork = await Network.create({
			score: score,
			negative: negative,
			userId: userId,
			guest_id: guest_id,
			level: level,
		});

		return res.status(201).json(newNetwork.dataValues);
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
}

 exports.updateOneNetwork = async (req, res, next) => {
	const networkId = req.params["networkId"];
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}
	const {
        score,
        negative,
        userId,
        guest_id,
        level,
	} = req.body;

	 try {
		const network = await Network.findOne({
			where: {
				id: networkId,
			},
			attributes: NETWORK_INFO,
		});

		if (!network) {
			return res.status(404).json();
		}

		network.score = score;
		network.negative = negative;
		network.guest_id = guest_id;
		network.level = level;
		network.userId = userId;
		const updatedNetwork = await network.save();

		return res.status(200).json(updatedNetwork.dataValues);
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
};

exports.deleteOneNetwork = async (req, res, next) => {
	const networkId = req.params["networkId"];

	try {
		const network = await Network.findOne({
			where: {
				id: networkId,
			},
			attributes: NETWORK_INFO,
		});

		if (!network) {
			return res.status(404).json();
		}

		await network.destroy();
		/* do later */
		return res.status(200).json();
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
};
