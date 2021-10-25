const path = require("path");

// importing packages
const express = require("express");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

// importing database
const sql = require("./database/database");
const sqlRelation = require("./database/relations");

/* utility non-request handler modules */
const { updateMonthlyAndYearlyRank } = require("./controllers/score.ct");

// importing routes
const APIRoute = require("./routes/api");
const AdminRoutes = require("./routes/Admin/api");
const testRoute = require("./routes/routes_detail/test.rt");

const corsConfig = require("./config/cors");

/* importing userTracking middle-ware */
const userTracking = require("./middlewares/setTrackingInfo");
const isAdminAuth = require("./middlewares/adminAuth");


const app = express();

// setting app configurations
app.use(morgan("combined"));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true }));
app.use(bodyParser.json({limit: '50mb', extended: true }));
app.use(helmet());
app.use(
	cors({
		origin: corsConfig.origins,
		allowedHeaders: corsConfig.headers,
		exposedHeaders: corsConfig.exposedHeaders,
		methods: corsConfig.methods,
		"Access-Control-Expose-Headers": "X-Total-Count, Uuid",
		// credentials: true,
	})
);
app.use(
	"/public",
	express.static(path.join(__dirname, "public"))
); /* For static file serving */

// defining routes
app.use("/admin", AdminRoutes);
app.use("/api/v1", userTracking, APIRoute);
app.use("/test", testRoute);

app.use("/", (req, res, next) => {
	res.send(
		"<h3 style='text-align: center; margin-top: 50px'>Hello, I'm fine. What about you?</h3>"
	);
});

app.use((error, req, res, next) => {
	console.log("========= COMES FROM PMS-SERVER =======", error);
	res.status(500).send(error);
});

// defining the server port
const PORT = process.env.PORT || 5000;

/* defining database relations */
sqlRelation();
sql
	.sync() // should change
	// .sync({ alter: true })
	.then(() => {
		app.listen(PORT, (err) => {
			if (err) {
				console.log(err);
			} else {
				console.log(`\nSERVER IS RUNNING ON PORT ${PORT} ...\n`);
			}
		});

		/* for updating monthly and yearly rank */
		try {
			const hours = 1.5;
			updateMonthlyAndYearlyRank(hours * 60 * 60 * 1000);
		} catch (err) {
			console.log("update ranking error");
			console.log(err);
		}
	})
	.catch((err) => {
		console.log(err);
	});
