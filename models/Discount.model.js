const Sequelize = require("sequelize");

const db = require("../database/database");

const discount = db.define(
	"discount",
	{
		id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			allowNull: false,
			primaryKey: true,
		},
		title: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		code: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		amount: {
			type: Sequelize.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
		percent: {
			type: Sequelize.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
		usage_count: {
			type: Sequelize.INTEGER,
			allowNull: true,
		},
		expiration_time: {
			type: Sequelize.DATE,
			allowNull: true,
		},
	},
	{
		timestamp: true,
	}
);

module.exports = discount;
