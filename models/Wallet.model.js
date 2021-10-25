const Sequelize = require("sequelize");

const db = require("../database/database");

const wallet = db.define(
	"wallet",
	{
		id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			allowNull: false,
			primaryKey: true,
		},
		amount: {
			type: Sequelize.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
		description: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		status: {
			type: Sequelize.ENUM(
				"نامشخص" /* fail status */,
				"موفق" /* success status */,
				"ناموفق" /* pending status */
			),
			allowNull: false,
		},
		action: {
			type: Sequelize.ENUM("کاهش" /* decrease */, "افزایش" /* increase */),
			allowNull: false,
		},
		resource: {
			type: Sequelize.ENUM(
				"کیف پول" /* wallet */,
				"پرداخت مستقیم" /* direct payment */,
				"معامله سیستم" /* system transaction */
			),
			allowNull: false,
		},
		trace_code: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		courseId: {
			type: Sequelize.INTEGER,
			allowNull: true,
		},
		seminarId: {
			type: Sequelize.INTEGER,
			allowNull: true,
		},
	},
	{
		timestamp: true,
	}
);

module.exports = wallet;
