const Sequelize = require("sequelize");

const db = require("../database/database");

const userCheck = db.define(
	"userCheck",
	{
		id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			allowNull: false,
			primaryKey: true,
		},
		phone_email: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		verification_code: {
			type: Sequelize.STRING,
			allowNull: false,
		},
	},
	{
		timestamp: true,
	}
);

module.exports = userCheck;
