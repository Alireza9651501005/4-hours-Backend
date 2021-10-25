const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

// ============================================================
/**
 * configuration
 */
const onFailFunctionRecallTimeout = 15000; /* milliseconds */
const retryCount = 1;

const emailQueue = [];
/**
 * {
 * 		fnc: (info , cb(error => true)),
 * 		info: info,
 * 		hasError: true/false
 * }
 */

const shouldQueueWork = {
	work: false,
	updateTime: new Date().getTime(),
};
// ============================================================

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
 * for adding queue in emailQueue
 * @param {Object} information
 * @param {function} fnc
 */
function addQueue(information, fnc) {
	emailQueue.push({
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
		emailQueue.splice(index, 1);
	};

	for (let i = 0; emailQueue.length !== 0; ) {
		const queue = emailQueue[i];
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

async function sendVerificationEmail(information, cb) {
	if (cb !== undefined) {
		try {
			const transport = nodemailer.createTransport({
				service: "gmail",
				auth: {
					user: process.env.MAIL_USERNAME,
					pass: process.env.MAIL_PASSWORD,
				},
			});

			console.log("verification email template read");

			const message = {
				from: process.env.SENDER_EMAIL,
				to: information.receptor,
				subject: "Verify your account",
				text:`verification code is ${information.token}`,
				
			};

			await transport.sendMail(message);

			console.log("verification email sent");

			cb(); /* for continue to the next queue */
		} catch (err) {
			console.log(err);
			console.log("email error - verification");
			cb(true);
		}
	}
}

/**
 * for send verification sms
 * @param {String} receptor receptor phone number
 * @param {String} token token that should send
 */
function addVerificationEmail(receptor, token) {
	const information = {
		receptor: receptor,
		token: token,
	};

	addQueue(information, sendVerificationEmail);
}

exports.addEmailForVerification = addVerificationEmail;
