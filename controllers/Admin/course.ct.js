const jalaali = require("jalaali-js");
const Sequelize = require("sequelize");
const { Op } = require("sequelize");
const fs = require("fs");
const uuid = require("uuid").v4;
const path = require("path");

const { Course } = require("../../database/models");

const { convertPersianNumberToEnglish } = require("../../utils/input");
const MAIN_CONFIG = require("../../config/mainConfig");
const ResponseBuilder = require("../../utils/responseBuilder");
const requestValidator = require("../../utils/requestValidator"); // for validating requests efficiently

const COURSE_INFO = [
  "id",
  "title",
  "level",
  "image",
  "image_background_color",
  "price",
  "price_title",
  "last_price",
  "short_description",
  "description",
  "has_exam",
  "exam_link",
  "exam_try_count",
  "exam_score",
  "total_hours",
  "createdAt",
];

const courseFormatter = (courses) => {
  const final = [];

  for (let i = 0; i < courses.length; i++) {
    const course = { ...courses[i].dataValues };
    const createdAt = jalaali.toJalaali(course.createdAt);
    course.createdAt = `${createdAt.jy}/${createdAt.jm}/${createdAt.jd}`;
    (course.image = course.image
      ? `${process.env.DOMAIN}/public/course-images/${course.image}`
      : `${process.env.DOMAIN}/public/course-images/no-image.png`),
      final.push(course);
  }
  return final;
};

/**
 * sending all courses information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

exports.getAllCourses = async (req, res, next) => {
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
			const courses = []
			for (let i = 0; i < id.length; i++) {
				const courseId = id[i];
				const course = await Course.findOne({
					where:{
						id:courseId,
					}
				})
				courses.push(course)
			}
			return res.status(200).json(courseFormatter(courses));
		}
    if (all) {
      const allCourses = await Course.findAll();
      res.set("X-Total-Count", allCourses.length);
      res.set("Access-Control-Expose-Headers", "X-Total-Count");

      return res.status(200).json(courseFormatter(allCourses));
    }
    if (searchQuery !== "") {
      let thisCourses = [],
        allCourses = [];
      if (searchQuery !== "") {
        thisCourses = await Course.findAll({
          where: {
            [Op.and]: [
              {
                [Op.or]: [
                  { title: { [Op.startsWith]: searchQuery } },
                  { short_description: { [Op.startsWith]: searchQuery } },
                  { price: { [Op.startsWith]: searchQuery } },
                  { level: { [Op.startsWith]: searchQuery } },
                ],
              },
            ],
          },
          attributes: COURSE_INFO,
          order: [[sortBy, orderBy]],
          offset: +startFrom,
          limit: +endFrom - +startFrom,
        });

        allCourses = await Course.findAll({
          where: {
            [Op.and]: [
              {
                [Op.or]: [
                  { title: { [Op.startsWith]: searchQuery } },
                  { short_description: { [Op.startsWith]: searchQuery } },
                  { price: { [Op.startsWith]: searchQuery } },
                  { level: { [Op.startsWith]: searchQuery } },
                ],
              },
            ],
          },
        });
      }

      res.set("X-Total-Count", allCourses.length);
      res.set("Access-Control-Expose-Headers", "X-Total-Count");
      return res.status(200).json(courseFormatter(thisCourses));
    }
    const thisCourses = await Course.findAll({
      attributes: COURSE_INFO,
      order: [[sortBy, orderBy]],
      offset: +startFrom,
      limit: +endFrom - +startFrom,
    });

    const allCourses = await Course.findAll();

    res.set("X-Total-Count", allCourses.length);
    res.set("Access-Control-Expose-Headers", "X-Total-Count");

    return res.status(200).json(courseFormatter(thisCourses));
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

/**
 * getting course information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getOneCourse = async (req, res, next) => {
  const courseId = req.params["courseId"];

  try {
    const course = await Course.findOne({
      where: {
        id: courseId,
      },
      attributes: COURSE_INFO,
    });

    if (!course) {
      return res.status(404).json();
    }

    return res.status(200).json(courseFormatter([course])[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

/**
 * creating  Course
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

exports.createCourse = async (req, res, next) => {
  const response = new ResponseBuilder();
  const isRequestInvalid = requestValidator(req, response);
  if (isRequestInvalid) {
    return res.status(422).json(isRequestInvalid);
  }

  const {
    title,
    level,
    image,
    image_background_color,
    price,
    price_title,
    last_price,
    short_description,
    description,
    has_exam,
    exam_link,
    exam_try_count,
    exam_score,
    total_hours,
  } = req.body;

  try {
    const fileBase64 = image;
    // const fileBase64 = req.body["image"];

    let folderName;
    let time = new Date();
    /* For make difference in folder names */
    switch (time.getUTCMonth()) {
      case 0:
        folderName = time.getUTCFullYear().toString() + "-JANUARY";
        break;
      case 1:
        folderName = time.getUTCFullYear().toString() + "-FEBRUARY";
        break;
      case 2:
        folderName = time.getUTCFullYear().toString() + "-MARCH";
        break;
      case 3:
        folderName = time.getUTCFullYear().toString() + "-APRIL";
        break;
      case 4:
        folderName = time.getUTCFullYear().toString() + "-MAY";
        break;
      case 5:
        folderName = time.getUTCFullYear().toString() + "-JUNE";
        break;
      case 6:
        folderName = time.getUTCFullYear().toString() + "-JULY";
        break;
      case 7:
        folderName = time.getUTCFullYear().toString() + "-AUGUST";
        break;
      case 8:
        folderName = time.getUTCFullYear().toString() + "-SEPTEMBER";
        break;
      case 9:
        folderName = time.getUTCFullYear().toString() + "-OCTOBER";
        break;
      case 10:
        folderName = time.getUTCFullYear().toString() + "-NOVEMBER";
        break;
      case 11:
        folderName = time.getUTCFullYear().toString() + "-DECEMBER";
        break;
    }
    let parentFolder = "course-images";
    const fileConfig = {
      allowType: ["png", "jpg", "jpeg"],
      storePath: path.join(
        __dirname,
        "..",
        "..",
        "public",
        parentFolder,
        folderName,
        time.getTime() + "-" + uuid()
      ),
      parentPath: path.join(__dirname, "..", "..", "public", parentFolder),
      fileMaxSize: 3000,
    };

    let base64;
    let type;
    if (!fileBase64 || fileBase64.length === 0) {
      response.addDevMsg("file field didn't change");
      return res.status(422).json(response.build());
    }

    for (let i in fileConfig.allowType) {
      const mimeType = fileConfig.allowType[i];
      const validationPattern = `data:image/${mimeType};base64,`;
      const pattern = new RegExp(validationPattern);
      if (fileBase64.match(pattern)) {
        base64 = fileBase64.replace(pattern, "");
        type = mimeType;
      }
    }

    if (!base64) {
      response.setUserMessage("فرمت فایل ارسالی صحیح نمی باشد", "error");
      response.addDevMsg("file has invalid mimetype");
      return res.status(422).json(response.build());
    }

    const folderExistenceCheck = fs.existsSync(
      path.join(fileConfig.parentPath, folderName)
    );
    if (!folderExistenceCheck) {
      fs.mkdirSync(path.join(fileConfig.parentPath, folderName));
    }

    const completeFilePath = fileConfig.storePath + "." + type;
    fs.writeFileSync(completeFilePath, base64, "base64");

    const storedFile = fs.statSync(completeFilePath);

    const fileSize_KB =
      storedFile.size / 1000; /* convert file size from bytes to KB */
    if (fileSize_KB > fileConfig.fileMaxSize) {
      /* if received file in not small enough, we should delete it :) */
      fs.unlinkSync(completeFilePath);

      response.addDevMsg(
        `File size should not be more than ${fileConfig.fileMaxSize} KB`
      );
      response.setUserMessage(
        `حجم فایل ارسالی نباید بیشتراز ${fileConfig.fileMaxSize} کیلوبایت باشد`,
        "error"
      );
      return res.status(422).json(response.build());
    }

    const course = await Course.create({
      title,
      level,
      image_background_color,
      price_title,
      price,
      last_price,
      short_description,
      description,
      total_hours,
      exam_try_count,
      exam_score,
      exam_link,
      has_exam,
    });

    const fileAddressForSaveOnDB = completeFilePath
      .replace(fileConfig.parentPath, "")
      .replace(/\/|\\/, "")
      .replace(/\/|\\/g, "/");

    if (course.image) {
      fs.unlinkSync(
        path.join(__dirname, "..", "..", "public", parentFolder, course.image)
      );
    }
    // course.image = `${process.env.DOMAIN}/public/course-images/${fileAddressForSaveOnDB}`;
    
    course.image = fileAddressForSaveOnDB;
    const newCourse = await course.save();

    return res.status(201).json(newCourse.dataValues);
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

exports.updateOneCourse = async (req, res, next) => {
  const response = new ResponseBuilder();
  const isRequestInvalid = requestValidator(req, response);
  if (isRequestInvalid) {
    return res.status(422).json(isRequestInvalid);
  }
  const courseId = req.params["courseId"];
  const {
    title,
    level,
    image,
    image_background_color,
    price,
    price_title,
    last_price,
    short_description,
    description,
    has_exam,
    exam_link,
    exam_try_count,
    exam_score,
    total_hours,
  } = req.body;

  try {
    const course = await Course.findOne({
      where: {
        id: courseId,
      },
      attributes: COURSE_INFO,
    });

    if (!course) {
      return res.status(404).json();
    }

    const fileBase64 = image;
    // const fileBase64 = req.body["image"];

    let folderName;
    let time = new Date();
    /* For make difference in folder names */
    switch (time.getUTCMonth()) {
      case 0:
        folderName = time.getUTCFullYear().toString() + "-JANUARY";
        break;
      case 1:
        folderName = time.getUTCFullYear().toString() + "-FEBRUARY";
        break;
      case 2:
        folderName = time.getUTCFullYear().toString() + "-MARCH";
        break;
      case 3:
        folderName = time.getUTCFullYear().toString() + "-APRIL";
        break;
      case 4:
        folderName = time.getUTCFullYear().toString() + "-MAY";
        break;
      case 5:
        folderName = time.getUTCFullYear().toString() + "-JUNE";
        break;
      case 6:
        folderName = time.getUTCFullYear().toString() + "-JULY";
        break;
      case 7:
        folderName = time.getUTCFullYear().toString() + "-AUGUST";
        break;
      case 8:
        folderName = time.getUTCFullYear().toString() + "-SEPTEMBER";
        break;
      case 9:
        folderName = time.getUTCFullYear().toString() + "-OCTOBER";
        break;
      case 10:
        folderName = time.getUTCFullYear().toString() + "-NOVEMBER";
        break;
      case 11:
        folderName = time.getUTCFullYear().toString() + "-DECEMBER";
        break;
    }
    let parentFolder = "course-images";
    const fileConfig = {
      allowType: ["png", "jpg", "jpeg"],
      storePath: path.join(
        __dirname,
        "..",
        "..",
        "public",
        parentFolder,
        folderName,
        time.getTime() + "-" + uuid()
      ),
      parentPath: path.join(__dirname, "..", "..", "public", parentFolder),
      fileMaxSize: 3000,
    };

    let base64;
    let type;
    if (!fileBase64 || fileBase64.length === 0) {
      response.addDevMsg("file field didn't change");
      return res.status(422).json(response.build());
    }

    for (let i in fileConfig.allowType) {
      const mimeType = fileConfig.allowType[i];
      const validationPattern = `data:image/${mimeType};base64,`;
      const pattern = new RegExp(validationPattern);
      if (fileBase64.match(pattern)) {
        base64 = fileBase64.replace(pattern, "");
        type = mimeType;
      }
    }

    if (!base64) {
      response.setUserMessage("فرمت فایل ارسالی صحیح نمی باشد", "error");
      response.addDevMsg("file has invalid mimetype");
      return res.status(422).json(response.build());
    }

    const folderExistenceCheck = fs.existsSync(
      path.join(fileConfig.parentPath, folderName)
    );
    if (!folderExistenceCheck) {
      fs.mkdirSync(path.join(fileConfig.parentPath, folderName));
    }

    const completeFilePath = fileConfig.storePath + "." + type;
    fs.writeFileSync(completeFilePath, base64, "base64");

    const storedFile = fs.statSync(completeFilePath);

    const fileSize_KB =
      storedFile.size / 1000; /* convert file size from bytes to KB */
    if (fileSize_KB > fileConfig.fileMaxSize) {
      /* if received file in not small enough, we should delete it :) */
      fs.unlinkSync(completeFilePath);

      response.addDevMsg(
        `File size should not be more than ${fileConfig.fileMaxSize} KB`
      );
      response.setUserMessage(
        `حجم فایل ارسالی نباید بیشتراز ${fileConfig.fileMaxSize} کیلوبایت باشد`,
        "error"
      );
      return res.status(422).json(response.build());
    }

    const fileAddressForSaveOnDB = completeFilePath
      .replace(fileConfig.parentPath, "")
      .replace(/\/|\\/, "")
      .replace(/\/|\\/g, "/");
    console.log(123, fileAddressForSaveOnDB);
    if (course.image) {
      console.log(course.image);
      fs.unlinkSync(
        path.join(__dirname, "..", "..", "public", parentFolder, course.image)
      );
    }
    course.image = fileAddressForSaveOnDB;
    // course.image = `${process.env.DOMAIN}/public/course-images/${fileAddressForSaveOnDB}`;
    course.title = title;
    course.level = level;
    course.image_background_color = image_background_color;
    course.price = price;
    course.price_title = price_title;
    course.last_price = last_price;
    course.short_description = short_description;
    course.description = description;
    course.has_exam = has_exam;
    course.exam_link = exam_link;
    course.exam_try_count = exam_try_count;
    course.exam_score = exam_score;
    course.total_hours = total_hours;
    const updatedCourse = await course.save();

    return res.status(200).json(updatedCourse.dataValues);
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

exports.deleteOneCourse = async (req, res, next) => {
  const courseId = req.params["courseId"];

  try {
    const course = await Course.findOne({
      where: {
        id: courseId,
      },
      attributes: COURSE_INFO,
    });

    if (!course) {
      return res.status(404).json();
    }

    await course.destroy();
    /* do later */
    return res.status(200).json();
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};
