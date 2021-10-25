const Sequelize = require("sequelize");

const db = require("../database/database");

const message = db.define(
	"message",
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
		description: {
			type: Sequelize.TEXT,
			allowNull: false,
		},
		read: {
			type: Sequelize.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
		deleted: {
			type: Sequelize.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
	},
	{
		timestamp: true,
	}
);

module.exports = message;
