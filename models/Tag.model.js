const Sequelize = require("sequelize");

const db = require("../database/database");

const tag = db.define(
	"tag",
	{
		id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			allowNull: false,
			primaryKey: true,
		},
		name: {
			type: Sequelize.STRING,
			allowNull: false,
		},
	},
	{
		timestamp: true,
	}
);

module.exports = tag;
