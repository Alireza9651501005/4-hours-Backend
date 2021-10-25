const Sequelize = require("sequelize");
const dotenv = require("dotenv");

dotenv.config();

const db = process.env.DB;
const username = process.env.DB_USERNAME;
const password = process.env.DB_PASSWORD;

const sequelize = new Sequelize(db, username, password, {
	dialect: process.env.DB_DIALECT,
	host: process.env.DB_HOST,
	logging: false,
	define: {
		charset: "utf8",
		collate: "utf8_general_ci",
	},
});

module.exports = sequelize;
