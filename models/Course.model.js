const Sequelize = require("sequelize");

const db = require("../database/database");

const course = db.define(
  "course",
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    title1: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    title2: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    level: {
      type: Sequelize.ENUM("پیشرفته", "متوسط", "مقدماتی"),
      allowNull: false,
    },
    image: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    image_background: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    image_background_color: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "#008888",
    },
    level_image: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    price_title: {
      type: Sequelize.Sequelize.ENUM("رایگان", "نقدی"),
      allowNull: false,
    },
    price: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    last_price: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    short_description: {
      type: Sequelize.TEXT,
      allowNull: false,
      defaultValue: "",
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: false,
      defaultValue: "",
    },
    total_hours: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    exam_score: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    exam_try_count: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    has_exam: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    exam_link: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    timestamp: true,
  }
);

module.exports = course;
