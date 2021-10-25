const Sequelize = require("sequelize");

const db = require("../database/database");

const comment = db.define(
  "comment",
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      // allowNull: false,
      primaryKey: true,
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    likes: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    dislikes: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: Sequelize.ENUM("تایید شده", "تایید نشده"),
      allowNull: false,
      // defaultValue: 0,
    },
    parent_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    score: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    timestamp: true,
  }
);

module.exports = comment;
