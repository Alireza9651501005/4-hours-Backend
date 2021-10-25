const jalaali = require("jalaali-js");
const Sequelize = require("sequelize");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");

const { User, Lesson, Comment } = require("../../database/models");

const { convertPersianNumberToEnglish } = require("../../utils/input");
const MAIN_CONFIG = require("../../config/mainConfig");
const ResponseBuilder = require("../../utils/responseBuilder");
const requestValidator = require("../../utils/requestValidator"); // for validating requests efficiently

const COMMENT_INFO = [
  "id",
  "content",
  "likes",
  "dislikes",
  "userId",
  "status",
  "lessonId",
  "score",
  "createdAt",
];

const commentFormatter = (comments) => {
  const final = [];

  for (let i = 0; i < comments.length; i++) {
    // console.log(comments[i]);
    const comment = comments[i];
    const createdAt = jalaali.toJalaali(comment.createdAt);
    comment.createdAt = `${createdAt.jy}/${createdAt.jm}/${createdAt.jd}`;

    if (!comment.lesson) {
      const finalComment = { ...comment.dataValues };
      final.push(finalComment);
    } else {
      const finalComment = {
        ...comment.dataValues,
        lessonId: comment.lesson.id,
        lessonTitle: comment.lesson.title,
        userId: comment.user.id,
        userName: comment.user.username,
      };
      final.push(finalComment);
    }
  }
  return final;
};

/**
 * sending all comments information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

exports.getAllComments = async (req, res, next) => {
  const startFrom = req.query["_start"];
  const endFrom = req.query["_end"];
  const orderBy = req.query["_order"] || "ASC";
  const sortBy = req.query["_sort"];
  const all = req.query["_all"];
  // const stars = +req.query["stars"];
  const searchQuery = req.query["q"] || "";

  try {
    if (all) {
      const allComments = await Comment.findAll();
      console.log(allComments);
      res.set("X-Total-Count", allComments.length);
      res.set("Access-Control-Expose-Headers", "X-Total-Count");

      return res.status(200).json(commentFormatter(allComments));
    }
    if (searchQuery !== "") {
      let thisComments = [],
        allComments = [];
      if (searchQuery !== "") {
        thisComments = await Comment.findAll({
          where: {
            [Op.or]: [
              { "$user.username$": { [Op.startsWith]: searchQuery } },
              { "$user.name$": { [Op.startsWith]: searchQuery } },
              { likes: { [Op.like]: searchQuery } },
              { dislikes: { [Op.like]: searchQuery } },
              { content: { [Op.startsWith]: searchQuery } },
            ],
          },
          include: [
            {
              as: 'user',
              model: User,
              // required: true,
            },
          ],
          attributes: COMMENT_INFO,
          order: [[sortBy, orderBy]],
          offset: +startFrom,
          limit: +endFrom - +startFrom,
        });

        allComments = await Comment.findAll({
          where: {
            [Op.or]: [
              { "$user.username$": { [Op.startsWith]: searchQuery } },
              { "$user.name$": { [Op.startsWith]: searchQuery } },
              { likes: { [Op.like]: searchQuery } },
              { dislikes: { [Op.like]: searchQuery } },
              { content: { [Op.startsWith]: searchQuery } },
            ],
          },
          include: [
            {
              as: 'user',
              model: User,
              // required: true,
            },
          ],
        });
      }
      res.set("X-Total-Count", allComments.length);
      res.set("Access-Control-Expose-Headers", "X-Total-Count");
      return res.status(200).json(commentFormatter(thisComments));
    }
    const thisComments = await Comment.findAll({
      attributes: COMMENT_INFO,
      order: [[sortBy, orderBy]],
      offset: +startFrom,
      limit: +endFrom - +startFrom,
      include: [Lesson],
      include: [User],
    });

    const allComments = await Comment.findAll();

    res.set("X-Total-Count", allComments.length);
    res.set("Access-Control-Expose-Headers", "X-Total-Count");

    return res.status(200).json(commentFormatter(thisComments));
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};


/**
 * getting notPublishedComment information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
//  exports.getUnpublishedComments = async (req, res, next) => {
//   const startFrom = req.query["_start"];
//   const endFrom = req.query["_end"];
//   const orderBy = req.query["_order"] || "ASC";
//   const sortBy = req.query["_sort"];
//   const all = req.query["_all"];
//   // const stars = +req.query["stars"];
//   const searchQuery = req.query["q"] || "";

//   try {
//     if (searchQuery !== "") {
//       let thisComments = [],
//         unpublishedComments = [];
//       if (searchQuery !== "") {
//         thisComments = await Comment.findAll({
//           where: {
//             [Op.and]: [
//               {
//                 [Op.or]: [
//                   { content: { [Op.like]: searchQuery } },
//                   // { userId: { [Op.like]: searchQuery } },
//                   { status: { [Op.like]: searchQuery } },
//                 ],
//               },
//             ],
//           },
//           include: [Lesson],
//           include: [User],
//           attributes: COMMENT_INFO,
//           order: [[sortBy, orderBy]],
//           offset: +startFrom,
//           limit: +endFrom - +startFrom,
//         });

//         unpublishedComments = await Comment.findAll({
//           where: {
//             [Op.and]: [
//               {
//                 [Op.or]: [
//                   { status: "0" },
//                 ],
//               },
//             ],
//           },
//         });
//       }
//       res.set("X-Total-Count", unpublishedComments.length);
//       res.set("Access-Control-Expose-Headers", "X-Total-Count");
//       return res.status(200).json(commentFormatter(thisComments));
//     }
//     const thisComments = await Comment.findAll({
//       attributes: COMMENT_INFO,
//       order: [[sortBy, orderBy]],
//       offset: +startFrom,
//       limit: +endFrom - +startFrom,
//       include: [Lesson],
//       include: [User],
//     });

//     const unpublishedComments = await Comment.findAll();

//     res.set("X-Total-Count", unpublishedComments.length);
//     res.set("Access-Control-Expose-Headers", "X-Total-Count");

//     return res.status(200).json(commentFormatter(thisComments));
//   } catch (err) {
//     console.log(err);
//     res.status(500).json();
//   }
// };

/**
 * getting comment information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getOneComment = async (req, res, next) => {
  const commentId = req.params["commentId"];

  try {
    const comment = await Comment.findOne({
      where: {
        id: commentId,
      },
      attributes: COMMENT_INFO,
      include: [Lesson],
      include: [User],
    });

    if (!comment) {
      return res.status(404).json();
    }

    return res.status(200).json(commentFormatter([comment])[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};


exports.updateOneComment = async (req, res, next) => {
  const commentId = req.params["commentId"];
  const response = new ResponseBuilder();

  const isRequestInvalid = requestValidator(req, response);
  if (isRequestInvalid) {
    return res.status(422).json(isRequestInvalid);
  }
  const { content, userId, lessonId, status } = req.body;

  try {
    console.log(userId);
    console.log(lessonId);
    const comment = await Comment.findOne({
      where: {
        id: commentId,
      },
      attributes: COMMENT_INFO,
    });

    if (!comment) {
      return res.status(404).json();
    }

    comment.content = content;
    comment.lessonId = lessonId;
    comment.userId = userId;
    comment.status = status;
    const updatedComment = await comment.save();

    return res.status(200).json(updatedComment);
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

exports.acceptComment = async (req, res, next) => {
  const commentId = req.params["commentId"];
  const response = new ResponseBuilder();

  const isRequestInvalid = requestValidator(req, response);
  if (isRequestInvalid) {
    return res.status(422).json(isRequestInvalid);
  }
  const { status } = req.body;

  try {
    const comment = await Comment.findOne({
      where: {
        id: commentId,
      },
      attributes: COMMENT_INFO,
    });

    if (!comment) {
      return res.status(404).json();
    }
    comment.status = !status;
    const updatedComment = await comment.save();

    return res.status(200).json(updatedComment);
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

exports.deleteOneComment = async (req, res, next) => {
  const commentId = req.params["commentId"];

  try {
    const comment = await Comment.findOne({
      where: {
        id: commentId,
      },
      attributes: COMMENT_INFO,
    });

    if (!comment) {
      return res.status(404).json();
    }

    await comment.destroy();
    /* do later */
    return res.status(200).json();
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};
