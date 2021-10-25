const jalaali = require("jalaali-js");
const Sequelize = require("sequelize");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");

const { User_Course, Course, User } = require("../../database/models");

const { convertPersianNumberToEnglish } = require("../../utils/input");
const MAIN_CONFIG = require("../../config/mainConfig");
const ResponseBuilder = require("../../utils/responseBuilder");
const requestValidator = require("../../utils/requestValidator"); // for validating requests efficiently
const { trace } = require("console");

const USER_COURSE_INFO = [
  "id",
  "userId",
  "courseId",
  "course_title",
  "done",
  "user_exam_count",
  "createdAt",
];

const userCourseFormatter = (user_courses) => {
  const final = [];

  for (let i = 0; i < user_courses.length; i++) {
    // console.log(comments[i]);
    const user_course = user_courses[i];
    const createdAt = jalaali.toJalaali(user_course.createdAt);
    user_course.createdAt = `${createdAt.jy}/${createdAt.jm}/${createdAt.jd}`;

    if (!user_course.course) {
      const finalUserCourse = { ...user_course.dataValues };
      final.push(finalUserCourse);
    } else {
      const finalUserCourse = {
        ...user_course.dataValues,
        courseId: user_course.course.id,
        courseTitle: user_course.course.title,
        userId: user_course.user.id,
        userName: user_course.user.name,
      };
      // console.log(userId);
      // console.log(courseId);
      final.push(finalUserCourse);
    }
  }
  return final;
};

/**
 * sending all userCourse information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

exports.getAllUserCourses = async (req, res, next) => {
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
      const courses = [];
      for (let i = 0; i < id.length; i++) {
        const courcId = id[i];
        const cource = await User_Course.findOne({
          where: {
            id: courcId,
          },
        });
        courses.push(cource);
      }
      return res.status(200).json(walletsFormatter(courses));
    }
    if (all) {
      const allUserCourses = await User_Course.findAll();
      // console.log(allUserCourses);
      res.set("X-Total-Count", allUserCourses.length);
      res.set("Access-Control-Expose-Headers", "X-Total-Count");
      return res.status(200).json(userCourseFormatter(allUserCourses));
    }
    if (searchQuery !== "") {
      let thisUserCourses = [],
        allUserCourses = [];
      if (searchQuery !== "") {
        thisUserCourses = await User_Course.findAll({
          where: {
            [Op.or]: [
              { "$user.username$": { [Op.startsWith]: searchQuery } },
              { "$user.name$": { [Op.startsWith]: searchQuery } },
              { course_title: { [Op.startsWith]: searchQuery } },
            ],
          },
          include: [
            {
              as: 'user',
              model: User,
              required: false,
            },
          ],
          attributes: USER_COURSE_INFO,
          order: [[sortBy, orderBy]],
          offset: +startFrom,
          limit: +endFrom - +startFrom,
        });

        allUserCourses = await User_Course.findAll({
          where: {
            [Op.or]: [
              { "$user.username$": { [Op.startsWith]: searchQuery } },
              { "$user.name$": { [Op.startsWith]: searchQuery } },
              { course_title: { [Op.startsWith]: searchQuery } },
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
      console.log(allUserCourses);
      res.set("X-Total-Count", allUserCourses.length);
      res.set("Access-Control-Expose-Headers", "X-Total-Count");
      return res.status(200).json(userCourseFormatter(thisUserCourses));
    }
    const thisUserCourses = await User_Course.findAll({
      attributes: USER_COURSE_INFO,
      order: [[sortBy, orderBy]],
      offset: +startFrom,
      limit: +endFrom - +startFrom,
	//   include: [Course],
    //   include: [User],
      // include:[{
      // 	Course,
      // 	User
      // }],
      // include:[],
    });

    const allUserCourses = await User_Course.findAll();
    // console.log(allUserCourses);
    res.set("X-Total-Count", allUserCourses.length);
    res.set("Access-Control-Expose-Headers", "X-Total-Count");

    return res.status(200).json(userCourseFormatter(thisUserCourses));
  } catch (err) {
    console.log(err);
    res.status(500).json({ tittt: "COMES FROM GET ALL COURCES!!!!!" });
  }
};

/**
 * getting userCourse information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getOneUserCourse = async (req, res, next) => {
  const userCourseId = req.params["userCourseId"];
//   console.log(userCourseId);
  try {
    const userCourse = await User_Course.findOne({
      where: {
        id: userCourseId,
      },
      attributes: USER_COURSE_INFO,
      // include:[Course],
      // include:[User],
    });

    if (!userCourse) {
      return res.status(404).json();
    }

    return res.status(200).json(userCourseFormatter([userCourse])[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

/**
 * creating  userCourse
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

exports.createUserCourse = async (req, res, next) => {
  const response = new ResponseBuilder();

  const isRequestInvalid = requestValidator(req, response);
  if (isRequestInvalid) {
    return res.status(422).json(isRequestInvalid);
  }

  const { user_exam_count, done, userId, courseId, course_title } = req.body;

  try {
    // creating new userCourse
    const newUserCourse = await User_Course.create({
      user_exam_count: user_exam_count,
      done: done,
      userId: userId,
      courseId: courseId,
      course_title: course_title,
    });

    return res.status(201).json(newUserCourse.dataValues);
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

exports.updateOneUserCourse = async (req, res, next) => {
  const userCourseId = req.params["userCourseId"];
  const response = new ResponseBuilder();

  const isRequestInvalid = requestValidator(req, response);
  if (isRequestInvalid) {
    return res.status(422).json(isRequestInvalid);
  }
  const { user_exam_count, done, userId, courseId, course_title } = req.body;

  try {
    //  console.log(courseId);
    //  console.log(title);
    const userCourse = await User_Course.findOne({
      where: {
        id: userCourseId,
      },
      attributes: USER_COURSE_INFO,
    });

    if (!userCourse) {
      return res.status(404).json();
    }

    userCourse.user_exam_count = user_exam_count;
    userCourse.userId = userId;
    userCourse.done = done;
    userCourse.courseId = courseId;
    userCourse.course_title = course_title;

    const updatedUserCourse = await userCourse.save();

    return res.status(200).json(updatedUserCourse);
  } catch (err) {
    console.log(err);
    res.status(500).json({title: "DOREHHHHAAAAA"});
  }
};

exports.deleteOneUserCourse = async (req, res, next) => {
  const userCourseId = req.params["userCourseId"];

  try {
    const userCourse = await User_Course.findOne({
      where: {
        id: userCourseId,
      },
      attributes: USER_COURSE_INFO,
    });

    if (!userCourse) {
      return res.status(404).json();
    }

    await userCourse.destroy();
    /* do later */
    return res.status(200).json();
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};
