const axios = require("axios").default;

const base_URL = `https://api.kavenegar.com/v1/${process.env.KAVENEGAR_API}/`;

/**
 * configuration
 */
const onFailFunctionRecallTimeout = 15000; /* milliseconds */
const retryCount = 1;

const smsQueue = [];
/**
 * {
 * 		fnc: (, cb(error => true)),
 * 		info: info,
 * 		hasError: true/false
 * }
 */

const shouldQueueWork = {
	work: false,
	updateTime: new Date().getTime(),
};

/**
 * For make a pause in code execution
 * @param {Number} milliseconds
 */
const pause = (milliseconds) => {
	const now = new Date().getTime();
	/* this while loop will cause a code execution pause */
	while (new Date().getTime() - now < milliseconds) {}
};

/**
 * for adding queue in smsQueue
 * @param {Object} information
 * @param {function} fnc
 */
function addQueue(information, fnc) {
	smsQueue.push({
		fnc: fnc,
		info: information,
	});
	shouldQueueWork.updateTime = new Date().getTime();

	if (shouldQueueWork.work === false) {
		shouldQueueWork.work = true;
		queueHandler();
	}
}

/**
 * for handling queues
 */
async function queueHandler() {
	const startTime = new Date().getTime();
	const delayOnFail = onFailFunctionRecallTimeout;

	const deleteQueueItem = (index) => {
		smsQueue.splice(index, 1);
	};

	for (let i = 0; smsQueue.length !== 0; ) {
		const queue = smsQueue[i];
		let hasError = false;
		let thisFunctionRetryCount = retryCount;
		try {
			if (queue.fnc.constructor.name === "AsyncFunction") {
				await queue.fnc(queue.info, async function (err) {
					if (!err) {
						deleteQueueItem(i);
					} else {
						hasError = true;
						while (hasError && thisFunctionRetryCount > 0) {
							pause(delayOnFail);
							await queue.fnc(queue.info, function (err) {
								if (!err) {
									hasError = false;
								}
								thisFunctionRetryCount--;
							});
						}
						deleteQueueItem(i);
					}
				});
			} else {
				queue.fnc(queue.info, function (err) {
					if (!err) {
						deleteQueueItem(i);
					} else {
						hasError = true;
						while (hasError && thisFunctionRetryCount > 0) {
							pause(delayOnFail);
							queue.fnc(queue.info, function (err) {
								if (!err) {
									hasError = false;
								}
								thisFunctionRetryCount--;
							});
						}
						deleteQueueItem(i);
					}
				});
			}
		} catch (err) {
			console.log(err);
		}
	}

	if (startTime < shouldQueueWork.updateTime) {
		return queueHandler();
	}
	shouldQueueWork.work = false;
}

async function sendArraySMS(information, cb) {
	if (cb !== undefined) {
		try {
			const response = await axios.post(
				base_URL +
					`sms/sendarray.json?receptor=${information.receptors}&message=${information.msg}&sender=${information.sender}`
			);
			const data = response.data;

			console.log("sms sent");
			cb(); /* for continue to the next queue */
		} catch (err) {
			console.log(err.toString());
			console.log("sms error - array");
			cb(true);
		}
	}
}

async function sendVerificationSMS(information, cb) {
	if (cb !== undefined) {
		try {
			const response = await axios.get(
				base_URL +
					`verify/lookup.json?receptor=${information.receptor}&token=${information.token}&template=pms`
			);
			const data = response.data;
			// console.log("sms response data", data);
			console.log("sms sent");
			cb(); /* for continue to the next queue */
		} catch (err) {
			console.log(err.toString());
			console.log("sms error - verification");
			cb(true);
		}
	}
}

/**
 * for send array of sms (bulk sms)
 * @param {Array} receptors array of all receptors phone number
 * @param {String} message the message that should send to all
 */
function addSMSArray(receptors, message) {
	/* both receptors and messages and sender are array which should have equal length */
	const BULK_SMS_COUNT = 200;
	const receptorsCount = receptors.length;

	let step = 1;
	while ((step - 1) * BULK_SMS_COUNT <= receptorsCount) {
		const thisReceptors = receptors.slice(
			(step - 1) * BULK_SMS_COUNT,
			step * BULK_SMS_COUNT
		);

		const msgArray = [];
		for (let i in thisReceptors) {
			msgArray.push(encodeURI(message));
		}
		const senderArray = [];
		for (let i in thisReceptors) {
			senderArray.push("10008663");
		}
		const information = {
			receptors: JSON.stringify(thisReceptors),
			msg: JSON.stringify(msgArray),
			sender: JSON.stringify(senderArray),
		};

		addQueue(information, sendArraySMS);

		step++;
	}
}

/**
 * for send verification sms
 * @param {String} receptor receptor phone number
 * @param {String} token token that should send
 */
function addVerificationSMS(receptor, token) {
	const information = {
		receptor: receptor,
		token: encodeURI(token),
	};

	addQueue(information, sendVerificationSMS);
}

exports.addSMSArray = addSMSArray;

exports.addSMSForVerification = addVerificationSMS;
