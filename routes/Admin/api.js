const express = require("express");

const fileUploader = require("../../controllers/files.ct");
/* sub routes */
const userRoutes = require("./routes_detail/user.rt");
const courseRoutes = require("./routes_detail/course.rt");
const chapterRoutes = require("./routes_detail/chapter.rt");
const lessonRoutes = require("./routes_detail/lesson.rt");
const commentRoutes = require("./routes_detail/comment.rt");
const paymentLogRoutes = require("./routes_detail/paymentLog.rt");
const walletRoutes = require("./routes_detail/wallet.rt");
const userCourseRoutes = require("./routes_detail/userCourse.rt");
const authRoutes = require("./routes_detail/auth.rt");
const isAdmin = require("../../middlewares/adminAuth");
const userDeviceRoutes = require("./routes_detail/userDevice.rt");
const discountRoutes = require("./routes_detail/discount.rt");
const tagRoutes = require("./routes_detail/tag.rt");
const messageRoutes = require("./routes_detail/message.rt");
const attachmentRoutes = require("./routes_detail/attachment.rt");
const networkRoutes = require("./routes_detail/network.rt");
const orderRoutes = require("./routes_detail/order.rt");
const scoreRoutes = require("./routes_detail/score.rt");
const settingRoutes = require("./routes_detail/setting.rt");

const router = express.Router();

router.use("/api/v1/attachments", isAdmin,fileUploader.single(), attachmentRoutes);
router.use("/api/v1/chapters", isAdmin, chapterRoutes);
router.use("/api/v1/comments", isAdmin, commentRoutes);
router.use("/api/v1/contents", (req, res, next) => {});
router.use("/api/v1/courses", isAdmin, fileUploader.single(), courseRoutes);
router.use("/api/v1/discounts",isAdmin, discountRoutes);
router.use("/api/v1/lessons", isAdmin, lessonRoutes);
router.use("/api/v1/messages", isAdmin, messageRoutes);
router.use("/api/v1/networks",isAdmin, networkRoutes);
router.use("/api/v1/orders", isAdmin, orderRoutes);
router.use("/api/v1/paymentlogs", isAdmin, paymentLogRoutes);
router.use("/api/v1/scores", isAdmin, scoreRoutes);
router.use("/api/v1/settings", isAdmin, settingRoutes);
router.use("/api/v1/tags", isAdmin, tagRoutes);
router.use("/api/v1/users", isAdmin, userRoutes);
router.use("/api/v1/user_courses", isAdmin, userCourseRoutes);
router.use("/api/v1/userdevices",isAdmin, userDeviceRoutes);
router.use("/api/v1/wallets", isAdmin, walletRoutes);
router.use("/api/v1/auth", authRoutes);

module.exports = router;