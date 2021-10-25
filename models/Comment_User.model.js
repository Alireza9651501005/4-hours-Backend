const Sequelize = require("sequelize");

const db = require("../database/database");

const comment_user = db.define(
	"comment_user",
	{
		reaction: {
			type: Sequelize.ENUM("LIKE", "DISLIKE", "NONE"),
			allowNull: false,
			defaultValue: "NONE",
		},
		commentId: {
			type: Sequelize.INTEGER,
			allowNull: false,
		},
		userId: {
			type: Sequelize.INTEGER,
			allowNull: false,
		},
	},
	{
		timestamp: true,
	}
);

module.exports = comment_user;
