const jwt = require("jsonwebtoken");
const uuid = require("uuid").v4;

const { UserDevice } = require("../database/models");

const MAIN_CONFIG = require("../config/mainConfig");

/* translate os to os name */
const translateOsToOsName = (os) => {
	switch (+os) {
		case 1:
			return "android";
		case 2:
			return "iOS";
		case 3:
			return "windows";
		case 4:
			return "browser";
	}
};

const generateBrowserPWAClientUUID = async () => {
	let finalUUID = "w0" + uuid();
	let sameDeviceUUID = await UserDevice.findOne({
		where: { device_uuid: finalUUID },
	});
	while (sameDeviceUUID) {
		finalUUID = "w0" + uuid();
		sameDeviceUUID = await UserDevice.findOne({
			where: { device_uuid: finalUUID },
		});
	}

	return finalUUID;
};

/**
 * for working with user tracking info
 * @param {req} req
 * @param {res} res
 * @param {next} next
 */
const setTrackingInfo = async (req, res, next) => {
	const client_id = req.headers["client_id"];

	console.log("client_id =>", client_id);

	const token = req.headers["authorization"];
	/* ============================================================== */
	let device_uuid = req.headers["device_uuid"];
	/* ============================================================== */
	const os = req.headers["os"];
	const os_version = req.headers["os_version"];
	const device_brand = req.headers["device_brand"];

	/* For set access to web front site */
	if (client_id === MAIN_CONFIG.__WEB_CLIENT_ID) {
		return next();
	}

	/* For set access to pwa front site */
	if (client_id === MAIN_CONFIG.__PWA_CLIENT_ID) {
		/* should add device verification later */
		if (!device_uuid) {
			device_uuid = await generateBrowserPWAClientUUID();
			// res.setHeader("uuid", device_uuid);
			req.DeviceUUID = device_uuid;
			console.log(device_uuid);
		}
		// return next();
	}

	// console.log(device_uuid);

	let information_exist = false;
	let user_registered = false;
	let createNewDeviceRecord = false;

	console.log("-----  url =>", req.originalUrl);

	let user;
	if (token && device_uuid) {
		try {
			const accessToken = token.split(" ")[1];
			user = jwt.verify(accessToken, process.env.TOKEN_SECRET);
			console.log("user found");
			if (user && user.config.isRefreshToken === false) {
				user_registered = true;
				information_exist = true;
			}
		} catch (err) {
			console.log(err);
		}

		console.log("token =>", token ? true : false);
		console.log("device_uuid =>", device_uuid);
	} else if (os && os_version && device_brand && device_uuid) {
		information_exist = true;
		createNewDeviceRecord = true;
		console.log("device_uuid =>", device_uuid);
		console.log("os =>", os);
		console.log("os_version =>", os_version);
		console.log("device_brand =>", device_brand);
	}

	const startTime = new Date();

	try {
		if (!information_exist) {
			return res
				.status(403)
				.json({ error: "required info did not send in request" });
		}
		if (!user_registered) {
			const deviceExist = await UserDevice.findOne({
				where: {
					device_uuid: device_uuid,
					os: translateOsToOsName(os),
					os_version: os_version,
					brand: device_brand,
					userId: null,
				},
			});
			if (deviceExist) {
				console.log("device found");
				req.userDevice = deviceExist;
				const endTime = new Date();
				console.log(endTime.getTime() - startTime.getTime());
				return next();
			}
			console.log("device not found");
			// if (deviceExist.length === 0) {
			const newDevice = await UserDevice.create({
				os: translateOsToOsName(os),
				os_version: os_version,
				brand: device_brand,
				device_uuid: device_uuid,
			});
			req.userDevice = newDevice;
			const endTime = new Date();
			console.log(endTime.getTime() - startTime.getTime());
			return next();
		}
		const userDevice = await UserDevice.findOne({
			where: {
				device_uuid: device_uuid,
				userId: user.userId,
				logged_in: true,
			},
		});
		console.log("device for this user not found");
		if (!userDevice) {
			console.log("device not found while user got token");
			return res.status(403).json({
				data: null,
				message: {
					message: "مجددا وارد شوید",
					type: "error",
					popup: false,
				},
				error: ["no device for this token exist"],
			});
		}
		req.userDevice = userDevice;
		const endTime = new Date();
		console.log(endTime.getTime() - startTime.getTime());
		return next();
	} catch (err) {
		return res.status(500).json({ error: [err.toString()] });
	}
};

module.exports = setTrackingInfo;
