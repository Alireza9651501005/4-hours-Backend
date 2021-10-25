const express = require("express");
const { body, query } = require("express-validator");

const route = express.Router();

/* controllers */
const appController = require("../../controllers/app.ct");

/* middleware */
const setUserInfo = require("../../middlewares/setUserInfo");

/**
 * prefix: '/api/v1/app'
 * version 1
 */

route.post(
	"/startup",
	setUserInfo,
	body("app_version").notEmpty().withMessage("app_version didn't send"),
	appController.startup
);

route.get("/home", setUserInfo, appController.getHomeContent);

route.get(
	"/latest-course",
	setUserInfo,
	query("page")
		.notEmpty()
		.withMessage("page QUERY not set")
		.bail()
		.isNumeric()
		.withMessage("page QUERY should be number"),
	appController.getLatestCourse
);

route.get(
	"/instagram-lives",
	query("page")
		.notEmpty()
		.withMessage("page QUERY not set")
		.bail()
		.isNumeric()
		.withMessage("page QUERY should be number"),
	appController.getInstagramLives
);

route.get("/awards", appController.getAwardContent);

route.post(
	"/fb-token",
	body("firebase_token").notEmpty().withMessage(),
	appController.updateDeviceFirebaseToken
);

module.exports = route;
