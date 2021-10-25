const Sequelize = require("sequelize");

const db = require("../database/database");

const score = db.define(
	"score",
	{
		id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			allowNull: false,
			primaryKey: true,
		},
		score: {
			type: Sequelize.INTEGER,
			allowNull: false,
			// defaultValue: 0,
		},
		field: {
			type: Sequelize.ENUM(
				"درس تعاملی",
				"ویدیو درس",
				"نظرات درس",
				"واکنش نظر",
				"پسند نظر کاربر",
				"پسند نشده نظر کاربر",
				"آزمون پایانی دوره"
			),
			allowNull: false,
		},
		element_id: {
			type: Sequelize.INTEGER,
			allowNull: true,
		},
		negative: {
			type: Sequelize.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
	},
	{
		timestamp: true,
	}
);

module.exports = score;
