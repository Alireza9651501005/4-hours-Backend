const express = require("express");
const multer = require("multer");

const protectedRoutes = require("./protectedRoutes.api");
const routes = require("./routes.api");
const uploadAPIRoute = require("./fileUpload.api");

const isAuth = require("../middlewares/auth");

const route = express.Router();
const form1 = multer().none();
const form2 = multer().any();

/**
 * prefix: /api/v1
 */
route.use(routes);
route.use(isAuth, protectedRoutes);

module.exports = route;
