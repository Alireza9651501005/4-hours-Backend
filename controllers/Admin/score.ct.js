const jalaali = require("jalaali-js");
const Sequelize = require("sequelize");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");

const { Score, User } = require("../../database/models");

const { convertPersianNumberToEnglish } = require("../../utils/input");
const MAIN_CONFIG = require("../../config/mainConfig");
const ResponseBuilder = require("../../utils/responseBuilder");
const requestValidator = require("../../utils/requestValidator"); // for validating requests efficiently
const { trace } = require("console");

const SCORE_INFO = [
  "id",
  "score",
  "field",
  "element_id",
  "negative",
  "userId",
  "createdAt",
];

const scoresFormatter = (scores) => {
  const final = [];

  for (let i = 0; i < scores.length; i++) {
    // console.log(comments[i]);
    const score = scores[i];
    const createdAt = jalaali.toJalaali(score.createdAt);
    score.createdAt = `${createdAt.jy}/${createdAt.jm}/${createdAt.jd}`;

    if (!score.user) {
      const finalScore = { ...score.dataValues };
      final.push(finalScore);
    } else {
      const finalScore = {
        ...score.dataValues,
        userId: score.user.id,
      };
      final.push(finalScore);
    }
  }
  return final;
};

/**
 * sending all score information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

exports.getAllScores = async (req, res, next) => {
  const startFrom = req.query["_start"];
  const endFrom = req.query["_end"];
  const orderBy = req.query["_order"] || "ASC";
  const sortBy = req.query["_sort"];
  const all = req.query["_all"];
  // const stars = +req.query["stars"];
  const searchQuery = req.query["q"] || "";

  try {
    if (all) {
      const allScores = await Score.findAll();
      console.log(allScores);
      res.set("X-Total-Count", allScores.length);
      res.set("Access-Control-Expose-Headers", "X-Total-Count");

      return res.status(200).json(scoresFormatter(allScores));
    }
    if (searchQuery !== "") {
      let thisScores = [],
        allScores = [];
      if (searchQuery !== "") {
        thisScores = await Score.findAll({
          where: {
            [Op.or]: [
              { "$user.username$": { [Op.startsWith]: searchQuery } },
              { "$user.name$": { [Op.startsWith]: searchQuery } },
              { field: { [Op.startsWith]: searchQuery } },
              { score: { [Op.like]: searchQuery } },
            ],
          },
          include: [
            {
              as: "user",
              model: User,
              required: false,
            },
          ],
          attributes: SCORE_INFO,
          order: [[sortBy, orderBy]],
          offset: +startFrom,
          limit: +endFrom - +startFrom,
        });

        allScores = await Score.findAll({
          where: {
            [Op.or]: [
              { "$user.username$": { [Op.startsWith]: searchQuery } },
              { "$user.name$": { [Op.startsWith]: searchQuery } },
              { field: { [Op.startsWith]: searchQuery } },
              { score: { [Op.like]: searchQuery } },
            ],
          },
          include: [
            {
              as: "user",
              model: User,
              required: false,
            },
          ],
        });
      }
      res.set("X-Total-Count", allScores.length);
      res.set("Access-Control-Expose-Headers", "X-Total-Count");
      return res.status(200).json(scoresFormatter(thisScores));
    }
    const thisScores = await Score.findAll({
      attributes: SCORE_INFO,
      order: [[sortBy, orderBy]],
      offset: +startFrom,
      limit: +endFrom - +startFrom,
      include: [User],
    });

    const allScores = await Score.findAll();

    res.set("X-Total-Count", allScores.length);
    res.set("Access-Control-Expose-Headers", "X-Total-Count");

    return res.status(200).json(scoresFormatter(thisScores));
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

/**
 * getting score information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getOneScore = async (req, res, next) => {
  const scoreIdId = req.params["scoreId"];

  try {
    const score = await Score.findOne({
      where: {
        id: scoreIdId,
      },
      attributes: SCORE_INFO,
      include: [User],
    });

    if (!score) {
      return res.status(404).json();
    }

    return res.status(200).json(scoresFormatter([score])[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

/**
 * creating  score
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

exports.createScore = async (req, res, next) => {
  const response = new ResponseBuilder();

  const isRequestInvalid = requestValidator(req, response);
  if (isRequestInvalid) {
    return res.status(422).json(isRequestInvalid);
  }

  const { score, field, element_id, negative, userId } = req.body;

  try {
    // creating new score
    const newScore = await Score.create({
      score: score,
      field: field,
      userId: userId,
      element_id: element_id,
      negative: negative,
    });

    return res.status(201).json(newScore.dataValues);
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

exports.updateOneScore = async (req, res, next) => {
  const scoreId = req.params["scoreId"];
  const response = new ResponseBuilder();

  const isRequestInvalid = requestValidator(req, response);
  if (isRequestInvalid) {
    return res.status(422).json(isRequestInvalid);
  }
  const { field, score, element_id, negative, userId } = req.body;

  try {
    const score2 = await Score.findOne({
      where: {
        id: scoreId,
      },
      attributes: SCORE_INFO,
    });

    if (!score2) {
      return res.status(404).json();
    }

    score2.score = score;
    score2.field = field;
    score2.element_id = element_id;
    score2.negative = negative;
    score2.userId = userId;
    const updatedScore = await score2.save();

    return res.status(200).json(updatedScore);
  } catch (err) {
    console.log(err);
    res.status(500).json({ title: "THIS IS A TEST" });
  }
};

exports.deleteOneScore = async (req, res, next) => {
  const scoreId = req.params["scoreId"];

  try {
    const score = await Score.findOne({
      where: {
        id: scoreId,
      },
      attributes: SCORE_INFO,
    });

    if (!score) {
      return res.status(404).json();
    }

    await score.destroy();
    /* do later */
    return res.status(200).json();
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};
