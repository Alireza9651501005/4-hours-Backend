const Sequelize = require("sequelize");

const db = require("../database/database");

const userDevice = db.define(
	"userDevice",
	{
		id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			allowNull: false,
			primaryKey: true,
		},
		os: {
			type: Sequelize.ENUM("android", "iOS", "windows", "browser"),
			allowNull: false,
		},
		os_version: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		brand: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		device_uuid: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		logged_in: {
			type: Sequelize.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
		firebase_token: {
			type: Sequelize.STRING,
			allowNull: false,
			defaultValue: "",
		},
	},
	{
		timestamp: true,
	}
);

module.exports = userDevice;
