const Sequelize = require("sequelize");

const db = require("../database/database");

const order = db.define(
	"order",
	{
		id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			allowNull: false,
			primaryKey: true,
		},
		total_amount: {
			type: Sequelize.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
		cash_amount: {
			type: Sequelize.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
		wallet_amount: {
			type: Sequelize.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
		stars_discount_amount: {
			type: Sequelize.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
		discount_amount: {
			type: Sequelize.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
		description: {
			type: Sequelize.TEXT,
			allowNull: false,
		},
		status: {
			type: Sequelize.ENUM(
				"ناموفق" /* fail */,
				"موفق" /* success */,
				"در حال انجام" /* pending */,
				"لغو شده" /* cancel */
			),
			allowNull: false,
		},
		order_key: {
			type: Sequelize.STRING,
			allowNull: true,
		},
	},
	{
		timestamp: true,
	}
);

module.exports = order;
