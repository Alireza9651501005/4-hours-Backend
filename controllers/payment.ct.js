const jwt = require("jsonwebtoken");

const {
	User,
	Order,
	Setting,
	Wallet,
	PaymentLog,
	Course,
	User_Course,
	Discount,
} = require("../database/models");
const ResponseBuilder = require("../utils/responseBuilder");
const requestValidator = require("../utils/requestValidator");
const MAIN_CONFIG = require("../config/mainConfig");
const { checkIsEmailOrPhone } = require("../utils/helperFunction");
const {
	sendNotification_OneUser,
	notification_payload_generator,
} = require("../utils/pushNotification");

const createOrderKey = async (order) => {
	const orderUniqueKey = 30;
	let orderKey = "";
	const letters =
		"1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
	let orderWithThisKeyExist = true;
	while (orderWithThisKeyExist) {
		orderKey = "";
		for (let i = 1; i <= orderUniqueKey; i++) {
			orderKey += letters[Math.round(Math.random() * (letters.length - 1))];
		}
		const sameUser = await Order.findAll({ where: { order_key: orderKey } });
		orderWithThisKeyExist = sameUser.length !== 0;
	}
	/* when we sure that invite key is unique */
	try {
		order.order_key = orderKey;
		await order.save();
	} catch (err) {
		console.log(err);
	}
};

/**
 * For handling discount amount on orders
 * @param {String} code
 * @param {Order} order
 * @param {Boolean} setOnOrder
 */
const discountCodeHandler = async (code, order, setOnOrder = false) => {
	const userCodeUsageLimit = 1;
	let finalDiscount = 0;
	const now = new Date();

	try {
		if (code === "") {
			return 0;
		}
		const discount = await Discount.findOne({
			where: {
				code: code,
			},
		});
		if (!discount) {
			return 0;
		}

		/* check if user used this code or not */
		const ordersByThisDiscountCode = await Order.findAll({
			where: { userId: order.userId, discountId: discount.id, status: "1" },
		});

		if (ordersByThisDiscountCode.length >= userCodeUsageLimit) {
			return 0;
		}
		if (discount.usage_count !== null && discount.usage_count <= 0) {
			return 0;
		}
		if (discount.expiration_time !== null && discount.expiration_time <= now) {
			return 0;
		}

		const totalPrice = order.total_amount;
		if (discount.amount !== 0) {
			finalDiscount = discount.amount;
		} else if (discount.percent !== 0) {
			finalDiscount = Math.floor((+discount.percent / 100) * totalPrice);
		}

		if (setOnOrder) {
			order.discount_amount = finalDiscount;
			order.discountId = discount.id;
			await order.save();

			/* this action should do reverse when in bank process got some fail report (should add later) */
			const oldDiscountUsage = discount.usage_count;
			discount.usage_count = oldDiscountUsage + 1;
			await discount.save();
		}

		return finalDiscount;
	} catch (err) {
		console.log(err);
		return 0;
	}
};

/**
 * For handling activation code from old app
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
 exports.activationCodeChecker = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}
	// TODO connect to activation code
	response.addDevMsg("User devices pass the device limit");
            response.setUserMessage(
              "در حال حاضر کد های فعال سازی ساپورت نمیشود",
              "error",
              true
            );
	return res.status(200).json(response.build());
};

/**
 * For handling discount amount on orders
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
 exports.discountCodeChecker = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}
	const discountCode = req.body["code"];
	const discount = await Discount.findOne({where :{code:discountCode}})	
	if (!discount){
		response.addDevMsg("User devices pass the device limit");
		response.setUserMessage(
		  "این کد تخفیف وجود ندارد",
		  "error",
		  false
		);
		return res.status(404).json(response.build());
	}
	const responseData = {
		discount
	  };
	response.setResponseData(responseData);

	response.addDevMsg("User devices pass the device limit");
            response.setUserMessage(
              "کد تخفیف مورد نظر اعمال شد",
              "success",
              false
            );
	return res.status(200).json(response.build());
};

/**
 * For create order record and send order id
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
 exports.make_order = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const userToken = req.body["user_token"];
	const discountCode = req.body["discount_code"];

	try {
		const userInformation = jwt.verify(userToken, process.env.TOKEN_SECRET);
		if (!userInformation) {
			response.addDevMsg("unauthorized");
			return res.status(403).json(response.build());
		}

        const phone_email= userInformation.email?userInformation.email:userInformation.phone
		const isPhoneOrEmail = checkIsEmailOrPhone(phone_email);
		let user;
		if(isPhoneOrEmail===1){
			user = await User.findOne({
				where: {
					id: userInformation.userId,
					email: phone_email,
					security_update_time: userInformation.config.securityTime,
				},
			});
		  }else if(isPhoneOrEmail===2){
			user = await User.findOne({
				where: {
					id: userInformation.userId,
					phone: phone_email,
					security_update_time: userInformation.config.securityTime,
				},
			});
		}

		if (!user) {
			response.addDevMsg("unauthorized");
			return res.status(403).json(response.build());
		}

		/* check if this order exist or not */
		const thisOrderExist_success = await Order.findOne({
			where: { userId: user.id, status: "1" },
		});
		if (thisOrderExist_success) {
			response.addDevMsg("This user bought the course");
			return res.status(406).json(response.build());
		}

		/* check if this order for this course is on pending */
		const thisOrderExist_pending = await Order.findOne({
			where: {
				userId: user.id,
				status: "2",
			},
		});

		if (thisOrderExist_pending) {
			/* if this order record exist on pending, we will 
               return its id instead of creating new one */
			response.setResponseData({
				order_id: thisOrderExist_pending.id,
			});
			return res.status(200).json(response.build());
		}

		const product_price = await Setting.findOne({where:{
			key:'product_price'
		}})

		const thisUserOrder = await Order.create({
			total_amount: product_price.value,
			description: 'بابت خرید دوره چهارساعت طلایی',
			status: "2" /* pending */,
			userId: user.id
		});
		
		/* calculating final payment amount without use user's wallet */
		const discount = await discountCodeHandler(discountCode || "", thisUserOrder);
		if (discountCode !== "" && discountCode !== undefined && discount === 0) {
			response.setUserMessage("کد تخفیف قابل استفاده نیست", "error");
		}
		const price =product_price.value - discount;
		thisUserOrder.total_amount=price;

		thisUserOrder.save();


		await createOrderKey(thisUserOrder);

		response.setResponseData({
			order_id: thisUserOrder.id,
		});
		return res.status(200).json(response.build());
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage(
			"مشکل در ارتباط با سرور به وجود آمده است",
			"warning",
			true
		);
		res.status(500).json(response.build());
	}
};

/**
 * For create order record and send order id
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.firstOrderStep_create_course_order = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const userToken = req.body["user_token"];
	const courseId = +req.body["course_id"];

	try {
		const userInformation = jwt.verify(userToken, process.env.TOKEN_SECRET);
		if (!userInformation) {
			response.addDevMsg("unauthorized");
			return res.status(403).json(response.build());
		}

		const user = await User.findOne({
			where: {
				id: userInformation.userId,
				phone: userInformation.phone,
				security_update_time: userInformation.config.securityTime,
			},
		});

		if (!user) {
			response.addDevMsg("unauthorized");
			return res.status(403).json(response.build());
		}

		const course = await Course.findByPk(courseId);

		if (!course) {
			response.addDevMsg("course not found");
			return res.status(404).json(response.build());
		}

		const courseLibrary = await User_Course.findOne({
			where: { courseId: course.id, userId: user.id },
		});
		if (courseLibrary) {
			response.addDevMsg("this course exist on user library");
			response.setResponseData({
				user_has_course: true,
			});
			return res.status(406).json(response.build());
		}

		/* check if this order exist or not */
		const thisOrderExist_success = await Order.findOne({
			where: { userId: user.id, courseId: course.id, status: "1" },
		});
		if (thisOrderExist_success) {
			response.addDevMsg("this user bought this course");
			return res.status(406).json(response.build());
		}

		/* check if this order for this course is on pending */
		const thisOrderExist_pending = await Order.findOne({
			where: {
				userId: user.id,
				courseId: course.id,
				status: "2",
			},
		});

		if (thisOrderExist_pending) {
			/* if this order record exist on pending, we will 
               return its id instead of creating new one */
			response.setResponseData({
				order_id: thisOrderExist_pending.id,
			});
			return res.status(200).json(response.build());
		}

		if (course.price === 0) {
			response.addDevMsg("this course is free");
			return res.status(406).json(response.build());
		}

		const thisUserOrder = await Order.create({
			total_amount: course.price,
			description: `بابت خرید دوره ${course.title}`,
			status: "2" /* pending */,
			userId: user.id,
			courseId: course.id,
		});

		await createOrderKey(thisUserOrder);

		response.setResponseData({
			order_id: thisUserOrder.id,
		});
		return res.status(200).json(response.build());
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage(
			"مشکل در ارتباط با سرور به وجود آمده است",
			"warning",
			true
		);
		res.status(500).json(response.build());
	}
};

/**
 * For sending course payment information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.secondOrderStep_get_course_info = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const userToken = req.body["user_token"];
	const courseId = +req.body["course_id"];
	const orderId = +req.body["order_id"];
	const discountCode = req.body["discount_code"];
	const useWallet = req.query["wallet"] || false;

	try {
		const userInformation = jwt.verify(userToken, process.env.TOKEN_SECRET);
		if (!userInformation) {
			response.addDevMsg("unauthorized");
			return res.status(403).json(response.build());
		}

		const user = await User.findOne({
			where: {
				id: userInformation.userId,
				phone: userInformation.phone,
				security_update_time: userInformation.config.securityTime,
			},
		});

		if (!user) {
			response.addDevMsg("unauthorized");
			return res.status(403).json(response.build());
		}

		const course = await Course.findByPk(courseId);

		if (!course) {
			response.addDevMsg("course not found");
			return res.status(404).json(response.build());
		}

		const thisOrder = await Order.findOne({
			where: { userId: user.id, courseId: course.id, id: orderId, status: "2" },
		});

		if (!thisOrder) {
			response.addDevMsg("order not found");
			return res.status(404).json(response.build());
		}

		/* calculating user's wallet amount */
		let userWalletAmount = 0;
		const userWalletRecord = await Wallet.findAll({
			where: {
				userId: user.id,
			},
			order: [["createdAt", "DESC"]],
		});

		for (let i in userWalletRecord) {
			const record = userWalletRecord[i];
			if (record.action === "1") {
				userWalletAmount += record.amount;
			} else {
				userWalletAmount -= record.amount;
			}
		}

		/* calculating final payment amount without use user's wallet */
		const discount = await discountCodeHandler(discountCode || "", thisOrder);
		if (discountCode !== "" && discountCode !== undefined && discount === 0) {
			response.setUserMessage("کد تخفیف قابل استفاده نیست", "error");
		}

		const userStarsDiscount =
			user.stars * MAIN_CONFIG.user_star_discount_on_every_star;
		let finalPaymentAmount =
			thisOrder.total_amount - userStarsDiscount - discount;

		if (useWallet === "true") {
			finalPaymentAmount -= userWalletAmount;
		}

		const responseData = {
			order_id: thisOrder.id,
			course: {
				title: course.title,
				level: course.level,
				short_description: course.short_description,
				image: `${process.env.DOMAIN}/public/course-images/${course.image}`,
				color: course.image_background_color,
			},
			payment_info: {
				total_price: thisOrder.total_amount,
				discount: discount,
				stars_discount: userStarsDiscount,
				user_wallet_amount: userWalletAmount,
				final_payment_amount: finalPaymentAmount >= 0 ? finalPaymentAmount : 0,
			},
		};

		response.setResponseData(responseData);
		return res.status(200).json(response.build());
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage(
			"مشکل در ارتباط با سرور به وجود آمده است",
			"warning",
			true
		);
		res.status(500).json(response.build());
	}
};

/**
 * For cancel order
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.onCancelCoursePayment = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const userToken = req.body["user_token"];
	const orderId = +req.body["order_id"];

	try {
		const userInformation = jwt.verify(userToken, process.env.TOKEN_SECRET);
		if (!userInformation) {
			response.addDevMsg("unauthorized");
			return res.status(403).json(response.build());
		}

		const user = await User.findOne({
			where: {
				id: userInformation.userId,
				phone: userInformation.phone,
				security_update_time: userInformation.config.securityTime,
			},
		});

		if (!user) {
			response.addDevMsg("unauthorized");
			return res.status(403).json(response.build());
		}

		const thisOrder = await Order.findOne({
			where: { userId: user.id, id: orderId, status: "2" },
		});

		if (!thisOrder) {
			response.addDevMsg("order not found");
			return res.status(404).json(response.build());
		}

		thisOrder.status = "3";
		await thisOrder.save();

		return res.status(200).json();
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage(
			"مشکل در ارتباط با سرور به وجود آمده است",
			"warning",
			true
		);
		res.status(500).json(response.build());
	}
};

/**
 * For handling bank link before send user to the bank
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.thirdOrderStep_before_go_bank = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const userToken = req.body["user_token"];
	const orderId = +req.body["order_id"];
	const discountCode = req.body["discount_code"];
	const useWallet = req.query["wallet"] || false;

	/* important */
	let final_payment_for_send_to_bank = 0;

	const responseData = {
		link: "",
	};

	try {
		const userInformation = jwt.verify(userToken, process.env.TOKEN_SECRET);
		if (!userInformation) {
			response.addDevMsg("unauthorized");
			return res.status(403).json(response.build());
		}

		const user = await User.findOne({
			where: {
				id: userInformation.userId,
				phone: userInformation.phone,
				security_update_time: userInformation.config.securityTime,
			},
		});

		if (!user) {
			response.addDevMsg("unauthorized");
			return res.status(403).json(response.build());
		}

		const thisOrder = await Order.findOne({
			where: {
				userId: user.id,
				id: orderId,
				status: "2",
			},
		});

		if (!thisOrder) {
			response.addDevMsg("order not found");
			return res.status(404).json(response.build());
		}

		const course = await Course.findByPk(thisOrder.courseId);

		/* calculating user's wallet amount */
		let userWalletAmount = 0;
		const userWalletRecord = await Wallet.findAll({
			where: {
				userId: user.id,
			},
			order: [["createdAt", "DESC"]],
		});

		for (let i in userWalletRecord) {
			const record = userWalletRecord[i];
			if (record.action === "1") {
				userWalletAmount += record.amount;
			} else {
				userWalletAmount -= record.amount;
			}
		}

		/* calculating final payment amount without use user's wallet */
		const discount = await discountCodeHandler(
			discountCode || "",
			thisOrder,
			true
		);

		if (discountCode !== "" && discountCode !== undefined && discount === 0) {
			response.setUserMessage("کد تخفیف قابل استفاده نیست", "error");
			return res.status(422).json(response.build());
		}
		const userStarsDiscount =
			user.stars * MAIN_CONFIG.user_star_discount_on_every_star;
		thisOrder.stars_discount_amount = userStarsDiscount; /* save user stars discount amount */
		let finalPaymentAmount =
			thisOrder.total_amount - userStarsDiscount - discount;

		if (finalPaymentAmount <= 0) {
			/* actions when there is no need to use bank or wallet */
			responseData.link = `http://pms-ui.myfreenet.ir/payment/course/success/${thisOrder.order_key}`; /* redirect url after purchasing */
			response.setResponseData(responseData);
			return res.status(200).json(response.build());
		}

		if (useWallet === "true" && userWalletAmount > 0) {
			/* if user want to use his/her wallet */
			const compareFinalPaymentToWallet = userWalletAmount - finalPaymentAmount;
			/* in case that wallat-amount is more than finalPyamentAmount */
			if (compareFinalPaymentToWallet > 0) {
				/* decreasing wallet amount by finalPaymentAmount */

				const walletRecord = await Wallet.create({
					amount: finalPaymentAmount,
					description: `بابت خرید دوره ${course.title}`,
					status: "1",
					action: "0",
					resource: "1",
					trace_code: "1234" /* should change */,
					courseId: thisOrder.courseId,
					userId: user.id,
				});

				thisOrder.wallet_amount = walletRecord.amount;
				thisOrder.discount_amount = discount;
				thisOrder.walletId = walletRecord.id;
				await thisOrder.save();

				responseData.link = `http://pms-ui.myfreenet.ir/payment/course/success/${thisOrder.order_key}`; /* redirect url after purchasing */
				response.setResponseData(responseData);
				return res.status(200).json(response.build());
			} else {
				/* in case that wallet-amount is less or equal to finalPaymentAmount */
				/* decreasing wallet amount by all its amount */
				const walletRecord = await Wallet.create({
					amount: userWalletAmount,
					description: `بابت خرید دوره ${course.title}`,
					status: "1",
					action: "0",
					resource: "1",
					trace_code: "1234" /* should change */,
					courseId: thisOrder.courseId,
					userId: user.id,
				});

				if (compareFinalPaymentToWallet === 0) {
					thisOrder.wallet_amount = walletRecord.amount;
					thisOrder.discount_amount = discount;
					thisOrder.walletId = walletRecord.id;
					await thisOrder.save();

					responseData.link = `http://pms-ui.myfreenet.ir/payment/course/success/${thisOrder.order_key}`; /* redirect url after purchasing */
					response.setResponseData(responseData);
					return res.status(200).json(response.build());
				}

				/* in case that finalPaymentAmount is more than wallet amount */
				const directPaymentRecord = await PaymentLog.create({
					amount: Math.abs(compareFinalPaymentToWallet),
					description: `بابت خرید دوره ${course.title}`,
					status: "2",
					action: "0",
					resource: "2",
					trace_code: "pending" /* should change */,
					courseId: thisOrder.courseId,
					userId: user.id,
				});

				thisOrder.wallet_amount = walletRecord.amount;
				thisOrder.discount_amount = discount;
				thisOrder.cash_amount = directPaymentRecord.amount;
				thisOrder.walletId = walletRecord.id;
				thisOrder.paymentLogId = directPaymentRecord.id;
				await thisOrder.save();

				responseData.link = `http://pms-ui.myfreenet.ir/payment/course/success/${thisOrder.order_key}`; /* redirect url after purchasing */
				response.setResponseData(responseData);
				return res.status(200).json(response.build());
			}
		}

		/* in case that user don't want to use his/her wallet */
		const directPaymentRecord = await PaymentLog.create({
			amount: finalPaymentAmount,
			description: `بابت خرید دوره ${course.title}`,
			status: "2",
			action: "0",
			resource: "2",
			trace_code: "pending" /* should change */,
			courseId: thisOrder.courseId,
			userId: user.id,
		});

		thisOrder.discount_amount = discount;
		thisOrder.cash_amount = directPaymentRecord.amount;
		thisOrder.paymentLogId = directPaymentRecord.id;
		await thisOrder.save();

		responseData.link = `http://pms-ui.myfreenet.ir/payment/course/success/${thisOrder.order_key}`; /* redirect url after purchasing */
		response.setResponseData(responseData);
		return res.status(200).json(response.build());
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage(
			"مشکل در ارتباط با سرور به وجود آمده است",
			"warning",
			true
		);
		res.status(500).json(response.build());
	}
};

/**
 * For handling actions when user back successfully from bank
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.fourthOrderStep_after_bank = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const orderKey = req.body["order_key"];

	try {
		const thisOrder = await Order.findOne({
			where: {
				order_key: orderKey,
				status: "2",
			},
		});

		if (!thisOrder) {
			response.addDevMsg("order not found");
			return res.status(404).json(response.build());
		}

		const walletId = thisOrder.walletId;
		const paymentLogId = thisOrder.paymentLogId;
		const courseId = thisOrder.courseId;
		const userId = thisOrder.userId;

		/* update order status */
		thisOrder.status = "1"; /* success */
		await thisOrder.save();

		/* update wallet status */
		if (walletId) {
			const walletRecord = await Wallet.findByPk(walletId);
			walletRecord.status = "1";
			await walletRecord.save();
		}

		/* update paymentLog status */
		if (paymentLogId) {
			const paymentRecord = await PaymentLog.findByPk(paymentLogId);
			paymentRecord.status = "1";
			await paymentRecord.save();
		}

		/* adding course to user library after payment */
		/* finding course for library additional info */
		const course = await Course.findByPk(courseId);
		if (!course) {
			response.setUserMessage("دوره مورد نظر یافت نشد", "error");
			response.addDevMsg("this course not exist");
			return res.status(404).json(response.build());
		}

		/* add to library */
		await User_Course.create({
			course_title: course.title,
			courseId: course.id,
			userId: userId,
		});

		/* notification management part */
		const notificationPayload = notification_payload_generator(
			`خرید دوره ${course.title}`,
			`دوره ${course.title} به دوره های شما افزوده شد`,
			null,
			{
				type: "my_courses",
				title: "دوره های من",
			},
			"#000",
			"#f3f3f3"
		);
		sendNotification_OneUser(userId, notificationPayload);

		response.setUserMessage("دوره با موفقیت خریداری شد", "success");
		return res.status(200).json(response.build());
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage(
			"مشکل در ارتباط با سرور به وجود آمده است",
			"warning",
			true
		);
		res.status(500).json(response.build());
	}
};
