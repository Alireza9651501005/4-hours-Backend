const jalaali = require("jalaali-js");
const Sequelize = require("sequelize");
const { Op } = require("sequelize");
const bcrypt = require("bcrypt");

const {
  User,
  Comment,
  Comment_User,
  User_Course,
  User_Lesson,
  UserDevice,
  Score,
  Wallet,
  Network,
} = require("../../database/models");

const { convertPersianNumberToEnglish } = require("../../utils/input");
const MAIN_CONFIG = require("../../config/mainConfig");
const ResponseBuilder = require("../../utils/responseBuilder");
const requestValidator = require("../../utils/requestValidator"); // for validating requests efficiently

const USER_INFO = [
  "id",
  "username",
  "name",
  "phone",
  "email",
  "password",
  "certificate",
  "gender",
  "monthly_rank",
  "yearly_rank",
  "stars",
  "createdAt",
];

const userFormatter = (users) => {
  const final = [];

  for (let i = 0; i < users.length; i++) {
    const user = { ...users[i].dataValues };
    const createdAt = jalaali.toJalaali(user.createdAt);
    user.createdAt = `${createdAt.jy}/${createdAt.jm}/${createdAt.jd}`;
    final.push(user);
  }

  return final;
};

/**
 * for creating a unique invite code for user
 */
const createAndSetInviteCode = async (user) => {
  const inviteCodeLength = MAIN_CONFIG.user_invite_code_length;
  let inviteCode = "";
  const letters =
    "1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let userWithThisInviteCodeExist = true;
  while (userWithThisInviteCodeExist) {
    inviteCode = "";
    for (let i = 1; i <= inviteCodeLength; i++) {
      inviteCode += letters[Math.round(Math.random() * (letters.length - 1))];
    }
    const sameUser = await User.findAll({ where: { invite_code: inviteCode } });
    userWithThisInviteCodeExist = sameUser.length !== 0;
  }
  /* when we sure that invite key is unique */
  try {
    user.invite_code = inviteCode;
    await user.save();
  } catch (err) {
    console.log(err);
  }
};

/**
 * For sending all users information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getAllUsers = async (req, res, next) => {
  const startFrom = req.query["_start"];
  const endFrom = req.query["_end"];
  const orderBy = req.query["_order"] || "ASC";
  const sortBy = req.query["_sort"];
  const all = req.query["_all"];
  const stars = +req.query["stars"];
  const searchQuery = req.query["q"] || "";

  const id = req.query.id;
  try {
    console.log(req.query);
    if (id && id.length > 0) {
      const users = [];
      for (let i = 0; i < id.length; i++) {
        const userId = id[i];
        const user = await User.findOne({
          where: {
            id: userId,
          },
        });
        users.push(user);
      }
      return res.status(200).json(userFormatter(users));
    }
    if (all) {
      const allUsers = await User.findAll();
      res.set("X-Total-Count", allUsers.length);
      res.set("Access-Control-Expose-Headers", "X-Total-Count");

      return res.status(200).json(userFormatter(allUsers));
    }
    if (searchQuery !== "" || stars >= 0) {
      let thisUsers = [],
        allUsers = [];
      if (searchQuery !== "" && stars >= 0) {
        thisUsers = await User.findAll({
          where: {
            [Op.and]: [
              {
                [Op.or]: [
                  { name: { [Op.startsWith]: searchQuery } },
                  { username: { [Op.startsWith]: searchQuery } },
                  { monthly_rank: { [Op.startsWith]: searchQuery } },
                  { yearly_rank: { [Op.startsWith]: searchQuery } },
                  { stars: { [Op.startsWith]: searchQuery } },
                ],
              },
              { stars: { [Op.eq]: stars } },
            ],
          },
          attributes: USER_INFO,
          order: [[sortBy, orderBy]],
          offset: +startFrom,
          limit: +endFrom - +startFrom,
        });

        allUsers = await User.findAll({
          where: {
            [Op.and]: [
              {
                [Op.or]: [
                  { name: { [Op.startsWith]: searchQuery } },
                  { username: { [Op.startsWith]: searchQuery } },
                  { monthly_rank: { [Op.startsWith]: searchQuery } },
                  { yearly_rank: { [Op.startsWith]: searchQuery } },
                  { stars: { [Op.startsWith]: searchQuery } },
                ],
              },
              { stars: stars },
            ],
          },
        });
      } else if (searchQuery !== "") {
        thisUsers = await User.findAll({
          where: {
            [Op.or]: [
              { name: { [Op.startsWith]: searchQuery } },
              { username: { [Op.startsWith]: searchQuery } },
              { monthly_rank: { [Op.startsWith]: searchQuery } },
              { yearly_rank: { [Op.startsWith]: searchQuery } },
              { stars: { [Op.startsWith]: searchQuery } },
            ],
          },
          attributes: USER_INFO,
          order: [[sortBy, orderBy]],
          offset: +startFrom,
          limit: +endFrom - +startFrom,
        });

        allUsers = await User.findAll({
          where: {
            [Op.or]: [
              { name: { [Op.startsWith]: searchQuery } },
              { username: { [Op.startsWith]: searchQuery } },
              { monthly_rank: { [Op.startsWith]: searchQuery } },
              { yearly_rank: { [Op.startsWith]: searchQuery } },
              { stars: { [Op.startsWith]: searchQuery } },
            ],
          },
        });
      } else if (true) {
        thisUsers = await User.findAll({
          where: {
            stars: stars,
          },
          attributes: USER_INFO,
          order: [[sortBy, orderBy]],
          offset: +startFrom,
          limit: +endFrom - +startFrom,
        });

        allUsers = await User.findAll({
          where: {
            stars: stars,
          },
        });
      }

      // res.set("Content-Range", `users 0-${allUsers.length}/${allUsers.length}`);
      res.set("X-Total-Count", allUsers.length);
      res.set("Access-Control-Expose-Headers", "X-Total-Count");

      return res.status(200).json(userFormatter(thisUsers));
    }
    const thisUsers = await User.findAll({
      attributes: USER_INFO,
      order: [[sortBy, orderBy]],
      offset: +startFrom,
      limit: +endFrom - +startFrom,
    });

    const allUsers = await User.findAll();

    // res.set("Content-Range", `users 0-${allUsers.length}/${allUsers.length}`);
    res.set("X-Total-Count", allUsers.length);
    res.set("Access-Control-Expose-Headers", "X-Total-Count");

    return res.status(200).json(userFormatter(thisUsers));
  } catch (err) {
    console.log(err);
    res.status(500).json({title: "comes frome users 63"});
  }
};

/**
 * For getting one user information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getOneUser = async (req, res, next) => {
  const userId = req.params["userId"];

  try {
    const user = await User.findOne({
      where: {
        id: userId,
      },
      attributes: USER_INFO,
    });

    if (!user) {
      return res.status(404).json();
    }

    return res.status(200).json(userFormatter([user])[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

/**
 * For creating new user
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.createUser = async (req, res, next) => {
  const response = new ResponseBuilder();

  const isRequestInvalid = requestValidator(req, response);
  if (isRequestInvalid) {
    console.log(isRequestInvalid);
    return res.status(422).json();
  }

  const { name, username, phone, email, password } = req.body;

  try {
    const user = await User.findOne({
      where: Sequelize.or({ username }, { phone }),
      attributes: USER_INFO,
    });

    if (user) {
      return res.status(422).json();
    }

    const hashPassword = await bcrypt.hash(
      convertPersianNumberToEnglish(password),
      10
    );

    const finalUsername = username.replace(/\s/g, "");

    const usersCount = await User.findAndCountAll();

    // creating new user
    const newUser = await User.create({
      name,
      username: finalUsername,
      phone: phone,
      password: hashPassword,
      email: email || null,
      security_update_time: new Date().toString(),
      generated_tokens_count: 1,
      phone_verified: true,
      monthly_rank: usersCount.count + 1,
      yearly_rank: usersCount.count + 1,
      invite_code: "",
    });

    /* for generating unique invite code for this user */
    createAndSetInviteCode(newUser);
    return res.status(201).json(newUser.dataValues);
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

exports.updateOneUser = async (req, res, next) => {
  const userId = req.params["userId"];
  const { name, username, phone, email, password } = req.body;
  try {
    const user = await User.findOne({
      where: {
        id: userId,
      },
      attributes: USER_INFO,
    });

    if (!user) {
      return res.status(404).json();
    }

    const hasAnotherUserByThisInfo = await User.findOne({
      where: Sequelize.and(Sequelize.or({ username }, { phone }), {
        id: { [Op.ne]: user.id },
      }),
    });

    if (hasAnotherUserByThisInfo) {
      return res.status(422).json();
    }

    email ? user.email = email : null;
    name ? user.name = name : null;
    phone ? user.phone = phone : null;
    username ? user.username = username : null;
    password ? password.indexOf('$') > -1 ? user.password = password : user.password = await bcrypt.hash(
      convertPersianNumberToEnglish(password),
      10
    ) : null;
    const updatedUser = await user.save();

    return res.status(200).json(updatedUser);
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};

exports.deleteOneUser = async (req, res, next) => {
  const userId = req.params["userId"];
//   const id = req.query.id;
  try {
    const user = await User.findOne({
      where: {
        id: userId,
      },
      attributes: USER_INFO,
    });

    if (!user) {
      return res.status(404).json();
    }
    /* do later */
	await user.destroy()

    return res.status(200).json();
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
};
