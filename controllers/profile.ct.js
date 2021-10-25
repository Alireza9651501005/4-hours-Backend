const fs = require("fs");
const path = require("path");

const stripTags = require("striptags");
const bcrypt = require("bcrypt");
const jalali = require("jalaali-js");
const uuid = require("uuid").v4;

const database = require("../database/database");
const {
	User,
	User_Course,
	Course,
	Chapter,
	User_Lesson,
	UserCheck,
	Message,
	Score,
	Lesson,
	Comment,
	PaymentLog,
	Wallet,
	Network,
} = require("../database/models");
const ResponseBuilder = require("../utils/responseBuilder");
const requestValidator = require("../utils/requestValidator"); // for validating requests efficiently
const { addSMSForVerification } = require("../utils/smsHandler");
const { convertPersianNumberToEnglish } = require("../utils/input");
const MAIN_CONFIG = require("../config/mainConfig");
const {
	notification_payload_generator,
	sendNotification_OneUser,
} = require("../utils/pushNotification");
const { addEmailForVerification } = require("../utils/emailHandler");

const {
	calculatingCourseStatus,
	generatePhoneNumberCode,
	convertJalaliMonthToPersian,
	checkIsEmailOrPhone,
} = require("../utils/helperFunction");

const { VIEWS } = require("../config/app");
const course = require("../models/Course.model");

/**
 * For sending user's private profile information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getUserProfile = async (req, res, next) => {
	const response = new ResponseBuilder();

	const user = req.userInfo;

	try {
		const userRegisterDateToJalali = jalali.toJalaali(user.createdAt);
	
		const responseData = {
			username: user.username?user.username:'',
			name: user.name?user.name:'',
			phone_email: user.phone?user.phone:user.email,
			gender: user.gender?user.gender:'',
			country: user.country?user.country:'',
			city: user.city?user.city:'',
			certificate: user.certificate?user.certificate:'',
			field: user.field?user.field:'',
			personal_type: user.personal_type,
			register_date: `${userRegisterDateToJalali.jy}/${userRegisterDateToJalali.jm}/${userRegisterDateToJalali.jd}`,
			image: user.profile_image
				? `http://${process.env.DOMAIN}/public/profile-images/${user.profile_image}`
				: `http://${process.env.DOMAIN}/public/profile-images/no-image.png`,
			image_exist: user.profile_image ? true : false,
		};

		response.setResponseData(responseData);
		return res.status(200).json(response.build());
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage(
			"مشکل در ارتباط با سرور به وجود آمده است",
			"warning",
			false
		);
		res.status(500).json(response.build());
	}
};

/**
 * For updating user optional information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.setUserOptionalInfo = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const {
		name,
		username,
		certificate,
		field,
		city,
		country,
		gender,
	} = req.body;

	try {
		const user = req.userInfo;

		/* check new username */
		if (username !== "" && username.match(/^@/)) {
			response.setUserMessage("نام کاربری نباید با @ شروع شود", "error");
			response.addDevMsg("username should not begin with @");
			return res.status(422).json(response.build());
		}
		const matchUsers = await User.findAll({ where: { username: username } });
		if (matchUsers.length > 0) {
			if (matchUsers[0].id !== user.id) {
				response.setUserMessage("این نام تکراری است", "error");
				response.addDevMsg("this new username exist");
				return res.status(422).json(response.build());
			}
		}
		/* for new username is not owned by other user, we update it */
		user.username = username;
		/* updating user optional info */
		user.name = name;

		user.certificate =
			certificate === "دیپلم" ||
			certificate === "کارشناسی" ||
			certificate === "کاردانی" ||
			certificate === "کارشناسی ارشد" ||
			certificate === "دکتری"
				? certificate
				: null;
		/* For send dev message */
		if (certificate && user.certificate === null) {
			response.addDevMsg("certificate data got problem");
		}
		user.field=field||null;

		user.gender =
			gender === "مرد" || gender === "زن" || gender === "ترجیح میدهم نگویم"
				? gender
				: null;
		/* For send dev message */
		if (gender && user.gender === null) {
			response.addDevMsg("gender data got problem");
		}

		user.city=city||null;
		user.country=country||null;

		await user.save();
		

		response.setUserMessage("اطلاعات شما ثبت شد", "success");
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
 * For sending user optional info
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getUserOptionalInfo = async (req, res, next) => {
	const response = new ResponseBuilder();

	const user = req.userInfo;
	const responseData = {
		image: user.profile_image
			? `http://${process.env.DOMAIN}/public/profile-images/${user.profile_image}`
			: `http://${process.env.DOMAIN}/public/profile-images/no-image.png`,
		name: user.name,
		username: user.username,
		phone_email: user.phone?user.phone:user.email,
		certificate: user.certificate,
		field: user.field,
		country: user.country,
		city: user.city,
		gender: user.gender,
	};
	response.setResponseData(responseData);
	return res.status(200).json(response.build());
};

/**
 * For getting user's course
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getUserCourse = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const user = req.userInfo;

	const page = +req.query["page"];
	const filter = req.query["filter"] ? +req.query["filter"] : 3;
	const limit = +req.query["limit"] || 20;

	/**
	 * calculating variable for pagination
	 */
	const offset = limit * (page - 1);

	try {
		const courseFormatter = async (userCourses) => {
			const final = [];
			for (let i in userCourses) {
				const userCourseRow = userCourses[i];
				const course = await Course.findByPk(userCourseRow.courseId);

				const {
					last_activity_date,
					last_activity,
					progress_percentage,
					start_date_string,
				} = await calculatingCourseStatus(user, course.id);

				const courseChapters = await Chapter.findAll({
					where: { courseId: course.id },
				});

				const thisCourseFormat = {
					title: course.title,
					level: course.level,
					image: course.image
						? `${process.env.DOMAIN}/public/course-images/${course.image}`
						: null,
					color: course.image_background_color,
					total_chapter: courseChapters.length,
					progress_percentage: progress_percentage,
					course_start_time: start_date_string,
					course_last_activity_time: last_activity_date,
					action: {
						id: course.id,
						title: course.title,
						type: VIEWS.course_view,
					},
					/* should not send to client */
					last_date:
						last_activity === 0 ? userCourseRow.createdAt : last_activity,
					createdAt: userCourseRow.createdAt,
				};
				delete thisCourseFormat.updatedAt;
				// delete thisCourseFormat.createdAt; /* do later */
				delete thisCourseFormat.image_background_color;
				final.push(thisCourseFormat);
			}

			/* for ordering courses by client filter */
			let filteredCourses = [];
			switch (filter) {
				case 0:
					/* last activity date */
					filteredCourses = final.sort((a, b) => b.last_date - a.last_date);
					filteredCourses = filteredCourses.map((el) => {
						const course = {
							...el,
						};
						delete course.createdAt;
						delete course.last_date;
						return course;
					});
					break;

				case 1:
					/* progress percentage */
					filteredCourses = final.sort(
						(a, b) => b.progress_percentage - a.progress_percentage
					);
					filteredCourses = filteredCourses.map((el) => {
						const course = {
							...el,
						};
						delete course.createdAt;
						delete course.last_date;
						return course;
					});
					break;

				case 2:
					/* alphabetic */
					filteredCourses = final.sort((a, b) =>
						a.title.localeCompare(b.title)
					);
					filteredCourses = filteredCourses.map((el) => {
						const course = {
							...el,
						};
						delete course.createdAt;
						delete course.last_date;
						return course;
					});
					break;

				case 3:
					/* purchase date */
					filteredCourses = final.sort((a, b) => b.createdAt - a.createdAt);
					filteredCourses = filteredCourses.map((el) => {
						const course = {
							...el,
						};
						delete course.createdAt;
						delete course.last_date;
						return course;
					});
					break;

				default:
					filteredCourses = filteredCourses.map((el) => {
						const course = {
							...el,
						};
						delete course.createdAt;
						delete course.last_date;
						return course;
					});
					break;
			}

			return filteredCourses;
		};

		const allUserCourseByTime = await User_Course.findAll({
			where: {
				userId: user.id,
			},
			order: [["createdAt", "DESC"]],
			offset: offset,
			limit: limit,
		});

		const { count } = await User_Course.findAndCountAll({
			where: { userId: user.id },
		});

		const pages = Math.ceil(count / limit);

		const responseData = {
			total: count,
			current_page: page,
			from: 1,
			last_page: pages,
			per_page: limit,
			courses: await courseFormatter(allUserCourseByTime),
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
 * For adding free courses to the user library
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.addFreeCourseToUserLibrary = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const courseId = +req.body["course_id"];
	const user = req.userInfo;

	try {
		const course = await Course.findByPk(courseId);
		if (course.price !== 0) {
			response.setUserMessage("این دوره باید خریداری شود", "warning");
			return res.status(402).json(response.build());
		}

		/* check if this course exist in user's library or not */
		const savedCourses = await User_Course.findAll({
			where: { courseId: course.id, userId: user.id },
		});
		if (savedCourses.length > 0 && savedCourses) {
			response.setUserMessage("این دوره در کتابخانه موجود است", "warning");
			return res.status(200).json(response.build());
		}

		await User_Course.create({
			course_title: course.title,
			courseId: course.id,
			userId: user.id,
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
			"#fff"
		);
		sendNotification_OneUser(user.id, notificationPayload);

		response.setUserMessage("دوره به کتابخانه اضافه شد", "success");
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
 * For handling user's username change
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.changeUsername = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const { username } = req.body;
	const user = req.userInfo;
	/**
	 * check if this username not exist for another user
	 */
	try {
		const findUsersByRequestedUsername = await User.findAll({
			where: { username: username },
		});
		const foundUser = findUsersByRequestedUsername[0];

		/**
		 * if this username owned by other person
		 */
		if (foundUser && foundUser.id !== user.id) {
			response.setUserMessage("این نام کاربری ثبت شده است", "error");
			return res.status(200).json(response.build());
		}

		/**
		 * updating user's username
		 */
		req.userInfo.username = username;
		await req.userInfo.save();
		response.setUserMessage("نام کاربری شما با موفقیت تغییر یافت", "success");
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
 * For handling user's password change
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.changePassword = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const password = req.body["password"];
	const new_password = req.body["new_password"];
	const user = req.userInfo;
	const device = req.userDevice;

	try {
		let users = await User.findAll({ where: { id: user.id } });
		const foundUser = users[0];
		if (!foundUser) {
			response.setUserMessage("کاربر مد نظر یافت نشد", "warning");
			return res.status(200).json(response.build());
		}

		/**
		 * check for password validation
		 */
		const isPasswordValid = bcrypt.compareSync(password, foundUser.password);
		if (!isPasswordValid) {
			response.setUserMessage("رمزعبور وارد شده صحیح نمی باشد", "error");
			return res.status(200).json(response.build());
		}

		/**
		 * in case that password is valid =>
		 */
		const newHashPassword = bcrypt.hashSync(
			convertPersianNumberToEnglish(new_password),
			10
		);
		foundUser.password = newHashPassword;
		foundUser.security_update_time = new Date().toString();
		await foundUser.save();

		/* logout device */
		device.logged_in = false;
		await device.save();
		response.setUserMessage("رمزعبور با موفقیت تغییر یافت", "success");
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
 * For handling user phone number change
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.startChangePhoneNumberAndEmail = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const phone_email =convertPersianNumberToEnglish( req.body["phone_email"]).trim();
	
	try {
		const verificationCode = generatePhoneNumberCode();

		const isPhoneOrEmail = checkIsEmailOrPhone(phone_email);

		let userExist;

		if(isPhoneOrEmail===1){
			userExist = await User.findOne({
				where: { email: phone_email},
			});
			if (userExist) {
				response.addDevMsg('There is a user with this email');
				response.setUserMessage(
					"این ایمیل قبلا استفاده شده است",
					"warning",
					true
				);
				return res.status(400).json(response.build());
			}
			/* send verification code for email */
			addEmailForVerification(phone_email, verificationCode);
		}else if(isPhoneOrEmail===2){
			userExist = await User.findAll({
			where: { phone: phone_email},
			});
			if (userExist[0]) {
				response.addDevMsg('There is a user with this phone number');
				response.setUserMessage(
					"این شماره تلفن قبلا استفاده شده است",
					"warning",
					true
				);
				return res.status(400).json(response.build());
			}
			//send verification code for SMS
			addSMSForVerification(phone_email, verificationCode);
		}else{
			response.addDevMsg('input field is not Email or Phone number');
			response.setUserMessage(
				"لطفا شماره همراه یا ایمیل خود را وارد کنید",
				"warning",
				true
			);
			return res.status(400).json(response.build());
		}
		
		const newUserCheck = await UserCheck.create({
		phone_email: phone_email,
		verification_code: verificationCode,
		});
		
		setTimeout(async () => {
		await newUserCheck.destroy();
		}, MAIN_CONFIG.phone_number_verification_code_timeout * 1000);

		response.setResponseData({
		timeout: MAIN_CONFIG.phone_number_verification_code_timeout,
		});
		return res.status(200).json(response.build());
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage(
		"مشکل در ارتباط با سرور به وجود آمده است",
		"warning",
		false
		);
		return res.status(500).json(response.build());
	}
};


exports.endChangePhoneNumberAndEmail = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}


	const phone_email =convertPersianNumberToEnglish( req.body["phone_email"]).trim();

	const code = req.body["code"];
	const user = req.userInfo;
	const device = req.userDevice;

	try {
		const verifiedUser = await UserCheck.findAll({
			where: { phone_email: phone_email, verification_code: code },
		  });
		if (verifiedUser.length===0) {
			response.setUserMessage("کد وارد شده صحیح نیست", "danger");
			return res.status(422).json(response.build());
		}
		const isPhoneOrEmail = checkIsEmailOrPhone(phone_email);

		if(isPhoneOrEmail===1){
			user.email = phone_email;
			response.setUserMessage("ایمیل شما با موفقیت تغییر یافت", "success");
		}else if(isPhoneOrEmail===2){
			user.phone = phone_email;
			response.setUserMessage("شماره تلفن شما با موفقیت تغییر یافت", "success");
		}else{
			response.addDevMsg('input field is not Email or Phone number');
			response.setUserMessage(
				"لطفا شماره همراه یا ایمیل خود را وارد کنید",
				"warning",
				true
			);
			return res.status(400).json(response.build());
		}
		user.security_update_time = new Date().toString();
		user.phone_verified = true;
		await user.save();

		device.logged_in = false;
		await device.save();

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
 * For uploading profile images
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.uploadProfileImages = async (req, res, next) => {
	const response = new ResponseBuilder();

	/* in this scenario user exist */
	const user = req.userInfo;

	const fileBase64 = req.body["file"];
	let folderName;
	let time = new Date();
	/* For make difference in folder names */
	switch (time.getUTCMonth()) {
		case 0:
			folderName = time.getUTCFullYear().toString() + "-JANUARY";
			break;
		case 1:
			folderName = time.getUTCFullYear().toString() + "-FEBRUARY";
			break;
		case 2:
			folderName = time.getUTCFullYear().toString() + "-MARCH";
			break;
		case 3:
			folderName = time.getUTCFullYear().toString() + "-APRIL";
			break;
		case 4:
			folderName = time.getUTCFullYear().toString() + "-MAY";
			break;
		case 5:
			folderName = time.getUTCFullYear().toString() + "-JUNE";
			break;
		case 6:
			folderName = time.getUTCFullYear().toString() + "-JULY";
			break;
		case 7:
			folderName = time.getUTCFullYear().toString() + "-AUGUST";
			break;
		case 8:
			folderName = time.getUTCFullYear().toString() + "-SEPTEMBER";
			break;
		case 9:
			folderName = time.getUTCFullYear().toString() + "-OCTOBER";
			break;
		case 10:
			folderName = time.getUTCFullYear().toString() + "-NOVEMBER";
			break;
		case 11:
			folderName = time.getUTCFullYear().toString() + "-DECEMBER";
			break;
	}

	/* config of file storing */
	const fileConfig = {
		allowType: ["png", "jpg", "jpeg", "gif"],
		storePath: path.join(
			__dirname,
			"..",
			"public",
			"profile-images",
			folderName,
			time.getTime() + "-" + uuid()
		),
		parentPath: path.join(__dirname, "..", "public", "profile-images"),
		fileMaxSize: 3000,
	};

	let base64;
	let type;

	try {
		/*  check if file did not send */
		if (!fileBase64 || fileBase64.length === 0) {
			response.addDevMsg("file field did not change");
			response.setResponseData({
				base64:fileBase64?fileBase64:null
			});
			response.setUserMessage("تصویر مورد نظر خود را انتخاب کنید", "error");
			return res.status(422).json(response.build());
		}

		for (let i in fileConfig.allowType) {
			const mimeType = fileConfig.allowType[i];
			const validationPattern = `data:image/${mimeType};base64,`;
			const pattern = new RegExp(validationPattern);
			if (fileBase64.match(pattern)) {
				base64 = fileBase64.replace(pattern, "");
				type = mimeType;
			}
		}

		/* in case that file has invalid mimetype */
		if (!base64) {
			response.setUserMessage("فرمت فایل ارسالی صحیح نمی باشد", "error");
			response.addDevMsg("file has invalid mimetype");
			return res.status(422).json(response.build());
		}

		/* create storage folder if not exist */
		const folderExistenceCheck = fs.existsSync(
			path.join(fileConfig.parentPath, folderName)
		);
		if (!folderExistenceCheck) {
			fs.mkdirSync(path.join(fileConfig.parentPath, folderName));
		}

		/* create complete file path to store file */
		const completeFilePath = fileConfig.storePath + "." + type;

		fs.writeFileSync(completeFilePath, base64, "base64");

		const storedFile = fs.statSync(completeFilePath);

		const fileSize_KB =
			storedFile.size / 1000; /* convert file size from bytes to KB */
		if (fileSize_KB > fileConfig.fileMaxSize) {
			/* if received file in not small enough, we should delete it :) */
			fs.unlinkSync(completeFilePath);

			response.addDevMsg(
				`File size should not be more than ${fileConfig.fileMaxSize} KB`
			);
			response.setUserMessage(
				`حجم فایل ارسالی نباید بیشتراز ${fileConfig.fileMaxSize} کیلوبایت باشد`,
				"error"
			);
			return res.status(422).json(response.build());
		}

		const fileAddressForSaveOnDB = completeFilePath
			.replace(fileConfig.parentPath, "")
			.replace(/\/|\\/, "")
			.replace(/\/|\\/g, "/");

		if (user.profile_image) {
			fs.unlinkSync(
				path.join(
					__dirname,
					"..",
					"public",
					"profile-images",
					user.profile_image
				)
			);
		}

		user.profile_image = fileAddressForSaveOnDB;
		const updatedUser = await user.save();

		const responseData = {
			image: `http://${process.env.DOMAIN}/public/profile-images/${updatedUser.profile_image}`,
			image_exist: true,
		};
		response.setResponseData(responseData);
		response.setUserMessage("تصویر با موفقیت ذخیره شد", "success");
		return res.status(200).json(response.build());
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage(
			"مشکل در ارتباط با سرور به وجود آمده است",
			"warning",
			true
		);
		return res.status(500).json(response.build());
	}
};

/**
 * For deleting user profile image if exist
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.deleteUserProfileImage = async (req, res, next) => {
	const response = new ResponseBuilder();

	const user = req.userInfo;

	try {
		if (!user.profile_image) {
			response.setUserMessage("ابتدا برای خود عکسی انتخاب کنید", "error");
			response.addDevMsg("this user has no profile image");
			return res.status(404).json(response.build());
		}

		fs.unlinkSync(
			path.join(__dirname, "..", "public", "profile-images", user.profile_image)
		);

		user.profile_image = null;
		await user.save();

		response.setResponseData({
			image: `${process.env.DOMAIN}/public/profile-images/no-image.png`,
			image_exist: false,
		});
		response.setUserMessage("تصویر حذف شد", "success");
		return res.status(200).json(response.build());
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage(
			"مشکل در ارتباط با سرور به وجود آمده است",
			"warning",
			true
		);
		return res.status(500).json(response.build());
	}
};

/**
 * For logout user device
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.logoutUser = async (req, res, next) => {
	const response = new ResponseBuilder();
	const device = req.userDevice;
	try {
		/* logout this device for this user */
		device.logged_in = false;
		await device.save();
		response.setUserMessage("با موفقیت از حساب خود خارج شدید", "success");
		return res.status(200).json(response.build());
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage(
			"مشکل در ارتباط با سرور به وجود آمده است",
			"warning",
			true
		);
		return res.status(500).json(response.build());
	}
};

/**
 * For getting user latest messages
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getUserAdminMessages = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const user = req.userInfo;

	const page = +req.query["page"];
	const limit = +req.query["limit"] || 10;

	/**
	 * calculating variable for pagination
	 */
	const offset = limit * (page - 1);

	try {
		const userActiveAdminMessages = await Message.findAll({
			where: {
				userId: user.id,
				deleted: false,
			},
			limit: limit,
			offset: offset,
			order: [["createdAt", "DESC"]],
		});

		const { count } = await Message.findAndCountAll({
			where: { userId: user.id, deleted: false },
		});

		const pages = Math.ceil(count / limit);

		const messages = [];
		for (let i in userActiveAdminMessages) {
			const message = userActiveAdminMessages[i];
			const messageJalaliDate = jalali.toJalaali(message.createdAt);

			let month = convertJalaliMonthToPersian(messageJalaliDate.jm);

			const format = {
				id: message.id,
				title: message.title,
				short_description: stripTags(message.description).slice(0, 100),
				read: message.read,
				date: `${messageJalaliDate.jd} ${month}`,
				hour: `${message.createdAt.getHours()}:${
					message.createdAt.getMinutes() < 10
						? "0" + message.createdAt.getMinutes()
						: message.createdAt.getMinutes()
				}`,
			};
			messages.push(format);
		}

		const responseData = {
			total: count,
			current_page: page,
			from: 1,
			last_page: pages,
			per_page: limit,
			messages: messages,
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
		return res.status(500).json(response.build());
	}
};

/**
 * For getting more detail about messages
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getUserAdminMessagesDescription = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const messageId = +req.params["messageId"];
	const user = req.userInfo;

	try {
		let message = await Message.findOne({
			where: { userId: user.id, id: messageId },
		});

		if (!message) {
			response.setUserMessage("پیام مورد نظر یافت نشد", "warning");
			return res.status(404).json(response.build());
		}

		const messageJalaliDate = jalali.toJalaali(message.createdAt);

		let month = convertJalaliMonthToPersian(messageJalaliDate.jm);

		message.read = true;
		message = await message.save();

		const messageFormat = {
			id: message.id,
			title: message.title,
			description: message.description,
			date: `${messageJalaliDate.jd} ${month}`,
			hour: `${message.createdAt.getHours()}:${
				message.createdAt.getMinutes() < 10
					? "0" + message.createdAt.getMinutes()
					: message.createdAt.getMinutes()
			}`,
			read: message.read,
		};

		const responseDate = {
			message: messageFormat,
		};

		response.setResponseData(responseDate);
		return res.status(200).json(response.build());
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage(
			"مشکل در ارتباط با سرور به وجود آمده است",
			"warning",
			true
		);
		return res.status(500).json(response.build());
	}
};

/**
 * For deleting message
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.deleteUserAdminMessage = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const messageId = +req.params["messageId"];
	const user = req.userInfo;

	try {
		const message = await Message.findOne({
			where: { userId: user.id, id: messageId },
		});

		message.deleted = true;
		await message.save();

		response.setUserMessage("پیام مورد نظر پاک شد", "success");
		return res.status(200).json(response.build());
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage(
			"مشکل در ارتباط با سرور به وجود آمده است",
			"warning",
			true
		);
		return res.status(500).json(response.build());
	}
};

/**
 * For sending suggestion for mentioning
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getUserSuggestionForMentioning = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const searchQuery = req.query["q"];

	try {
		const queryRegexp = new RegExp(searchQuery, "i");
		const foundUsers = await User.findAll();
		let matchUsers = [];
		for (let i in foundUsers) {
			const el = foundUsers[i];
			if(el.username){
				if (el.username.match(queryRegexp)) {
					matchUsers.push(el);
				}
			}
			
		}
		/* formatting found users */
		matchUsers = matchUsers.map((el) => ({
			id: el.id,
			username: el.dataValues.username,
			image: el.dataValues.profile_image
				? `http://${process.env.DOMAIN}/public/profile-images/${el.dataValues.profile_image}`
				: `http://${process.env.DOMAIN}/public/profile-images/no-image.png`,
			stars: el.dataValues.stars,
		}));

		response.setResponseData(matchUsers);
		return res.status(200).json(response.build());
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage(
			"مشکل در ارتباط با سرور به وجود آمده است",
			"warning",
			false
		);
		return res.status(500).json(response.build());
	}
};

/**
 * For getting user public profile
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getUserPublicProfile = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	/* This controller should find user with username or user id */
	const searchParam = req.params["search"];
	let id;
	let username;
	/* finding that searchParam is user id or username */
	const idPattern = /^[0-9]{1,}$/;
	try {
		if (searchParam.match(idPattern)) {
			id = +searchParam;
		} else {
			username = searchParam;
		}

		let user;

		if (id !== undefined) {
			user = await User.findByPk(id);
			if (!user) {
				/* in this case, maybe searchParam be something like `123456789` that can be a username! */
				user = await User.findOne({ where: { username: id } });
			}
		}
		if (username !== undefined) {
			user = await User.findOne({ where: { username: username } });
		}

		if (!user) {
			response.addDevMsg("this user not found by (id/username)");
			response.setUserMessage("کاربر مورد نظر یافت نشد", "error");
			return res.status(404).json(response.build());
		}

		const userRegisterDateToJalali = jalali.toJalaali(user.createdAt);

		const [total_score_row] = await database.query(
			`SELECT SUM(IF(\`negative\` = 1, -1, 1) * \`score\`) AS total_score FROM \`scores\` WHERE \`scores\`.\`userId\` = ${user.id};`
		);
		const [total_network_row] = await database.query(
			`SELECT SUM(IF(\`negative\` = 1, -1, 1) * \`score\`) AS total_network FROM \`networks\` WHERE \`networks\`.\`userId\` = ${user.id};`
		);

		const responseData = {
			username: user.username,
			stars: user.stars,
			scores:
				+total_score_row[0].total_score + +total_network_row[0].total_network,
			register_date: `${userRegisterDateToJalali.jy}/${userRegisterDateToJalali.jm}/${userRegisterDateToJalali.jd}`,
			image: user.profile_image
				? `${process.env.DOMAIN}/public/profile-images/${user.profile_image}`
				: `${process.env.DOMAIN}/public/profile-images/no-image.png`,
			network_score: +total_network_row[0].total_network,
			scientific_score: +total_score_row[0].total_score,
			monthly_rank: user.monthly_rank,
			yearly_rank: user.yearly_rank,
			share_content:
				user.name +
				" از شما دعوت می کند تا پروفایل عمومی وی را ببینید" +
				`\nhttp://pms-ui.myfreenet.ir/profiles/${user.username}`
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
		return res.status(500).json(response.build());
	}
};

exports.getUserPublicProfileCourses = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const page = +req.query["page"];
	const limit = +req.query["limit"] || 20;
	const searchParam = req.params["search"];

	/**
	 * calculating variable for pagination
	 */
	const offset = limit * (page - 1);
	const idPattern = /^[0-9]{1,}$/;
	let id, username;

	try {
		if (searchParam.match(idPattern)) {
			id = +searchParam;
		} else {
			username = searchParam;
		}

		let user;

		if (id !== undefined) {
			user = await User.findByPk(id);
			if (!user) {
				/* in this case, maybe searchParam be something like `123456789` that can be a username! */
				user = await User.findOne({ where: { username: id } });
			}
		}
		if (username !== undefined) {
			user = await User.findOne({ where: { username: username } });
		}

		if (!user) {
			response.addDevMsg("this user not found by (id/username)");
			response.setUserMessage("کاربر مورد نظر یافت نشد", "error");
			return res.status(404).json(response.build());
		}

		const courseFormatter = async (userCourses) => {
			const final = [];
			for (let i in userCourses) {
				const userCourseRow = userCourses[i];
				const course = await Course.findByPk(userCourseRow.courseId);

				const { progress_percentage } = await calculatingCourseStatus(
					user,
					course.id
				);

				const thisCourseFormat = {
					title: course.title,
					level: course.level,
					progress_percentage: progress_percentage,
					action: {
						id: course.id,
						title: course.title,
						type: VIEWS.course_view,
					},
				};
				final.push(thisCourseFormat);
			}

			return final;
		};

		const allUserCourseByTime = await User_Course.findAll({
			where: {
				userId: user.id,
			},
			order: [["createdAt", "DESC"]],
			offset: offset,
			limit: limit,
		});

		const { count } = await User_Course.findAndCountAll({
			where: { userId: user.id },
		});

		const pages = Math.ceil(count / limit);

		const responseData = {
			total: count,
			current_page: page,
			from: 1,
			last_page: pages,
			per_page: limit,
			courses: await courseFormatter(allUserCourseByTime),
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
 * For sending user score report
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getUserScoresReport = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const page = +req.query["page"];
	const limit = +req.query["limit"] || 20;
	const user = req.userInfo;

	/**
	 * calculating variable for pagination
	 */
	const offset = limit * (page - 1);

	try {
		const scoreRecordFormatter = async (scores) => {
			const final = [];

			for (let i in scores) {
				const score = scores[i];

				const scoreRecordDate = jalali.toJalaali(score.createdAt);

				let itemColor,
					itemIconLink = `${process.env.DOMAIN}/public/constant-material/`;
				let title = "",
					detail = "",
					dataGotErr = false;

				let lesson, chapter, course, comment, reaction;
				/*  "lesson_interactive",
					"lesson_video",
					"lesson_commenting",
					"comment_reaction",
					"user_comment_like",
					"user_comment_dislike",
					"course_final_exam",
					"network_score"
				 */

				let lessonId, courseId;
				switch (score.field) {
					case "lesson_interactive":
						itemColor = "#1B93A9";
						itemIconLink += "interactive-score.png";
						/* element_id -> lessonId */
						lesson = await Lesson.findByPk(score.element_id);
						if (!lesson) {
							dataGotErr = true;
							break;
						}
						lessonId = lesson.id;
						chapter = await Chapter.findByPk(lesson.chapterId);
						if (!chapter) {
							dataGotErr = true;
							break;
						}
						course = await Course.findByPk(chapter.courseId);
						if (!course) {
							dataGotErr = true;
							break;
						}

						title = `آموزش تعاملی، ${course.title}`;
						detail = `${lesson.title}، ${chapter.title}`;

						break;
					//
					case "lesson_video":
						itemColor = "#6F3492";
						itemIconLink += "video-score.png";
						/* element_id -> lessonId */
						lesson = await Lesson.findByPk(score.element_id);
						if (!lesson) {
							dataGotErr = true;
							break;
						}
						lessonId = lesson.id;
						chapter = await Chapter.findByPk(lesson.chapterId);
						if (!chapter) {
							dataGotErr = true;
							break;
						}
						course = await Course.findByPk(chapter.courseId);
						if (!course) {
							dataGotErr = true;
							break;
						}

						title = `دیدن ویدئو، ${course.title}`;
						detail = `${lesson.title}، ${chapter.title}`;

						break;
					//
					case "course_final_exam":
						itemColor = "#1D5FD4";
						itemIconLink += "course-final-exam.png";
						/* element_id -> courseId */
						course = await Course.findByPk(score.element_id);
						if (!course) {
							dataGotErr = true;
							break;
						}
						courseId = course.id;
						title = `آزمون، ${course.title}`;
						// detail = `${lesson.title}، ${chapter.title}`;

						break;
					// //
					case "lesson_commenting":
						itemColor = "#1D5FD4";
						itemIconLink += "comment-reaction.png";
						/* element_id -> commentId */
						comment = await Comment.findByPk(score.element_id);
						if (!comment) {
							dataGotErr = true;
							break;
						}
						lesson = await Lesson.findByPk(comment.lessonId);
						if (!lesson) {
							dataGotErr = true;
							break;
						}
						lessonId = lesson.id;
						chapter = await Chapter.findByPk(lesson.chapterId);
						if (!chapter) {
							dataGotErr = true;
							break;
						}
						course = await Course.findByPk(chapter.courseId);
						if (!course) {
							dataGotErr = true;
							break;
						}

						if (comment.parent_id) {
							title = `ثبت پاسخ، ${course.title}`;
						} else {
							title = `ارسال نظر، ${course.title}`;
						}
						detail = `${lesson.title}، ${chapter.title}`;

						break;
					//
					case "comment_reaction":
						itemColor = "#1D5FD4";
						itemIconLink += "comment-reaction.png";
						/* element_id -> commentId */
						comment = await Comment.findByPk(score.element_id);
						if (!comment) {
							dataGotErr = true;
							break;
						}
						lesson = await Lesson.findByPk(comment.lessonId);
						if (!lesson) {
							dataGotErr = true;
							break;
						}
						lessonId = lesson.id;
						chapter = await Chapter.findByPk(lesson.chapterId);
						if (!chapter) {
							dataGotErr = true;
							break;
						}
						course = await Course.findByPk(chapter.courseId);
						if (!course) {
							dataGotErr = true;
							break;
						}

						title = `ثبت بازخورد ، ${course.title}`;
						detail = `${lesson.title}، ${chapter.title}`;

						break;
					//
					case "user_comment_like":
						itemColor = "#0AA335";
						itemIconLink += "comment-like-by-other.png";
						/* element_id -> commentId */
						comment = await Comment.findByPk(score.element_id);
						if (!comment) {
							dataGotErr = true;
							break;
						}
						lesson = await Lesson.findByPk(comment.lessonId);
						if (!lesson) {
							dataGotErr = true;
							break;
						}
						lessonId = lesson.id;
						chapter = await Chapter.findByPk(lesson.chapterId);
						if (!chapter) {
							dataGotErr = true;
							break;
						}
						course = await Course.findByPk(chapter.courseId);
						if (!course) {
							dataGotErr = true;
							break;
						}

						title = `بازخورد مثبت به نظر ، ${course.title}`;
						detail = `${lesson.title}، ${chapter.title}`;

						break;
					//
					case "user_comment_dislike":
						itemColor = "#FD5432";
						itemIconLink += "comment-dislike-by-other.png";
						/* element_id -> commentId */
						comment = await Comment.findByPk(score.element_id);
						if (!comment) {
							dataGotErr = true;
							break;
						}
						lesson = await Lesson.findByPk(comment.lessonId);
						if (!lesson) {
							dataGotErr = true;
							break;
						}
						lessonId = lesson.id;
						chapter = await Chapter.findByPk(lesson.chapterId);
						if (!chapter) {
							dataGotErr = true;
							break;
						}
						course = await Course.findByPk(chapter.courseId);
						if (!course) {
							dataGotErr = true;
							break;
						}

						title = `بازخورد منفی به نظر ، ${course.title}`;
						detail = `${lesson.title}، ${chapter.title}`;

						break;
					//
					default:
						itemColor = "#000000";
						itemIconLink += "0";
						break;
				}

				if (dataGotErr) {
					continue;
				}

				const id = lessonId ? lessonId : courseId;

				const formattedScore = {
					score: score.negative ? -1 * score.score : score.score,
					color: itemColor,
					icon: itemIconLink,
					title: title,
					detail: detail,
					date: `${scoreRecordDate.jy}/${scoreRecordDate.jm}/${scoreRecordDate.jd}`,
					action: {
						id: id,
						type: lessonId ? VIEWS.lesson_view : VIEWS.course_view,
						title: lessonId ? lesson.title : course.title,
					},
				};
				final.push(formattedScore);
			}

			return final;
		};

		const userScoresByTime = await Score.findAll({
			where: {
				userId: user.id,
			},
			order: [["createdAt", "DESC"]],
			offset: offset,
			limit: limit,
		});

		const { count } = await Score.findAndCountAll({
			where: {
				userId: user.id,
			},
		});

		const pages = Math.ceil(count / limit);

		const responseData = {
			current_page: page,
			from: 1,
			last_page: pages,
			per_page: limit,
			total: count,
			content_rows: await scoreRecordFormatter(userScoresByTime),
		};
		response.setResponseData(responseData);
		return res.status(200).json(response.build());
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage(
			"مشکل در ارتباط با سرور به وجود آمده است",
			"warning"
		);
		return res.status(500).json(response.build());
	}
};

/**
 * For sending user total wallet info
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getUserWalletInfo = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const user = req.userInfo;

	try {
		let totalAmount = 0;
		const userWalletRecord = await Wallet.findAll({
			where: {
				userId: user.id,
			},
			order: [["createdAt", "DESC"]],
		});

		for (let i in userWalletRecord) {
			const record = userWalletRecord[i];
			if (record.action === "1") {
				totalAmount += record.amount;
			} else {
				totalAmount -= record.amount;
			}
		}

		/* for disable phone badge credit gifts when user see his/her credit */
		if (user.has_credit_gift) {
			user.has_credit_gift = false;
			await user.save();
		}

		const responseData = {
			amount: totalAmount,
			name: user.name,
			currency: "تومان",
		};

		response.setResponseData(responseData);
		return res.status(200).json(response.build());
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage(
			"مشکل در ارتباط با سرور به وجود آمده است",
			"warning"
		);
		return res.status(500).json(response.build());
	}
};

/**
 * For sending user payment logs
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getUserPaymentLogs = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const page = +req.query["page"];
	const limit = +req.query["limit"] || 20;
	const user = req.userInfo;

	/**
	 * calculating variable for pagination
	 */
	const offset = limit * (page - 1);

	try {
		const paymentLogFormatter = async (paymentLogs) => {
			const final = [];

			for (let i in paymentLogs) {
				const paymentLog = paymentLogs[i];
				let icon = `${process.env.DOMAIN}/public/constant-material/`;
				const paymentLogJalaliDate = jalali.toJalaali(
					new Date(paymentLog.createdAt)
				);

				/* set correct icon */
				switch (paymentLog.resource) {
					case "1":
						/* resource = "wallet"; */
						icon += "wallet.png";
						break;
					//
					case "2":
						/* resource = "direct-payment"; */
						icon += "direct-payment.png";
						break;
					//
					case "3":
						/* resource = "system"; */
						icon += "system-gift.png";
						break;
					// //
				}

				const formattedPaymentLog = {
					id: paymentLog.id,
					amount: paymentLog.amount,
					negetive: paymentLog.action === "0",
					description: paymentLog.description,
					// traceCode: paymentLog.trace_code,
					icon: icon,
					status: paymentLog.status,
					currency: "تومان",
					date: `${paymentLogJalaliDate.jy}/${paymentLogJalaliDate.jm}/${paymentLogJalaliDate.jd}`,
				};

				final.push(formattedPaymentLog);
			}

			return final;
		};

		const paymentLogCount = await PaymentLog.findAndCountAll({
			where: {
				userId: user.id,
			},
		});
		const walletCount = await Wallet.findAndCountAll({
			where: {
				userId: user.id,
			},
		});

		const count = paymentLogCount.count + walletCount.count;

		const [userPaymentLogs] = await database.query(
			`SELECT * FROM (SELECT \`id\`, \`amount\`, \`action\`, \`description\`, \`resource\`, \`status\`, \`createdAt\`, \`userId\` FROM paymentLogs UNION ALL SELECT \`id\`, \`amount\`, \`action\`, \`description\`, \`resource\`, \`status\`, \`createdAt\`, \`userId\` FROM wallets ORDER BY createdAt DESC) x WHERE x.userId = ${user.id} LIMIT ${offset}, ${limit};`
		);

		const pages = Math.ceil(count / limit);

		const responseData = {
			current_page: page,
			from: 1,
			last_page: pages,
			per_page: limit,
			total: count,
			payment_logs: await paymentLogFormatter(userPaymentLogs),
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
		return res.status(500).json(response.build());
	}
};

/**
 * For sending yearly leaderboard
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getYearlyLeaderboard = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const page = +req.query["page"];
	const limit = +req.query["limit"] || 20;
	const user = req.userInfo;

	/**
	 * calculating variable for pagination
	 */
	let offset = limit * (page - 1);
	// let offset = (limit + 3) * (page - 1);
	// if (page === 1) {
	// 	offset = 3;
	// }

	try {
		const userRankFormatter = async (users) => {
			const final = [];
			for (let i in users) {
				const thisUser = users[i];

				if (thisUser.yearly_rank === 0) {
					continue;
				}

				const userFormatted = {
					id: thisUser.id,
					username: thisUser.username,
					image: thisUser.profile_image
						? `${process.env.DOMAIN}/public/profile-images/${thisUser.profile_image}`
						: `${process.env.DOMAIN}/public/profile-images/no-image.png`,
					scores:
						thisUser.network_score_yearly + thisUser.scientific_score_yearly,
					rank: thisUser.yearly_rank,
					is_me: thisUser.id === user.id,
				};

				final.push(userFormatted);
			}
			return final;
		};

		const userOrderByYearlyRank = await User.findAll({
			order: [["yearly_rank", "ASC"]],
			limit: limit,
			offset: offset,
		});

		const { count } = await User.findAndCountAll();

		const pages = Math.ceil(count / limit);

		const responseData = {
			current_page: page,
			from: 1,
			last_page: pages,
			per_page: limit,
			total: count,
			user: {
				id: user.id,
				username: user.username,
				image: user.profile_image
					? `${process.env.DOMAIN}/public/profile-images/${user.profile_image}`
					: `${process.env.DOMAIN}/public/profile-images/no-image.png`,
				scores: user.network_score + user.scientific_score,
				stars: user.stars,
				rank: user.yearly_rank,
			},
			users: await userRankFormatter(userOrderByYearlyRank),
		};

		response.setResponseData(responseData);
		return res.status(200).json(response.build());
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage("مشکل در ارتباط با سرور به وجود آمده است", "error");
		return res.status(500).json(response.build());
	}
};

/**
 * For sending monthly leaderboard
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getMonthlyLeaderboard = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const page = +req.query["page"];
	const limit = +req.query["limit"] || 20;
	const user = req.userInfo;

	/**
	 * calculating variable for pagination
	 */
	let offset = limit * (page - 1);
	// let offset = (limit + 3) * (page - 1);
	// if (page === 1) {
	// 	offset = 3;
	// }

	try {
		const userRankFormatter = async (users) => {
			const final = [];
			for (let i in users) {
				const thisUser = users[i];

				if (thisUser.monthly_rank === 0) {
					continue;
				}

				const userFormatted = {
					id: thisUser.id,
					username: thisUser.username,
					image: thisUser.profile_image
						? `${process.env.DOMAIN}/public/profile-images/${thisUser.profile_image}`
						: `${process.env.DOMAIN}/public/profile-images/no-image.png`,
					scores: thisUser.network_score + thisUser.scientific_score,
					rank: thisUser.monthly_rank,
					is_me: thisUser.id === user.id,
				};

				final.push(userFormatted);
			}
			return final;
		};

		const userOrderByYearlyRank = await User.findAll({
			order: [["monthly_rank", "ASC"]],
			limit: limit,
			offset: offset,
		});

		const { count } = await User.findAndCountAll();

		const pages = Math.ceil(count / limit);

		const responseData = {
			current_page: page,
			from: 1,
			last_page: pages,
			per_page: limit,
			total: count,
			user: {
				id: user.id,
				username: user.username,
				image: user.profile_image
					? `${process.env.DOMAIN}/public/profile-images/${user.profile_image}`
					: `${process.env.DOMAIN}/public/profile-images/no-image.png`,
				scores: user.network_score + user.scientific_score,
				stars: user.stars,
				rank: user.monthly_rank,
			},
			users: await userRankFormatter(userOrderByYearlyRank),
		};

		response.setResponseData(responseData);
		return res.status(200).json(response.build());
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage("مشکل در ارتباط با سرور به وجود آمده است", "error");
		return res.status(500).json(response.build());
	}
};

/**
 * For sending user network scores
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getUserNetworkScores = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const user = req.userInfo;

	try {
		let totalUserNetworkScore = 0;

		const networkScoresFormatter = async (networkScores) => {
			const final = [
				{
					label: "سطح یک",
					total_score: 0,
					persons: 0,
				},
				{
					label: "سطح دو",
					total_score: 0,
					persons: 0,
				},
				{
					label: "سطح سه",
					total_score: 0,
					persons: 0,
				},
				{
					label: "سطح چهار",
					total_score: 0,
					persons: 0,
				},
			];

			for (let i in networkScores) {
				const networkScore = networkScores[i];
				const thisNetworkScore = networkScore.negative
					? -1 * networkScore.score
					: networkScore.score;

				const level = +networkScore.level; /* make level string number to integer number */
				const index = level - 1;
				const sampleScoreLevel = final[index];
				sampleScoreLevel.total_score += thisNetworkScore;
				totalUserNetworkScore += thisNetworkScore;
				sampleScoreLevel.persons += 1;
			}

			return final;
		};

		const allUserNetworkScores = await Network.findAll({
			where: { userId: user.id },
		});

		const responseData = {
			network_scores: await networkScoresFormatter(allUserNetworkScores),
			total_network_score: totalUserNetworkScore,
			invite_app_link: `http://pms-ui.myfreenet.ir/download-app?u=${user.username}`,
			invite_code: user.invite_code,
		};

		response.setResponseData(responseData);
		return res.status(200).json(response.build());
	} catch (err) {
		console.log(err);
		response.addDevMsg(err.toString());
		response.setUserMessage("مشکل در ارتباط با سرور به وجود آمده است", "error");
		return res.status(500).json(response.build());
	}
};
