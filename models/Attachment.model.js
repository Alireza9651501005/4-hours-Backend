const Sequelize = require("sequelize");

const db = require("../database/database");

const attachment = db.define(
	"attachment",
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
		type: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		filename: {
			type: Sequelize.STRING,
			allowNull: false,
		},
	},
	{
		timestamp: true,
	}
);

module.exports = attachment;
