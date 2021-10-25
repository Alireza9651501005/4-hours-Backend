const express = require("express");
const { body } = require("express-validator");

const settingController = require("../../../controllers/Admin/setting.ct");

const router = express.Router();

router.get("/", settingController.getAllSettings);

router.get("/:settingId", settingController.getOneSetting);

router.post(
	"/",
	body("key")
		.notEmpty()
		.withMessage("لطفا کلید را وارد کنید")
		.bail(),
        settingController.createSetting
);
router.put(
	"/:settingId",
    body("key")
    .notEmpty()
    .withMessage("لطفا کلید را وارد کنید")
    .bail(),
    settingController.updateOneSetting
);

router.delete("/:settingId",
	settingController.deleteOneSetting
);

module.exports = router;
