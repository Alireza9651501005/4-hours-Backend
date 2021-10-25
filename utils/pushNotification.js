const fs = require("fs");
const path = require("path");

const admin = require("firebase-admin");

const { UserDevice } = require("../database/models");

let FIREBASE_CREDENTIAL;
let firebaseApp;
try {
	/* read firebase credential */
	FIREBASE_CREDENTIAL = JSON.parse(
		fs.readFileSync(
			path.join(
				__dirname,
				"..",
				"credentials",
				"pms-sample-firebase-sdk-credentials.json"
			),
			{
				encoding: "utf8",
			}
		)
	);

	/* initializing firebaseApp */
	firebaseApp = admin.initializeApp({
		credential: admin.credential.cert(FIREBASE_CREDENTIAL),
	});
} catch (err) {
	console.log(
		"-------------\n   read firebase credential got error\n-------------"
	);
	console.log(err);
}

/* ============================================================================================ */

/**
 * notification's topics (maybe become a table in database later)
 */
exports.notification_topics = {
	Star1: "one_star",
	Star2: "two_star",
	Star3: "three_star",
	Star4: "four_star",
	Star5: "five_star",
	topHundred: "top_hundred",
	topTen: "top_ten",
};

/**
 * For generate payload to send by notification
 * @param {String} title
 * @param {String} description
 * @param {Url} imageUrl
 * @param {Object} action
 * @param {String} textColor hex color
 * @param {String} backgroundColor hex color
 */
exports.notification_payload_generator = (
	title,
	description,
	imageUrl,
	action,
	textColor,
	backgroundColor
) => {
	const final = {
		title: title,
		description: description,
		image_url: imageUrl || "",
		text_color: textColor,
		bg_color: backgroundColor,
		action: JSON.stringify(action),
	};

	return final;
};

/**
 * For update device firebase_token
 * @param {UserDevice} device
 * @param {String} firebase_token
 */
exports.setOrUpdateFirebaseTokenForDevice = async (device, firebase_token) => {
	try {
		/* if firebase_token is empty */
		if (!firebase_token) {
			throw "firebase_token not send";
		}
		/* for prevent additional update */
		if (device.firebase_token === firebase_token) {
			return true;
		}

		device.firebase_token = firebase_token;
		await device.save();
		return true;
	} catch (err) {
		console.log(err);
		return false;
	}
};

/**
 * for send notificaion to one device
 * @param {String} deviceToken
 * @param {Object} payload key and value both should be string
 */
exports.sendNotification_OneDevice = async (deviceToken, payload) => {
	if (!firebaseApp) {
		console.log("firebaseApp not initalized");
		return false;
	}

	const finalDataInMessage = payload;

	console.log("one device ->", deviceToken);
	try {
		const message = await admin.messaging(firebaseApp).send({
			data: finalDataInMessage,
			token: deviceToken,
			android: {
				priority:
					"high" /* for show notification when app is close or in background running */,
			},
			apns: {
				headers: {
					"apns-priority": "10",
				},
			},
		});
		console.log("message response => \n", message);
	} catch (err) {
		console.log(err);
	}
};

/**
 * for send notification to all user's devices
 * @param {String} userId
 * @param {Object} payload key and value both should be string
 */
exports.sendNotification_OneUser = async (userId, payload) => {
	if (!firebaseApp) {
		console.log("firebaseApp not initalized");
		return false;
	}

	/* get this user all devices's firebase_token */
	const thisUserDevices = await UserDevice.findAll({
		where: {
			userId: userId,
			logged_in: true,
		},
	});

	/* get devices firebase_token */
	const tokens = [];
	for (let i = 0; i < thisUserDevices.length; i++) {
		const deviceToken = thisUserDevices[i].firebase_token;
		tokens.push(deviceToken);
	}

	console.log("user firebase tokens => ", tokens);

	const finalDataInMessage = payload;

	const filteredTokens = tokens.filter((el, index) => el !== "" && el !== null);

	console.log("user filtered firebase tokens => ", filteredTokens);

	if (filteredTokens.length === 0) {
		return;
	}

	try {
		const message = await admin.messaging(firebaseApp).sendMulticast({
			data: finalDataInMessage,
			tokens: filteredTokens,
			android: {
				priority:
					"high" /* for show notification when app is close or in background running */,
			},
			apns: {
				headers: {
					"apns-priority": "10",
				},
			},
		});
		console.log("message response => \n", message);
	} catch (err) {
		console.log(err);
	}
};

/**
 * for send notification to all registered users
 * @param {Object} payload key and value both should be string
 */
exports.sendNotification_AllUsers = async (payload) => {
	if (!firebaseApp) {
		console.log("firebaseApp not initalized");
		return false;
	}

	/* get all devices */
	const thisUserDevices = await UserDevice.findAll({
		where: { logged_in: true },
	});

	/* get devices firebase_token */
	const tokens = [];
	for (let i = 0; i < thisUserDevices.length; i++) {
		const deviceToken = thisUserDevices[i].firebase_token;
		tokens.push(deviceToken);
	}

	const finalDataInMessage = payload;

	const filteredTokens = tokens.filter((el, index) => el !== "" && el !== null);

	if (filteredTokens.length === 0) {
		return;
	}

	try {
		const message = await admin.messaging(firebaseApp).sendMulticast({
			data: finalDataInMessage,
			tokens: filteredTokens,
			android: {
				priority:
					"high" /* for show notification when app is close or in background running */,
			},
			apns: {
				headers: {
					"apns-priority": "10",
				},
			},
		});
		console.log("message response => \n", message);
	} catch (err) {
		console.log(err);
	}
};

/**
 * for sending notification by topic
 * @param {String} topic
 * @param {Object} payload key and value both should be string
 */
exports.sendNotification_ByTopic = async (topic, payload) => {
	if (!firebaseApp) {
		console.log("firebaseApp not initalized");
		return false;
	}

	const finalDataInMessage = payload;

	try {
		const message = await admin.messaging(firebaseApp).send({
			data: finalDataInMessage,
			topic: topic,
			android: {
				priority:
					"high" /* for show notification when app is close or in background running */,
			},
			apns: {
				headers: {
					"apns-priority": "10",
				},
			},
		});
		console.log("message response => \n", message);
	} catch (err) {
		console.log(err);
	}
};

/**
 * for send notification by topics condition
 * @param {String} topicCondition Firebase topics condition. e.g: "'TopicA' in topics && ('TopicB' in topics || 'TopicC' in topics)"
 * @param {Object} payload key and value both should be string
 */
exports.sendNotification_ByTopics_Condition = async (
	topicCondition,
	payload
) => {
	if (!firebaseApp) {
		console.log("firebaseApp not initalized");
		return false;
	}

	const finalDataInMessage = payload;

	try {
		if (!topicCondition) {
			throw "topicCondition not send to the function";
		}

		const message = await admin.messaging(firebaseApp).send({
			data: finalDataInMessage,
			topic: topicCondition,
			android: {
				priority:
					"high" /* for show notification when app is close or in background running */,
			},
			apns: {
				headers: {
					"apns-priority": "10",
				},
			},
		});
		console.log("message response => \n", message);
	} catch (err) {
		console.log(err);
	}
};

/**
 * for subscribe user to one topic
 * @param {Number} userId user's id
 * @param {String} topic
 */
exports.subscribeUserToTopic = async (userId, topic) => {
	if (!firebaseApp) {
		console.log("firebaseApp not initalized");
		return false;
	}

	/* get this user all devices's firebase_token */
	const thisUserDevices = await UserDevice.findAll({
		where: {
			userId: userId,
			logged_in: true,
		},
	});

	/* get devices firebase_token */
	const tokens = [];
	for (let i = 0; i < thisUserDevices.length; i++) {
		const deviceToken = thisUserDevices[i].firebase_token;
		tokens.push(deviceToken);
	}

	try {
		const response = await admin
			.messaging(firebaseApp)
			.subscribeToTopic(tokens, topic);
		console.log("response => \n", response);
	} catch (err) {
		console.log(err);
	}
};

/**
 * for unsubscribe user from one topic
 * @param {Number} userId user's id
 * @param {String} topic
 */
exports.unsubscribeUserFromTopic = async (userId, topic) => {
	if (!firebaseApp) {
		console.log("firebaseApp not initalized");
		return false;
	}

	/* get this user all devices's firebase_token */
	const thisUserDevices = await UserDevice.findAll({
		where: {
			userId: userId,
			logged_in: true,
		},
	});

	/* get devices firebase_token */
	const tokens = [];
	for (let i = 0; i < thisUserDevices.length; i++) {
		const deviceToken = thisUserDevices[i].firebase_token;
		tokens.push(deviceToken);
	}

	try {
		const response = await admin
			.messaging(firebaseApp)
			.unsubscribeFromTopic(tokens, topic);
		console.log("response => \n", response);
	} catch (err) {
		console.log(err);
	}
};

/**
 * for subscribe device to one topic
 * @param {Array<String>} deviceTokens device's firebase_token(s)
 * @param {String} topic
 */
exports.subscribeDevicesToTopic = async (deviceTokens, topic) => {
	if (!firebaseApp) {
		console.log("firebaseApp not initalized");
		return false;
	}

	try {
		const response = await admin
			.messaging(firebaseApp)
			.subscribeToTopic(deviceTokens, topic);
		console.log("response => \n", response);
	} catch (err) {
		console.log(err);
	}
};

/**
 * for unsubscribe device from one topic
 * @param {Array<String>} deviceTokens device's firebase_token(s)
 * @param {String} topic
 */
exports.unsubscribeDevicesFromTopic = async (deviceTokens, topic) => {
	if (!firebaseApp) {
		console.log("firebaseApp not initalized");
		return false;
	}

	try {
		const response = await admin
			.messaging(firebaseApp)
			.unsubscribeFromTopic(deviceTokens, topic);
		console.log("response => \n", response);
	} catch (err) {
		console.log(err);
	}
};
