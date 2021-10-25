const Sequelize = require("sequelize");

const db = require("../database/database");

const network = db.define(
	"network",
	{
		id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			allowNull: false,
			primaryKey: true,
		},
		score: {
			type: Sequelize.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
		negative: {
			type: Sequelize.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
		guest_id: {
			type: Sequelize.INTEGER,
			allowNull: false,
		},
		level: {
			type: Sequelize.ENUM("1", "2", "3", "4"),
			allowNull: false,
		},
	},
	{
		timestamp: true,
	}
);

module.exports = network;
