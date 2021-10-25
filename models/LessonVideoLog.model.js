const Sequelize = require("sequelize");

const db = require("../database/database");

const lessonVideoLog = db.define(
	"lessonVideoLog",
	{
		id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			allowNull: false,
			primaryKey: true,
		},
		start_time: {
			type: Sequelize.BIGINT,
			allowNull: false,
		},
		stop_time: {
			type: Sequelize.BIGINT,
			allowNull: false,
		},
		video_start_time: {
			type: Sequelize.BIGINT,
			allowNull: false,
		},
		video_stop_time: {
			type: Sequelize.BIGINT,
			allowNull: false,
		},
		has_seek: {
			type: Sequelize.BOOLEAN,
			allowNull: false,
		},
	},
	{
		timestamp: true,
	}
);

module.exports = lessonVideoLog;
