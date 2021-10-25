const express = require("express");
const multer = require("multer");

const nonUpload = require("./nonUpload.api");
const uploadAPIRoute = require("./fileUpload.api");

const route = express.Router();
const form1 = multer().none();

/**
 * prefix: /api/v1
 */
route.use(uploadAPIRoute); /* routes for uploading file */
route.use(form1, nonUpload);

module.exports = route;
