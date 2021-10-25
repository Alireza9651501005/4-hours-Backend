const Sequelize = require("sequelize");

const db = require("../database/database");

const user_course = db.define(
	"user_course",
	{
		id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			allowNull: false,
			primaryKey: true,
		},
		course_title: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		courseId: {
			type: Sequelize.INTEGER,
			allowNull: true,
		},
		userId: {
			type: Sequelize.INTEGER,
			allowNull: true,
		},
		done: {
			type: Sequelize.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
		user_exam_count: {
			type: Sequelize.INTEGER,
			allowNull: false,
			defaultValue: 0,
		}
	},
	{
		timestamp: true,
	}
);

module.exports = user_course;
