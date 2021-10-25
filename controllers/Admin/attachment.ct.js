const jalaali = require("jalaali-js");
const Sequelize = require("sequelize");
const { Op } = require("sequelize");
const fs = require("fs");
const uuid = require("uuid").v4;
const path = require("path");

const { Course, Attachment } = require("../../database/models");

const { convertPersianNumberToEnglish } = require("../../utils/input");
const MAIN_CONFIG = require("../../config/mainConfig");
const ResponseBuilder = require("../../utils/responseBuilder");
const requestValidator = require("../../utils/requestValidator"); // for validating requests efficiently
const attachment = require("../../models/Attachment.model");

const ATTACHMENT_INFO = [
  "id",
  "title",
  "type",
  "filename",
  "courseId",
  "createdAt",
];

const attachmentFormatter = (attachments) => {
	const final = [];

	for (let i = 0; i < attachments.length; i++) {
        // console.log(chapters[i]);
		const attachment = attachments[i];
		const createdAt = jalaali.toJalaali(attachment.createdAt);
		attachment.createdAt = `${createdAt.jy}/${createdAt.jm}/${createdAt.jd}`;
    // (attachment.filename = attachment.filename
    //   ? `${process.env.DOMAIN}/public/attachment-files/${attachment.filename}`
    //   : `${process.env.DOMAIN}/public/attachment-files/sample.pdf`)
		if (!attachment.course) {
			const finalAttachment = {...attachment.dataValues,};
			final.push(finalAttachment);
		}else{
			const finalAttachment = {
				...attachment.dataValues,
				courseId: attachment.course.id,
			}
			// console.log(finalAttachment.courseId);
			final.push(finalAttachment);
		}
	}
	return final;
};

/**
 * sending all attachment information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

exports.getAllAttachments = async (req, res, next) => {
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
			const attachments = []
			for (let i = 0; i < id.length; i++) {
				const attachmentId = id[i];
				const attachment = await Attachment.findOne({
					where:{
						id:attachmentId,
					}
				})
				courses.push(attachment)
			}
			return res.status(200).json(attachmentFormatter(attachments));
		}
    if (all) {
      const allAttachments = await Attachment.findAll();
      res.set("X-Total-Count", allAttachments.length);
      res.set("Access-Control-Expose-Headers", "X-Total-Count");

      return res.status(200).json(attachmentFormatter(allAttachments));
    }
    if (searchQuery !== "") {
      let thisAttachments = [],
        allAttachments = [];
      if (searchQuery !== "") {
        thisAttachments = await Attachment.findAll({
          where: {
            [Op.or]: [
              { "$course.title$": { [Op.startsWith]: searchQuery } },
              { type: { [Op.like]: searchQuery } },
              { title: { [Op.startsWith]: searchQuery } },
            ],
          },
          include: [
            {
              as: 'course',
              model: Course,
              required: false,
            },
          ],
          attributes: ATTACHMENT_INFO,
          order: [[sortBy, orderBy]],
          offset: +startFrom,
          limit: +endFrom - +startFrom,
          include: [Course],
        });

        allAttachments = await Attachment.findAll({
          where: {
            [Op.or]: [
              { "$course.title$": { [Op.startsWith]: searchQuery } },
              { type: { [Op.like]: searchQuery } },
              { title: { [Op.startsWith]: searchQuery } },
            ],
          },
          include: [
            {
              as: 'course',
              model: Course,
              required: false,
            },
          ],
        });
      }

      res.set("X-Total-Count", allAttachments.length);
      res.set("Access-Control-Expose-Headers", "X-Total-Count");
      return res.status(200).json(attachmentFormatter(thisAttachments));
    }
    const thisAttachments = await Attachment.findAll({
      attributes: ATTACHMENT_INFO,
      order: [[sortBy, orderBy]],
      offset: +startFrom,
      limit: +endFrom - +startFrom,
      include: [Course],
    });

    const allAttachments = await Attachment.findAll();

    res.set("X-Total-Count", allAttachments.length);
    res.set("Access-Control-Expose-Headers", "X-Total-Count");

    return res.status(200).json(attachmentFormatter(thisAttachments));
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

/**
 * getting attachment information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getOneAttachment = async (req, res, next) => {
  const attachmentId = req.params["attachmentId"];

  try {
    const attachment = await Attachment.findOne({
      where: {
        id: attachmentId,
      },
      attributes: ATTACHMENT_INFO,
    });

    if (!attachment) {
      return res.status(404).json();
    }

    return res.status(200).json(attachmentFormatter([attachment])[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

/**
 * creating  attachment
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

 exports.createAttachment = async (req, res, next) => {
    const response = new ResponseBuilder();
    const isRequestInvalid = requestValidator(req, response);
    if (isRequestInvalid) {
      return res.status(422).json(isRequestInvalid);
    }
  
    const {
      title,
      type,
      filename,
      courseId,
    } = req.body;
  
    try {
      const fileBase64 = filename;
  
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
      let parentFolder = "attachment-files";
      const fileConfig = {
        allowType: ["pdf", "doc", "txt"],
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
        fileMaxSize: 4096,
      };
  
      let base64;
      let type;
      if (!fileBase64 || fileBase64.length === 0) {
        response.addDevMsg("file field didn't change");
        return res.status(422).json(response.build());
      }
  
      for (let i in fileConfig.allowType) {
        const mimeType = fileConfig.allowType[i];
        const validationPattern = `data:filename${mimeType};base64,`;
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
        storedFile.size / 10000000; /* convert file size from bytes to KB */
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
  
      const attachment = await Attachment.create({
        title,
        type,
        courseId,
      });
  
      const fileAddressForSaveOnDB = completeFilePath
        .replace(fileConfig.parentPath, "")
        .replace(/\/|\\/, "")
        .replace(/\/|\\/g, "/");
  
      if (attachment.filename) {
        fs.unlinkSync(
          path.join(__dirname, "..", "..", "public", parentFolder, attachment.filename)
        );
      }
      attachment.filename = fileAddressForSaveOnDB;
      const newAttachment = await attachment.save();
  
      return res.status(201).json(newAttachment.dataValues);
    } catch (err) {
      console.log(err);
      res.status(500).json();
    }
  };
  
  exports.updateOneAttachment = async (req, res, next) => {
    const response = new ResponseBuilder();
    const isRequestInvalid = requestValidator(req, response);
    if (isRequestInvalid) {
      return res.status(422).json(isRequestInvalid);
    }
    const attachmentId = req.params["attachmentId"];
    const {
      title,
      type,
      filename,
      courseId,
    } = req.body;
  
    try {
      const attachment = await Attachment.findOne({
        where: {
          id: attachmentId,
        },
        attributes: ATTACHMENT_INFO,
      });
  
      if (!attachment) {
        return res.status(404).json();
      }
  
      const fileBase64 = filename;
  
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
      let parentFolder = "attachment-files";
      const fileConfig = {
        allowType: ["pdf", "doc", "txt"],
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
        const validationPattern = `data:filename/${mimeType};base64,`;
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
      if (attachment.filename) {
        console.log(attachment.filename);
        fs.unlinkSync(
          path.join(__dirname, "..", "..", "public", parentFolder, attachment.filename)
        );
      }
      attachment.filename = fileAddressForSaveOnDB;
      attachment.title = title;
      attachment.type = type;
      attachment.courseId = courseId;
      const updatedAttachment = await attachment.save();
  
      return res.status(200).json(updatedAttachment);
    } catch (err) {
      console.log(err);
      res.status(500).json();
    }
  };
  

exports.deleteOneAttachment = async (req, res, next) => {
  const attachmentId = req.params["attachmentId"];

  try {
    const attachment = await Attachment.findOne({
      where: {
        id: attachmentId,
      },
      attributes: ATTACHMENT_INFO,
    });

    if (!attachment) {
      return res.status(404).json();
    }

    await attachment.destroy();
    /* do later */
    return res.status(200).json();
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

