const jalaali = require("jalaali-js");
const Sequelize = require("sequelize");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");

const { Wallet, Course, User } = require("../../database/models");

const { convertPersianNumberToEnglish } = require("../../utils/input");
const MAIN_CONFIG = require("../../config/mainConfig");
const ResponseBuilder = require("../../utils/responseBuilder");
const requestValidator = require("../../utils/requestValidator"); // for validating requests efficiently
const { trace } = require("console");

const WALLET_INFO = [
  "id",
  "amount",
  "description",
  "status",
  "action",
  "resource",
  "userId",
  "trace_code",
  "courseId",
  "seminarId",
  "createdAt",
];

const walletsFormatter = (wallets) => {
  const final = [];

  for (let i = 0; i < wallets.length; i++) {
    // console.log(wallets[i]);
    const wallet = wallets[i];
    const createdAt = jalaali.toJalaali(wallet.createdAt);
    wallet.createdAt = `${createdAt.jy}/${createdAt.jm}/${createdAt.jd}`;

    if (!wallet.course) {
      const finalWallet = {
        ...wallet.dataValues,
      };
      final.push(finalWallet);
    } else {
      const finalWallet = {
        ...wallet.dataValues,
        courseId: wallet.course.id,
        courseTitle: wallet.course.title,
        userId: wallet.user.id,
        userName: wallet.user.name,
      };
      console.log(userId);
      console.log(courseId);
      final.push(finalWallet);
    }
  }
  return final;
};

/**
 * sending all Wallets information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

exports.getAllWallets = async (req, res, next) => {
  const startFrom = req.query["_start"];
  const endFrom = req.query["_end"];
  const orderBy = req.query["_order"] || "ASC";
  const sortBy = req.query["_sort"];
  const all = req.query["_all"];
  // const stars = +req.query["stars"];
  const searchQuery = req.query["q"] || "";

  const id = req.query.id;
  try {
    if (id && id.length > 0) {
      const wallets = [];
      for (let i = 0; i < id.length; i++) {
        const walletId = id[i];
        const wallet = await Wallet.findOne({
          where: {
            id: walletId,
          },
        });
        wallets.push(wallet);
      }
      return res.status(200).json(walletsFormatter(wallets));
    }
    if (all) {
      const allWallets = await Wallet.findAll();
      console.log(allWallets);
      res.set("X-Total-Count", allWallets.length);
      res.set("Access-Control-Expose-Headers", "X-Total-Count");

      return res.status(200).json(walletsFormatter(allWallets));
    }
    if (searchQuery !== "") {
      let thisWallets = [],
        allWallets = [];
      if (searchQuery !== "") {
        thisWallets = await Wallet.findAll({
          where: {
            [Op.or]: [
              { "$user.username$": { [Op.startsWith]: searchQuery } },
              { "$user.name$": { [Op.startsWith]: searchQuery } },
              { amount: { [Op.startsWith]: searchQuery } },
              { status: { [Op.startsWith]: searchQuery } },
              { resource: { [Op.startsWith]: searchQuery } },
              { action: { [Op.startsWith]: searchQuery } },
              { description: { [Op.startsWith]: searchQuery } },
            ],
          },
          include: [
            {
              as: 'user',
              model: User,
              required: false,
            },
          ],
          attributes: WALLET_INFO,
          order: [[sortBy, orderBy]],
          offset: +startFrom,
          limit: +endFrom - +startFrom,
        });

        allWallets = await Wallet.findAll({
          
          where: {
            [Op.or]: [
              { "$user.username$": { [Op.startsWith]: searchQuery } },
              { "$user.name$": { [Op.startsWith]: searchQuery } },
              { amount: { [Op.startsWith]: searchQuery } },
              { status: { [Op.startsWith]: searchQuery } },
              { resource: { [Op.startsWith]: searchQuery } },
              { action: { [Op.startsWith]: searchQuery } },
              { description: { [Op.startsWith]: searchQuery } },
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
      res.set("X-Total-Count", allWallets.length);
      res.set("Access-Control-Expose-Headers", "X-Total-Count");
      return res.status(200).json(walletsFormatter(thisWallets));
    }
    const thisWallets = await Wallet.findAll({
      attributes: WALLET_INFO,
      order: [[sortBy, orderBy]],
      offset: +startFrom,
      limit: +endFrom - +startFrom,
      include: [Course],
      include: [User],
    });

    const allWallets = await Wallet.findAll();

    res.set("X-Total-Count", allWallets.length);
    res.set("Access-Control-Expose-Headers", "X-Total-Count");

    return res.status(200).json(walletsFormatter(thisWallets));
  } catch (err) {
    console.log(err);
    res.status(500).json({ title: "error from get all users" });
  }
};

/**
 * getting wallet information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getOneWallet = async (req, res, next) => {
  const walletId = req.params["walletId"];

  try {
    const wallet = await Wallet.findOne({
      where: {
        id: walletId,
      },
      attributes: WALLET_INFO,
      include: [Course],
      include: [User],
    });

    if (!wallet) {
      return res.status(404).json();
    }

    return res.status(200).json(walletsFormatter([wallet])[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json({ title: "ghazanfar nasiri" });
  }
};

/**
 * creating  wallet
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

exports.createWallet = async (req, res, next) => {
  const response = new ResponseBuilder();
  const isRequestInvalid = requestValidator(req, response);
  if (isRequestInvalid) {
    return res.status(422).json(isRequestInvalid);
  }

  const {
    amount,
    description,
    status,
    action,
    resource,
    userId,
    trace_code,
    courseId,
  } = req.body;

  try {
    // if (searchQuery !== "") {
    // 	let thisUsers = [];
    // 	if(searchQuery !== "") {
    // 		thisUsers = await User.find({
    // 			where: {
    // 				[Op.and]: [{
    // 					[Op.or]: [{
    // 							username: {
    // 								[Op.like]: searchQuery
    // 							}
    // 						},
    // 					],
    // 				}, ],
    // 			},
    // 			include: [Course],
    // 			include: [User],
    // 			attributes: USER_INFO,
    // 			order: [
    // 				[sortBy, orderBy]
    // 			],
    // 			offset: +startFrom,
    // 			limit: +endFrom - +startFrom,
    // 		});
    // 	}
    // }
    // creating new wallet
    const newWallet = await Wallet.create({
      amount: amount,
      description: description,
      status: status,
      action: action,
      resource: resource,
      userId: userId,
      trace_code: trace_code,
      courseId: courseId,
    });

    return res.status(201).json(newWallet.dataValues);
  } catch (err) {
    console.log(err);
    res.status(500).json({title: "==== comes from wallet create ========="});
  }
};

exports.updateOneWallet = async (req, res, next) => {
  const walletId = req.params["walletId"];
  const response = new ResponseBuilder();

  const isRequestInvalid = requestValidator(req, response);
  if (isRequestInvalid) {
    return res.status(422).json(isRequestInvalid);
  }
  const {
    amount,
    description,
    status,
    action,
    resource,
    userId,
    trace_code,
    courseId,
  } = req.body;

  try {
    //  console.log(courseId);
    //  console.log(title);
    const wallet = await Wallet.findOne({
      where: {
        id: walletId,
      },
      attributes: WALLET_INFO,
    });

    if (!wallet) {
      return res.status(404).json();
    }

    wallet.amount = amount;
    wallet.description = description;
    wallet.status = status;
    wallet.action = action;
    wallet.resource = resource;
    wallet.userId = userId;
    wallet.trace_code = trace_code;
    wallet.courseId = courseId;
    const updatedWallet = await wallet.save();

    return res.status(200).json(updatedWallet);
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

exports.deleteOneWallet = async (req, res, next) => {
  const walletId = req.params["walletId"];

  try {
    const wallet = await Wallet.findOne({
      where: {
        id: walletId,
      },
      attributes: WALLET_INFO,
    });

    if (!wallet) {
      return res.status(404).json();
    }

    await wallet.destroy();
    /* do later */
    return res.status(200).json();
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

