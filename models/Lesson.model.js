const Sequelize = require("sequelize");

const db = require("../database/database");

const lesson = db.define(
	"lesson",
	{
		id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			allowNull: false,
			primaryKey: true,
		},
		title1: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		title2: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		description: {
			type: Sequelize.TEXT,
			allowNull: true,
		},
		image: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		image_background: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		is_free: {
			type: Sequelize.BOOLEAN,
			allowNull: true,
			defaultValue: 0,
		},
		video_id: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		video_time: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		lesson_video_score: {
			type: Sequelize.INTEGER,
			allowNull: false,
		},
		button_title_video: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		interactive_link: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		lesson_interactive_score: {
			type: Sequelize.INTEGER,
			allowNull: false,
		},
		button_title_interactive: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		window_title_interactive: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		likes: {
			type: Sequelize.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
		total_hours: {
			type: Sequelize.STRING,
			allowNull: false,
		},
	},
	{
		timestamp: true,
	}
);

module.exports = lesson;
