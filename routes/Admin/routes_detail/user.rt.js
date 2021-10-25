const express = require("express");
const { body } = require("express-validator");
const { User } = require("../../../database/models");
const { Op } = require("sequelize");

const userController = require("../../../controllers/Admin/user.ct");

const router = express.Router();

router.get("/", userController.getAllUsers);

router.get("/:userId", userController.getOneUser);

router.post(
  "/",
  body("name")
    .notEmpty()
    .withMessage("لطفا نام خود را وارد کنید")
    .bail()
    .isLength({ min: 3 })
    .withMessage("نام شما بسیار کوتاه است"),
  body("username")
    .notEmpty()
    .withMessage("لطفا نام کاربری خود را وارد کنید")
    .bail()
    .isLength({ min: 3 })
    .withMessage("نام کاربری انتخابی بسیار کوتاه است")
    .bail()
    .custom((value) => {
      if (value.match(/^@/)) {
        throw "";
      }
      return true;
    })
    .withMessage("نام کاربری نباید با @ شروع شود")
    .bail()
    .custom(async (value) => {
      try {
        const users = await User.findAll({ where: { username: value } });
        console.log(users);
        console.log(1234);
        if (users.length > 0) {
          throw "";
        } else {
          return true;
        }
      } catch (err) {
        throw "";
      }
    })
    .withMessage("این نام کاربری قبلا استفاده شده است"),
  body("phone")
    .matches(/^0[0-9]{10}$/)
    .withMessage("شماره همراه وارد شده صحیح نمی باشد")
    .bail()
    .custom(async (value) => {
      try {
        const users = await User.findAll({ where: { phone: value } });
        if (users.length > 0) {
          throw "";
        } else {
          return true;
        }
      } catch (err) {
        throw "";
      }
    })
    .withMessage("این شماره همراه قبلا ثبت شده است"),
  userController.createUser
);

router.put(
  "/:userId",
  body("name")
    .notEmpty()
    .withMessage("لطفا نام خود را وارد کنید")
    .bail()
    .isLength({ min: 3 })
    .withMessage("نام شما بسیار کوتاه است"),
  body("username")
    .notEmpty()
    .withMessage("لطفا نام کاربری خود را وارد کنید")
    .bail()
    .isLength({ min: 3 })
    .withMessage("نام کاربری انتخابی بسیار کوتاه است")
    .bail()
    .custom((value) => {
      if (value.match(/^@/)) {
        throw "";
      }
      return true;
    })
    .withMessage("نام کاربری نباید با @ شروع شود")
    .bail()
    // .custom(async (value, { req }) => {
    //   try {
    //     const users = await User.findAll({
    //       where: { username: value, id: { [Op.ne]: req.body.id } },
    //     });
    //     if (users.length > 0) {
    //       throw "";
    //     } else {
    //       return true;
    //     }
    //   } catch (err) {
    //     throw "";
    //   }
    // })
    // .withMessage("این نام کاربری قبلا استفاده شده است")
	,
  body("phone")
    .matches(/^0[0-9]{10}$/)
    .withMessage("شماره همراه وارد شده صحیح نمی باشد")
    .bail()
    .custom(async (value) => {
      try {
        const users = await User.findAll({ where: { phone: value } });
        if (users.length > 0) {
          throw "";
        } else {
          return true;
        }
      } catch (err) {
        throw "";
      }
    })
    .withMessage("این شماره همراه قبلا ثبت شده است"),
  userController.updateOneUser
);

router.delete("/:userId", 
	userController.deleteOneUser
);

module.exports = router;
