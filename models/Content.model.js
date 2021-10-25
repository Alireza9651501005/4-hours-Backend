const Sequelize = require("sequelize");

const db = require("../database/database");

const content = db.define(
	"content",
	{
		id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			allowNull: false,
			primaryKey: true,
		},
		type: {
			type: Sequelize.ENUM(
				"instagram-live",
				"banner",
				"first-award",
				"second-award",
				"third-award"
			),
			allowNull: true,
		},
		image: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		image_background_color: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		text_color: {
			type: Sequelize.STRING,
			allowNull: true,
			defaultValue: "#000000",
		},
		title: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		full_banner: {
			type: Sequelize.BOOLEAN,
			allowNull: true,
		},
		link: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		description: {
			type: Sequelize.TEXT,
			allowNull: true,
		},
		time: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		show: {
			type: Sequelize.BOOLEAN,
			allowNull: false,
		},
	},
	{
		timestamp: true,
	}
);

module.exports = content;
