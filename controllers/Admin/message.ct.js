const jalaali = require("jalaali-js");
const Sequelize = require("sequelize");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");

const { Message, User } = require("../../database/models");

const { convertPersianNumberToEnglish } = require("../../utils/input");
const MAIN_CONFIG = require("../../config/mainConfig");
const ResponseBuilder = require("../../utils/responseBuilder");
const requestValidator = require("../../utils/requestValidator"); // for validating requests efficiently
const { trace } = require("console");

const MESSAGE_INFO = [
    "id",
    "title",
    "description",
    "read",
    "deleted",
    "userId",
    "createdAt",
];

const messageFormatter = (messages) => {
    const final = [];

    for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        const createdAt = jalaali.toJalaali(message.createdAt);
        message.createdAt = `${createdAt.jy}/${createdAt.jm}/${createdAt.jd}`;

        if (!message.user) {
            const finalMessage = {...message.dataValues };
            final.push(finalMessage);
        } else {
            const finalMessage = {
                ...message.dataValues,
                userId: message.user.id,
                userName: message.user.username,
            };
            final.push(finalMessage);
        }
    }
    return final;
};


/**
 * sending all messages information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

exports.getAllMessages = async(req, res, next) => {
    const startFrom = req.query["_start"];
    const endFrom = req.query["_end"];
    const orderBy = req.query["_order"] || "ASC";
    const sortBy = req.query["_sort"];
    const all = req.query["_all"];
    // const stars = +req.query["stars"];
    const searchQuery = req.query["q"] || "";

    try {
        if (all) {
            const allMessages = await Message.findAll();
            console.log(allMessages);
            res.set("X-Total-Count", allMessages.length);
            res.set("Access-Control-Expose-Headers", "X-Total-Count");

            return res.status(200).json(messageFormatter(allMessages));
        }
        if (searchQuery !== "") {
            let thisMessages = [],
                allMessages = [];
            if (searchQuery !== "") {
                thisMessages = await Message.findAll({
                    where: {
                        [Op.or]: [
                          { "$user.username$": { [Op.startsWith]: searchQuery } },
                          { "$user.name$": { [Op.startsWith]: searchQuery } },
                          { title: { [Op.like]: searchQuery } },
                        ],
                      },
                      include: [
                        {
                          as: 'user',
                          model: User,
                          required: false,
                        },
                      ],
                    attributes: MESSAGE_INFO,
                    order: [
                        [sortBy, orderBy]
                    ],
                    offset: +startFrom,
                    limit: +endFrom - +startFrom,
                });

                allMessages = await Message.findAll({
                    where: {
                        [Op.or]: [
                          { "$user.username$": { [Op.startsWith]: searchQuery } },
                          { "$user.name$": { [Op.startsWith]: searchQuery } },
                          { title: { [Op.like]: searchQuery } },
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
            res.set("X-Total-Count", allMessages.length);
            res.set("Access-Control-Expose-Headers", "X-Total-Count");
            return res.status(200).json(messageFormatter(thisMessages));
        }
        const thisMessages = await Message.findAll({
            attributes: MESSAGE_INFO,
            order: [
                [sortBy, orderBy]
            ],
            offset: +startFrom,
            limit: +endFrom - +startFrom,
            include: [User],
        });

        const allMessages = await Message.findAll();

        res.set("X-Total-Count", allMessages.length);
        res.set("Access-Control-Expose-Headers", "X-Total-Count");

        return res.status(200).json(messageFormatter(thisMessages));
    } catch (err) {
        console.log(err);
        res.status(500).json();
    }
};


/**
 * getting message information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
 exports.getOneMessage = async (req, res, next) => {
	const messageId = req.params["messageId"];

	try {
		const message = await Message.findOne({
			where: {
				id: messageId,
			},
			attributes: MESSAGE_INFO,
            include:[User],
		});

		if (!message) {
			return res.status(404).json();
		}

		return res.status(200).json(messageFormatter([message])[0]);
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
};

 /**
 * creating  message
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

 exports.createMessage= async (req, res, next ) => {
	 const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const {
        title,
        description,
        read,
        userId,
        deleted,
	} = req.body;

	try {
		// creating new message
		const newMessage = await Message.create({
			title: title,
			description: description,
			read: read,
			userId: userId,
			deleted: deleted,
		});

		return res.status(201).json(newMessage.dataValues);

	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
}

 exports.updateOneMessage = async (req, res, next) => {
	const messageId = req.params["messageId"];
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}
	const {
        title,
        description,
        read,
        userId,
        deleted,
	} = req.body;

	 try {
			const message = await Message.findOne({
			where: {
				id: messageId,
			},
			attributes: MESSAGE_INFO,
		});

		if (!message) {
			return res.status(404).json();
		}

		message.title = title;
		message.description = description;
		message.read = read;
		message.userId = userId;
		message.deleted = deleted;
		const updatedMessage = await message.save();

		return res.status(200).json(updatedMessage);
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
};

exports.deleteOneMessage = async (req, res, next) => {
	const messageId = req.params["messageId"];

	try {
		const message = await Message.findOne({
			where: {
				id: messageId,
			},
			attributes: MESSAGE_INFO,
		});

		if (!message) {
			return res.status(404).json();
		}

		await message.destroy();
		/* do later */
		return res.status(200).json();
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
};
