const express = require("express");
const exec = require("child_process").exec;

const {
	sendNotification_OneDevice,
	notification_payload_generator,
} = require("../../utils/pushNotification");
const { UserDevice } = require("../../database/models");

const { VIEWS } = require("../../config/app");

const route = express.Router();

route.post("/test", async (req, res, next) => {
	// res.send("test worked");
	const deviceToken = req.body.token;
	const notifyAction = req.body.action;
	try {
		const device = await UserDevice.findOne({
			where: { firebase_token: deviceToken },
		});
		if (device) {
			const action =
				notifyAction !== undefined
					? notifyAction
					: {
							type: VIEWS.profile_view,
							title: "پروفایل من",
					  };
			const payload = notification_payload_generator(
				"test",
				"متن آزمایشی برای تست نوتیف",
				null,
				action,
				"#000",
				"#fff"
			);

			sendNotification_OneDevice(device.firebase_token, payload);
			return res.status(200).json();
		}

		return res.status(404).json();
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
});

route.get("/logs", async (req, res, next) => {
	const secret = "GCs1opcuBY5AbLTf0jnV";
	const userSecret = req.query.srt;
	try {
		if (secret !== userSecret) {
			return res.status(403).json();
		}

		exec("pm2 logs", { timeout: 4000 }, (err, stdout, stderr) => {
			if (stdout) {
				return res.status(200).send(stdout);
			} else {
				return res.status(500).send("inja");
			}
		});
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
});

module.exports = route;
