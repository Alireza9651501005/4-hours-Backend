const Sequelize = require("sequelize");

const db = require("../database/database");

const Admin = db.define(
	"admin",
	{
		id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			allowNull: false,
			primaryKey: true,
		},
		username: {
			type: Sequelize.STRING,
			allowNull: false,
			unique: true,
		},
		email: {
			type: Sequelize.STRING,
			allowNull: true,
			unique: true,
		},
		email_verified: {
			type: Sequelize.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
		email_verification_code: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		password: {
			type: Sequelize.STRING,
			allowNull: false,
			private: true,
		},
		security_update_time: {
			type: Sequelize.STRING,
			allowNull: false,
		},
	},
	{
		timestamps: true,
	}
);

module.exports = Admin;
