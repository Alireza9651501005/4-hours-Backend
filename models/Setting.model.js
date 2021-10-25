const Sequelize = require("sequelize");

const db = require("../database/database");

const setting = db.define(
	"setting",
	{
		id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			allowNull: false,
			primaryKey: true,
		},
		key: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		value: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		other_values: {
			type:
				Sequelize.STRING /* JSON information that are not neccesary for all field */,
			allowNull: true,
			defaultValue: "",
		},
	},
	{
		timestamp: true,
	}
);

module.exports = setting;
