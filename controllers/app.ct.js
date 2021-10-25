const sequelize = require("sequelize");
const jwt = require("jsonwebtoken");

const {
	User,
	Course,
	Chapter,
	Content,
	User_Course,
	Setting,
	Message,
} = require("../database/models");
const database = require("../database/database");
const ResponseBuilder = require("../utils/responseBuilder");
const requestValidator = require("../utils/requestValidator");
const {
	setOrUpdateFirebaseTokenForDevice,
} = require("../utils/pushNotification");

const { VIEWS } = require("../config/app");

/* requiring config files - should replace in final version to setting table */
const settingConfig = require("../config/setting");
const mainConfig = require("../config/mainConfig");

/**
 * For startup check in beginning of application
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.startup = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}
	const access_token = req.headers["authorization"];
	const firebaseToken = req.body["firebase_token"];
	const app_version = req.body["app_version"];
	const userDevice = req.userDevice;
	const user = req.userInfo;

	const price= await Setting.findOne({where:{
		key:'product_price'
	}})

	let logged_in;
	let updateRequired;

	try {
		console.log("firebase token => ", firebaseToken);

		if (access_token) {
			try {
				const isTokenValid = jwt.verify(
					access_token.split(" ")[1],
					process.env.TOKEN_SECRET
				);
				if (isTokenValid) {
					logged_in = true;
				} else {
					logged_in = false;
				}
			} catch (err) {
				logged_in = false;
			}
		} else {
			logged_in = false;
		}

		if (app_version === settingConfig.app_version) {
			updateRequired = false;
		} else {
			updateRequired = true;
		}

		const updateTokenResult = await setOrUpdateFirebaseTokenForDevice(
			userDevice,
			firebaseToken
		);
		if (!updateTokenResult) {
			response.addDevMsg("some error occured on updating device token");
		}

		const responseData = updateRequired
			? {
					logged_in: logged_in,
					update: {
						version: settingConfig.app_version,
						message: settingConfig.app_update_message,
						url: settingConfig.app_update_url,
						force: settingConfig.app_update_force,
						positive: settingConfig.app_update_positive_button,
						negative: settingConfig.app_update_negative_button,
						negative: settingConfig.app_update_negative_button,
					},
			  }
			: {
					logged_in: logged_in,
					is_costumer: user.isCostumer,
					price:price.value
			  };

		if (req.DeviceUUID) {
			responseData.device_uuid = req.DeviceUUID;
		}
		response.setResponseData(responseData);
		res.status(200).json(response.build());
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
 * For updating device firebase_token
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.updateDeviceFirebaseToken = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const userDevice = req.userDevice;
	const firebaseToken = req.body["firebase_token"];

	try {
		const updateResult = await setOrUpdateFirebaseTokenForDevice(
			userDevice,
			firebaseToken
		);
		if (updateResult) {
			return res.status(200).json();
		}
		response.addDevMsg("updating firebase token got problem");
		return res.status(422).json(response.build());
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
 * For sending latest course by order (search is available url?q=searchQuery)
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getLatestCourse = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const query = req.query["q"];
	const page = +req.query["page"];
	const limit = +req.query["limit"] || 20;
	const user = req.userInfo;

	/**
	 * calculating variable for pagination
	 */
	const offset = limit * (page - 1);

	try {
		/* for formatting each course element */
		const courseFormatter = async (courses) => {
			const final = [];
			for (let i in courses) {
				const course = courses[i];
				const total_chapter = await Chapter.findAll({
					where: { courseId: course.id },
				});

				let userOwnedThisCourse = false;
				if (user) {
					const courseExistInLibrary = await User_Course.findOne({
						where: { userId: user.id, courseId: course.id },
					});
					if (courseExistInLibrary) {
						userOwnedThisCourse = true;
					}
				}

				const thisCourseFormat = {
					...course.dataValues,
					owned: userOwnedThisCourse,
					image: course.image
						? `${process.env.DOMAIN}/public/course-images/${course.image}`
						: null,
					color: course.image_background_color,
					total_chapters: total_chapter.length,
					action: {
						id: course.id,
						title: course.title,
						type: VIEWS.course_view,
					},
				};
				delete thisCourseFormat.updatedAt;
				delete thisCourseFormat.createdAt;
				delete thisCourseFormat.image_background_color;
				final.push(thisCourseFormat);
			}

			return final;
		};

		if (!query) {
			/* when query not set in url */
			const { count } = await Course.findAndCountAll();

			const allCourseByTime = await Course.findAll({
				order: [["createdAt", "DESC"]],
				offset: offset,
				limit: limit,
			});

			/**
			 * calculating all available pages
			 */
			const pages = Math.ceil(count / limit);

			const responseData = {
				current_page: page,
				from: 1,
				last_page: pages,
				per_page: limit,
				total: count,
				content_rows: await courseFormatter(allCourseByTime),
			};
			response.setResponseData(responseData);
			return res.status(200).json(response.build());
		}

		const { count } = await Course.findAndCountAll({
			where: {
				title: sequelize.where(
					sequelize.fn("LOWER", sequelize.col("title")),
					"LIKE",
					"%" + query.toLowerCase() + "%"
				),
			},
		});

		const allCourseByTimeAndSearched = await Course.findAll({
			where: {
				title: sequelize.where(
					sequelize.fn("LOWER", sequelize.col("title")),
					"LIKE",
					"%" + query + "%"
				),
			},
			order: [["createdAt", "DESC"]],
			offset: offset,
			limit: limit,
		});

		const pages = Math.ceil(count / limit);

		const responseData = {
			current_page: page,
			from: 1,
			last_page: pages,
			per_page: limit,
			total: count,
			content_rows: await courseFormatter(allCourseByTimeAndSearched),
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

exports.getInstagramLives = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const query = req.query["q"];
	const page = +req.query["page"];
	const limit = +req.query["limit"] || 20;

	/**
	 * calculating variable for pagination
	 */
	const offset = limit * (page - 1);
	const CONTENT_TYPE = "instagram-live";
	try {
		const instagramLiveFormatter = (lives) => {
			const final = [];
			for (let i in lives) {
				const live = lives[i];
				const format = {
					title: live.title,
					image: live.image
						? `${process.env.DOMAIN}/public/content/${live.image}`
						: null,
					color: live.image_background_color,
					duration: live.time,
					action: {
						id: live.id,
						title: live.title,
						type: "browse",
						url: live.link,
						in_app: true,
					},
				};
				final.push(format);
			}

			return final;
		};

		if (!query) {
			/* when query not set in url */
			const { count } = await Content.findAndCountAll({
				where: {
					type: CONTENT_TYPE,
				},
			});

			const allInstagramLivesByTime = await Content.findAll({
				where: {
					type: CONTENT_TYPE,
				},
				order: [["createdAt", "DESC"]],
				offset: offset,
				limit: limit,
			});

			/**
			 * calculating all available pages
			 */
			const pages = Math.ceil(count / limit);

			const responseData = {
				current_page: page,
				from: 1,
				last_page: pages,
				per_page: limit,
				total: count,
				content_rows: instagramLiveFormatter(allInstagramLivesByTime),
			};
			response.setResponseData(responseData);
			return res.status(200).json(response.build());
		}

		const { count } = await Content.findAndCountAll({
			where: {
				title: sequelize.where(
					sequelize.fn("LOWER", sequelize.col("title")),
					"LIKE",
					"%" + query.toLowerCase() + "%"
				),
				type: CONTENT_TYPE,
			},
		});

		const allInstagramLivesByTimeAndSearched = await Content.findAll({
			where: {
				title: sequelize.where(
					sequelize.fn("LOWER", sequelize.col("title")),
					"LIKE",
					"%" + query + "%"
				),
				type: CONTENT_TYPE,
			},
			order: [["createdAt", "DESC"]],
			offset: offset,
			limit: limit,
		});

		const pages = Math.ceil(count / limit);

		const responseData = {
			current_page: page,
			from: 1,
			last_page: pages,
			per_page: limit,
			total: count,
			content_rows: instagramLiveFormatter(allInstagramLivesByTimeAndSearched),
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
 * For sending home page data
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
// home 
exports.getHomeContent = async (req, res, next) => {
	const response = new ResponseBuilder();

	let user = req.userInfo;
	try {
		if(user){
			let userLevels=[];

			const coursesWithExam = await Course.findAll({ where : {has_exam:true}})

			var arrayLength = coursesWithExam.length;
			for (var i = 0; i < arrayLength; i++) {
				let course = coursesWithExam[i];
				const userCourse = await User_Course.findAll({ where: {
					userId:user.id,
					courseId:course.id,
					done:true
				}})
				let level={}
				if(!userCourse[0]){
					level={
						image:`http://${process.env.DOMAIN}/public/levels/dark/${course.level_image}`
					};
					userLevels.push(level)
				}else{
					level={
						image:`http://${process.env.DOMAIN}/public/levels/light/${course.level_image}`
					};
					userLevels.push(level)
				}
			}
			user ={
				name: user.name?user.name:'',
				image: user.profile_image
					? `http://${process.env.DOMAIN}/public/profile-images/${user.profile_image}`
					: `http://${process.env.DOMAIN}/public/profile-images/no-image.png`,
				image_exist: user.profile_image ? true : false,
				is_costumer:user.isCostumer,
				personal_type:user.personal_type,
				levels:userLevels,
			}
		}
		const courses = await Course.findAll()
		for (var i = 0; i < courses.length; i++) {
			courses[i].image=`http://${process.env.DOMAIN}/public/course-images/${courses[i].image}`
			courses[i].image_background=`http://${process.env.DOMAIN}/public/course-images/${courses[i].image_background}`
		}
		const responseData = {
			user,
			courses
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
 * For sending awards
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getAwardContent = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	try {
		const awardPageSettingRow = await Setting.findAll({
			where: {
				key: sequelize.where(
					sequelize.fn("LOWER", sequelize.col("key")),
					"LIKE",
					"%" + "award" + "%"
				),
			},
		});
		const content_rows = [];
		for (let i in awardPageSettingRow) {
			const thisRow = awardPageSettingRow[i];
			let otherValues;
			let awardInfo;
			let final;

			switch (thisRow.key) {
				case "award_first":
					try {
						otherValues = JSON.parse(thisRow.other_values);
					} catch (err) {
						console.log(err);
						break;
					}

					awardInfo = await Content.findOne({
						where: {
							type: "first-award",
							show: true,
						},
					});

					final = {
						type: "item-list",
						item_layout: "article",
						items: [
							{
								id: awardInfo.id,
								title: awardInfo.description,
								image: `${process.env.DOMAIN}/public/content/${awardInfo.image}`,
								height: otherValues.height,
								label: {
									action: {
										title: awardInfo.title,
										type: "browse",
										url: awardInfo.link,
										in_app: true,
									},
								},
								action: {
									title: awardInfo.title,
									type: "browse",
									url: awardInfo.link,
									in_app: true,
								},
							},
						],
					};

					content_rows[thisRow.value] = final;
					break;

				case "award_second":
					try {
						otherValues = JSON.parse(thisRow.other_values);
					} catch (err) {
						console.log(err);
						break;
					}

					awardInfo = await Content.findOne({
						where: {
							type: "second-award",
							show: true,
						},
					});

					final = {
						type: "item-list",
						item_layout: "article",
						items: [
							{
								id: awardInfo.id,
								title: awardInfo.description,
								image: `${process.env.DOMAIN}/public/content/${awardInfo.image}`,
								height: otherValues.height,
								label: {
									action: {
										title: awardInfo.title,
										type: "browse",
										url: awardInfo.link,
										in_app: true,
									},
								},
								action: {
									title: awardInfo.title,
									type: "browse",
									url: awardInfo.link,
									in_app: true,
								},
							},
						],
					};

					content_rows[thisRow.value] = final;
					break;

				case "award_third":
					try {
						otherValues = JSON.parse(thisRow.other_values);
					} catch (err) {
						console.log(err);
						break;
					}

					awardInfo = await Content.findOne({
						where: {
							type: "third-award",
							show: true,
						},
					});

					final = {
						type: "item-list",
						item_layout: "article",
						items: [
							{
								id: awardInfo.id,
								title: awardInfo.description,
								image: `${process.env.DOMAIN}/public/content/${awardInfo.image}`,
								height: otherValues.height,
								label: {
									action: {
										title: awardInfo.title,
										type: "browse",
										url: awardInfo.link,
										in_app: true,
									},
								},
								action: {
									title: awardInfo.title,
									type: "browse",
									url: awardInfo.link,
									in_app: true,
								},
							},
						],
					};

					content_rows[thisRow.value] = final;
					break;
			}
		}

		const responseData = {
			content_rows: content_rows,
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
		return res.status(500).json(response.build());
	}
};

/**
 * For sending download web page information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getDownloadPageInformation = async (req, res, next) => {
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const username = req.query["u"];
	let userInviteCode;

	try {
		if (username !== undefined) {
			let user = await User.findOne({ where: { username: username } });
			if (user) {
				userInviteCode = user.invite_code;
			}
		}

		const responseData = {
			invite_code: userInviteCode ? userInviteCode : undefined,
			app_download_link: settingConfig.app_download_url,
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
