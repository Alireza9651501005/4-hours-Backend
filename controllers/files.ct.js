/*
 * This controller have to handle server
 * file uploading by create an instance of multer
 */
const fs = require("fs");
const path = require("path");

const multer = require("multer");
const uuid = require("uuid").v4;

const ROUTE_LIST = {
  profileImage: {
    originalURL: "/api/v1/user/profile/image",
    mainDirectoryName: "profile-images",
    allowType: ["png", "jpg", "jpeg", "gif"],
    maxSize: 2048 /* in KB */,
  },
  courseImage: {
    originalURL: "/admin/api/v1/courses",
    mainDirectoryName: "course-images",
    allowType: ["png", "jpg", "jpeg", "gif"],
    maxSize: 2048 /* in KB */,
  },
  attachmentFile: {
    originalURL: "/admin/api/v1/attachments",
    mainDirectoryName: "attachment-files",
    // mainDirectoryName: "course-attachments",
    allowType: ["pdf", "doc", "txt"],
    maxSize: 4096 /* in KB */,
  },
};

const fileStorage = multer.diskStorage({
  destination: destinationHandler,
  filename: filenameHandler,
});

function destinationHandler(req, file, cb) {
  let mainDirectory = "";
  let folderName = "";

  /* For set mainDirectory difference by api end point */
  switch (req.originalUrl) {
    case ROUTE_LIST.profileImage.originalURL:
      /* set path for uploading profile images */
      mainDirectory = ROUTE_LIST.profileImage.mainDirectoryName;
      break;
    case ROUTE_LIST.courseImage.originalURL:
      /* set path for uploading courseImages */
      mainDirectory = ROUTE_LIST.courseImage.mainDirectoryName;
      break;
    case ROUTE_LIST.attachmentFile.originalURL:
      /* set path for uploading attachmentFiles */
      mainDirectory = ROUTE_LIST.attachmentFile.mainDirectoryName;
      break;
    default:
      return;
  }

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

  const fullDirectory = "public/" + mainDirectory + "/" + folderName;

  /* check if directory exist or not */
  const directoryExist = fs.existsSync(fullDirectory);
  if (!directoryExist) {
    fs.mkdir(fullDirectory, () => {
      cb(null, fullDirectory);
    });
  }

  cb(null, fullDirectory);
}

function filenameHandler(req, file, cb) {
  const time = new Date();
  const filenameToStore =
    time.getTime() + "-" + uuid() + "-" + file.originalname;
  cb(null, filenameToStore);
}

function fileFilter(req, file, cb) {
  let fileSize = file.size / 1000; /* convert to KB */

  let validFileExtension = false;

  /**
   * for file check
   * @param {object} Rules Route rules
   */
  const fileCheck = (Rules) => {
    /* For checking file type validation */
    for (let i in Rules.allowType) {
      const type = Rules.allowType[i];
      if (file.mimetype.split("/")[1] === type) {
        validFileExtension = true;
      }
    }
    /* for setting our custom rule for file to use in api controller */
    req.fileInfo = Rules;

    if (validFileExtension) {
      /* in valid cases */
      cb(null, true);
    } else {
      /* in invalid cases */
      cb(null, false);
    }
  };

  switch (req.originalUrl) {
    case ROUTE_LIST.profileImage.originalURL:
      fileCheck(ROUTE_LIST.profileImage);
      break;
    case ROUTE_LIST.courseImage.originalURL:
      fileCheck(ROUTE_LIST.courseImage);
      break;
    case ROUTE_LIST.attachmentFile.originalURL:
      fileCheck(ROUTE_LIST.attachmentFile);
      break;
  }
}

module.exports = multer({ storage: fileStorage, fileFilter: fileFilter });
