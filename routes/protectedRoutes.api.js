const express = require("express");

/**
 * importing routes that should protected
 */
// const testRoutes = require("./routes_detail/test.rt");
const profileRoutes = require("./routes_detail/profile.rt");
// const lessonsRoutes = require("./routes_detail/lessons.rt");
const paymentRoutes = require("./routes_detail/payment.rt");

const route = express.Router();

/**
 * prefix: /api/v1
 */

route.use("/user/profile", profileRoutes);
// route.use("/courses", lessonsRoutes);
route.use("/payment", paymentRoutes);
// route.use(testRoutes);

module.exports = route;
