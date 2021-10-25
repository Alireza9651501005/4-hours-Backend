const Sequelize = require("sequelize");

const db = require("../database/database");

const user = db.define(
	"user",
	{
		id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			allowNull: false,
			primaryKey: true,
		},
		username: {
			type: Sequelize.STRING,
			allowNull: true,
			unique: true,
		},
		name: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		phone: {
			type: Sequelize.STRING,
			allowNull: true,
			unique: true,
		},
		phone_verified: {
			type: Sequelize.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
		phone_verification_code: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		email: {
			type: Sequelize.STRING,
			allowNull: true,
			unique: true,
		},
		email_verified: {
			type: Sequelize.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
		email_verification_code: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		profile_image: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		isCostumer: {
			type: Sequelize.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
		personal_type: {
			type: Sequelize.ENUM(
				"A",
				"B",
				"C",
				"D"
			),
			allowNull: true,
			defaultValue: null,
		},
		// client_id: {
		// 	type: Sequelize.STRING,
		// 	allowNull: true /* but should never have a user without client_id */,
		// },
		security_update_time: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		certificate: {
			type: Sequelize.ENUM(
				"دیپلم",
				"کاردانی",
				"کارشناسی",
				"کارشناسی ارشد",
				"دکتری"
			),
			allowNull: true,
			defaultValue: "کارشناسی",
		},
		field: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		country: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		city: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		birth_date: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		birth_place: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		gender: {
			type: Sequelize.ENUM("مرد", "زن", "ترجیح میدهم نگویم"),
			allowNull: true,
		},
		// user workplace information
		workplace_site: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		work_position: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		personal_resume: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		// social medias links
		instagram_link: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		telegram_link: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		linkedIn_link: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		network_score: {
			type: Sequelize.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
		scientific_score: {
			type: Sequelize.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
		network_score_yearly: {
			type: Sequelize.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
		scientific_score_yearly: {
			type: Sequelize.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
		// should talk about ranking
		monthly_rank: {
			type: Sequelize.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
		yearly_rank: {
			type: Sequelize.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
		// user stars
		stars: {
			type: Sequelize.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
		// generated tokens count
		generated_tokens_count: {
			type: Sequelize.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
		invite_code: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		has_credit_gift: {
			type: Sequelize.BOOLEAN,
			allowNull: true,
			defaultValue: false,
		}
	},
	{
		timestamps: true,
	}
);

module.exports = user;
