const express = require("express");
const {
    body
} = require("express-validator");

const userCourseController = require("../../../controllers/Admin/userCourse.ct");

const router = express.Router();

router.get("/", userCourseController.getAllUserCourses);

router.get("/:userCourseId", userCourseController.getOneUserCourse);

router.post(
    "/",
    body("user_exam_count")
    .notEmpty()
    .withMessage("لطفا تعداد آزمونهای کاربر را وارد کنید")
    .bail(),
    body("course_title")
    .notEmpty()
    .withMessage("لطفا عنوان دوره را وارد کنید")
    .bail(),
    body("done")
    .notEmpty()
    .withMessage("لطفا وضعیت دوره کاربر را مشخص کنید")
    .bail(),
    userCourseController.createUserCourse
);
router.put(
    "/:userCourseId",
    body("user_exam_count")
    .notEmpty()
    .withMessage("لطفا تعداد آزمونهای کاربر را وارد کنید")
    .bail(),
    body("course_title")
    .notEmpty()
    .withMessage("لطفا عنوان دوره را وارد کنید")
    .bail(),
    body("done")
    .notEmpty()
    .withMessage("لطفا وضعیت دوره کاربر را مشخص کنید")
    .bail(),
    userCourseController.updateOneUserCourse,
);

router.delete("/:userCourseId",
    userCourseController.deleteOneUserCourse
);

module.exports = router;