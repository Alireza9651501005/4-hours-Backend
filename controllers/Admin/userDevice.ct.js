const jalaali = require("jalaali-js");
const Sequelize = require("sequelize");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");

const { UserDevice, User } = require("../../database/models");

const { convertPersianNumberToEnglish } = require("../../utils/input");
const MAIN_CONFIG = require("../../config/mainConfig");
const ResponseBuilder = require("../../utils/responseBuilder");
const requestValidator = require("../../utils/requestValidator"); // for validating requests efficiently
const { trace } = require("console");

const USER_DEVICE_INFO = [
  "id",
  "os",
  "os_version",
  "brand",
  "device_uuid",
  "logged_in",
  "userId",
  "createdAt",
];

const userDeviceFormatter = (userdevices) => {
  const final = [];

  for (let i = 0; i < userdevices.length; i++) {
    // console.log(comments[i]);
    const userdevice = userdevices[i];
    const createdAt = jalaali.toJalaali(userdevice.createdAt);
    userdevice.createdAt = `${createdAt.jy}/${createdAt.jm}/${createdAt.jd}`;

    if (!userdevice.user) {
      const finalUserDevice = { ...userdevice.dataValues };
      final.push(finalUserDevice);
    } else {
      const finalUserDevice = {
        ...userdevice.dataValues,
        userId: userdevice.user.id,
        userName: userdevice.user.username,
      };
      final.push(finalUserDevice);
    }
  }
  return final;
};

/**
 * sending all userDevices information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

exports.getAllUserDevices = async (req, res, next) => {
  const startFrom = req.query["_start"];
  const endFrom = req.query["_end"];
  const orderBy = req.query["_order"] || "ASC";
  const sortBy = req.query["_sort"];
  const all = req.query["_all"];
  // const stars = +req.query["stars"];
  const searchQuery = req.query["q"] || "";

  try {
    if (all) {
      const allUserDevices = await UserDevice.findAll();
      console.log(allUserDevices);
      res.set("X-Total-Count", allUserDevices.length);
      res.set("Access-Control-Expose-Headers", "X-Total-Count");

      return res.status(200).json(userDeviceFormatter(allUserDevices));
    }
    if (searchQuery !== "") {
      let thisUserDevices = [],
        allUserDevices = [];
      if (searchQuery !== "") {
        thisUserDevices = await UserDevice.findAll({
          where: {
            [Op.or]: [
              { "$user.username$": { [Op.startsWith]: searchQuery } },
              { "$user.name$": { [Op.startsWith]: searchQuery } },
              { brand: { [Op.startsWith]: searchQuery } },
              { os: { [Op.startsWith]: searchQuery } },
            ],
          },
          include: [
            {
              as: "user",
              model: User,
              required: false,
            },
          ],
          // attributes: USER_DEVICE_INFO,
          order: [[sortBy, orderBy]],
          offset: +startFrom,
          limit: +endFrom - +startFrom,
        });

        allUserDevices = await UserDevice.findAll({
          where: {
            [Op.or]: [
              { "$user.username$": { [Op.startsWith]: searchQuery } },
              { "$user.name$": { [Op.startsWith]: searchQuery } },
              { brand: { [Op.startsWith]: searchQuery } },
              { os: { [Op.startsWith]: searchQuery } },
            ],
          },
          include: [
            {
              as: "user",
              model: User,
              required: false,
            },
          ],
        });
      }
      res.set("X-Total-Count", allUserDevices.length);
      res.set("Access-Control-Expose-Headers", "X-Total-Count");
      return res.status(200).json(userDeviceFormatter(thisUserDevices));
    }
    const thisUserDevices = await UserDevice.findAll({
      attributes: USER_DEVICE_INFO,
      order: [[sortBy, orderBy]],
      offset: +startFrom,
      limit: +endFrom - +startFrom,
      include: [User],
    });

    const allUserDevices = await UserDevice.findAll();

    res.set("X-Total-Count", allUserDevices.length);
    res.set("Access-Control-Expose-Headers", "X-Total-Count");

    return res.status(200).json(userDeviceFormatter(thisUserDevices));
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

exports.deleteOneUserDevice = async (req, res, next) => {
  const userDeviceId = req.params["userDeviceId"];

  try {
    const userDevice = await UserDevice.findOne({
      where: {
        id: userDeviceId,
      },
      attributes: USER_DEVICE_INFO,
    });

    if (!userDevice) {
      return res.status(404).json();
    }

    await userDevice.destroy();
    /* do later */
    return res.status(200).json();
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};
