const Sequelize = require("sequelize");

const db = require("../database/database");

const user_lesson = db.define(
	"user_lesson",
	{
		id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			allowNull: false,
			primaryKey: true,
		},
		user_video_score: {
			type: Sequelize.INTEGER,
			allowNull: false,
		},
		user_interactive_score: {
			type: Sequelize.INTEGER,
			allowNull: false,
		},
		done: {
			type: Sequelize.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
		liked: {
			type: Sequelize.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
	},
	{
		timestamp: true,
	}
);

module.exports = user_lesson;
