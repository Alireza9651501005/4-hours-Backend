const express = require("express");
const { body } = require("express-validator");

const scoreController = require("../../../controllers/Admin/score.ct");

const router = express.Router();

router.get("/", scoreController.getAllScores);

router.get("/:scoreId", scoreController.getOneScore);

router.post(
	"/",
	body("score")
		.notEmpty()
		.withMessage("لطفا امتیاز را وارد کنید")
		.bail(),
    body("field")
		.notEmpty()
		.withMessage("لطفا فیلد را وارد کنید")
		.bail(),
    body("element_id")
		.notEmpty()
		.withMessage("لطفا آیدی فیلد را وارد کنید")
        .bail(),
    // body("negative")
	// 	.notEmpty()
	// 	.withMessage("لطفا منفی را وارد کنید")
    //     .bail(), 
        scoreController.createScore
);

router.put(
	"/:scoreId",
    body("score")
    .notEmpty()
    .withMessage("لطفا امتیاز را وارد کنید")
    .bail(),
body("field")
    .notEmpty()
    .withMessage("لطفا فیلد را وارد کنید")
    .bail(),
body("element_id")
    .notEmpty()
    .withMessage("لطفا آیدی فیلد را وارد کنید")
    .bail(),
body("negative")
    .notEmpty()
    .withMessage("لطفا منفی را وارد کنید")
    .bail(), 
    scoreController.updateOneScore
);

router.delete("/:scoreId",
	scoreController.deleteOneScore
);

module.exports = router;
