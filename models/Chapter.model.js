const Sequelize = require("sequelize");

const db = require("../database/database");

const chapter = db.define(
	"chapter",
	{
		id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			allowNull: false,
			primaryKey: true,
		},
		title: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		// courseTitle: {
		// 	type: Sequelize.STRING,
		// 	// autoIncrement: true,
		// 	allowNull: false,
		// 	// primaryKey: true,
		// }
	},
	{
		timestamp: true,
	}
);

module.exports = chapter;
