const express = require("express");
const multer = require("multer");

/* import multer for upload files */
// const upload = require("../controllers/files.ct");
const upload = multer();

const route = express.Router();

const isAuth = require("../middlewares/auth");

const profileController = require("../controllers/profile.ct");

/**
 * prefix: /api/v1
 * description: This file is for handling file upload routes
 */

route.post(
	"/user/profile/image",
	isAuth /* for file uploading, user should be authenticated */,
	upload.none(),
	profileController.uploadProfileImages
);

module.exports = route;
