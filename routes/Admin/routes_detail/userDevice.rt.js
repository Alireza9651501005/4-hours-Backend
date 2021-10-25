const express = require("express");
const { body } = require("express-validator");

const userDeviceController = require("../../../controllers/Admin/userDevice.ct");

const router = express.Router();

router.get("/", userDeviceController.getAllUserDevices);

router.delete("/:userDeviceId",
    userDeviceController.deleteOneUserDevice
);

module.exports = router;