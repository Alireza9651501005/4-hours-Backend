const express = require("express");
const {
	body,
} = require("express-validator");

// Importing required models

const route = express.Router();

/* controllers */
const authController = require("../../../controllers/Admin/auth.ct");
const Admin = require("../../../models/Admin.model");

/**
 * prefix: '/api/v1/admin'
 * version 1
 */

route.post(
	"/login",
	body("password").notEmpty().withMessage("رمزعبور خود را وارد کنید"),
	body("username")
	.notEmpty()
	.withMessage("نام کاربری خود را وارد کنید")
	.bail()
	.isLength({
		min: 5,
		max: 11
	})
	.withMessage(" نام کاربری وارد شده صحیح نیست")
	.bail(),
	authController.login
);

route.post(
	"/check",
	authController.check
);

module.exports = route;