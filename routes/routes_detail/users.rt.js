const express = require("express");
const { query, param } = require("express-validator");

/* controllers */
const profileController = require("../../controllers/profile.ct");
const appController = require("../../controllers/app.ct");

const route = express.Router();

/**
 * prefix: /api/v1/users
 */
route.get(
	"/username",
	query("q").notEmpty().withMessage("عنوانی برای جست و جو یافت نشد"),
	profileController.getUserSuggestionForMentioning
);

route.get(
	"/:search/public-profile",
	param("search").notEmpty().withMessage("search param is not exist"),
	profileController.getUserPublicProfile
);

route.get(
	"/:search/public-profile/courses",
	param("search").notEmpty().withMessage("search param is not exist"),
	query("page")
		.notEmpty()
		.withMessage("page Query not send")
		.bail()
		.isNumeric()
		.withMessage("page Query should be number"),
	profileController.getUserPublicProfileCourses
);

route.get(
	"/download-page" /* contain query 'u' for search users and get invite code */,
	appController.getDownloadPageInformation
);
module.exports = route;
