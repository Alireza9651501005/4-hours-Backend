const express = require("express");

const authRoute = require("./routes_detail/auth.rt");
const appRoute = require("./routes_detail/app.rt");
const coursesRoute = require("./routes_detail/courses.rt");
const usersRoute = require("./routes_detail/users.rt");
const paymentRoute = require("./routes_detail/payment.rt");
const lessonsRoutes = require("./routes_detail/lessons.rt");


/* importing some middleware */
const setUserInfo = require("../middlewares/setUserInfo");

const route = express.Router();

/**
 * prefix: /api/v1
 */

route.use("/user", authRoute);
route.use("/app", appRoute);
route.use("/courses", setUserInfo, coursesRoute);
route.use("/courses", lessonsRoutes);

route.use("/users", usersRoute);
// route.use("/payment", paymentRoute);

module.exports = route;
