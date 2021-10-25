const jalaali = require("jalaali-js");
const Sequelize = require("sequelize");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");

const { PaymentLog, Course, User } = require("../../database/models");

const { convertPersianNumberToEnglish } = require("../../utils/input");
const MAIN_CONFIG = require("../../config/mainConfig");
const ResponseBuilder = require("../../utils/responseBuilder");
const requestValidator = require("../../utils/requestValidator"); // for validating requests efficiently
const { trace } = require("console");

const PAYMENT_INFO = [
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

const paymentLogsFormatter = (paymentLogs) => {
  const final = [];

  for (let i = 0; i < paymentLogs.length; i++) {
    // console.log(comments[i]);
    const paymentLog = paymentLogs[i];
    const createdAt = jalaali.toJalaali(paymentLog.createdAt);
    paymentLog.createdAt = `${createdAt.jy}/${createdAt.jm}/${createdAt.jd}`;

    if (!paymentLog.course) {
      const finalPaymentLog = { ...paymentLog.dataValues };
      final.push(finalPaymentLog);
    } else {
      const finalPaymentLog = {
        ...paymentLog.dataValues,
        courseId: paymentLog.course.id,
        courseTitle: paymentLog.course.title,
        userId: paymentLog.user.id,
        userName: paymentLog.user.name,
      };
      console.log(userId);
      console.log(courseId);
      final.push(finalPaymentLog);
    }
  }
  return final;
};

/**
 * sending all paymentLogs information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

exports.getAllPaymentLogs = async (req, res, next) => {
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
      const paymentLogs = [];
      for (let i = 0; i < id.length; i++) {
        const paymentLogId = id[i];
        const paymentLog = await PaymentLog.findOne({
          where: {
            id: paymentLogId,
          },
        });
        paymentLogs.push(paymentLog);
      }
      return res.status(200).json(paymentLogsFormatter(paymentLogs));
    }
    if (all) {
      const allPaymentLogs = await PaymentLog.findAll();
      console.log(allPaymentLogs);
      res.set("X-Total-Count", allPaymentLogs.length);
      res.set("Access-Control-Expose-Headers", "X-Total-Count");

      return res.status(200).json(paymentLogsFormatter(allPaymentLogs));
    }
    if (searchQuery !== "") {
      let thisPaymentLogs = [],
        allPaymentLogs = [];
      if (searchQuery !== "") {
        thisPaymentLogs = await PaymentLog.findAll({
          where: {
            // [Op.and]: {
              [Op.or]: [
                { "$user.username$": { [Op.startsWith]: searchQuery } },
                { "$user.name$": { [Op.startsWith]: searchQuery } },
                { "$course.title$": { [Op.startsWith]: searchQuery } },
                { amount: { [Op.startsWith]: searchQuery } },
                { status: { [Op.startsWith]: searchQuery } },
                { resource: { [Op.startsWith]: searchQuery } },
                { action: { [Op.startsWith]: searchQuery } },
                { description: { [Op.startsWith]: searchQuery } },
              ],
            // },
          },
          include: [
            {
              as: "user",
              model: User,
              required: false,
            },
            {
              as: "course",
              model: Course,
              required: false,
              where: {
                title: { [Op.startsWith]: searchQuery } 
              },
            },
          ],
          // attributes: PAYMENT_INFO,
          // order: [[sortBy, orderBy]],
          // offset: +startFrom,
          // limit: +endFrom - +startFrom,
        });

        allPaymentLogs = await PaymentLog.findAll({
          where: {
            // [Op.and]: {
              [Op.or]: [
                { "$user.username$": { [Op.startsWith]: searchQuery } },
                { "$user.name$": { [Op.startsWith]: searchQuery } },
                { "$course.title$": { [Op.startsWith]: searchQuery } },
                { amount: { [Op.startsWith]: searchQuery } },
                { status: { [Op.startsWith]: searchQuery } },
                { resource: { [Op.startsWith]: searchQuery } },
                { action: { [Op.startsWith]: searchQuery } },
                { description: { [Op.startsWith]: searchQuery } },
              ],
            // },
          },
          include: [
            {
              as: "user",
              model: User,
              required: false,
            },
            {
              as: "course",
              model: Course,
              required: false,
              where: {
                 title: { [Op.startsWith]: searchQuery } ,
              },
            },
          ],
        });
      }
      res.set("X-Total-Count", allPaymentLogs.length);
      res.set("Access-Control-Expose-Headers", "X-Total-Count");
      return res.status(200).json(paymentLogsFormatter(thisPaymentLogs));
    }
    const thisPaymentLogs = await PaymentLog.findAll({
      attributes: PAYMENT_INFO,
      order: [[sortBy, orderBy]],
      offset: +startFrom,
      limit: +endFrom - +startFrom,
      include: [Course],
      include: [User],
    });

    const allPaymentLogs = await PaymentLog.findAll();

    res.set("X-Total-Count", allPaymentLogs.length);
    res.set("Access-Control-Expose-Headers", "X-Total-Count");

    return res.status(200).json(paymentLogsFormatter(thisPaymentLogs));
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

/**
 * getting paymentLog information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getOnePaymentLog = async (req, res, next) => {
  const paymentLogId = req.params["paymentLogId"];

  try {
    const paymentLog = await PaymentLog.findOne({
      where: {
        id: paymentLogId,
      },
      attributes: PAYMENT_INFO,
      include: [Course],
      include: [User],
    });

    if (!paymentLog) {
      return res.status(404).json();
    }

    return res.status(200).json(paymentLogsFormatter([paymentLog])[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

/**
 * creating  paymentLog
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

exports.createPaymentLog = async (req, res, next) => {
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
    // creating new paymentLogs
    const newPaymentLog = await PaymentLog.create({
      amount: amount,
      description: description,
      status: status,
      action: action,
      resource: resource,
      userId: userId,
      trace_code: trace_code,
      courseId: courseId,
    });

    return res.status(201).json(newPaymentLog.dataValues);
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

exports.updateOnePaymentLog = async (req, res, next) => {
  const paymentLogId = req.params["paymentLogId"];
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
    const paymentLog = await PaymentLog.findOne({
      where: {
        id: paymentLogId,
      },
      attributes: PAYMENT_INFO,
    });

    if (!paymentLog) {
      return res.status(404).json();
    }
    paymentLog.amount = amount;
    paymentLog.description = description;
    paymentLog.status = status;
    paymentLog.action = action;
    paymentLog.resource = resource;
    paymentLog.userId = userId;
    paymentLog.trace_code = trace_code;
    paymentLog.courseId = courseId;
    const updatedPaymentLog = await paymentLog.save();
    return res.status(200).json(updatedPaymentLog);
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

exports.deleteOnePaymentLog = async (req, res, next) => {
  const paymentLogId = req.params["paymentLogId"];

  try {
    const paymentLog = await PaymentLog.findOne({
      where: {
        id: paymentLogId,
      },
      attributes: PAYMENT_INFO,
    });

    if (!paymentLog) {
      return res.status(404).json();
    }

    await paymentLog.destroy();
    /* do later */
    return res.status(200).json();
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};
