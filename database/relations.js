const {
	User,
	Course,
	Chapter,
	Lesson,
	Attachment,
	Tag,
	Comment,
	Comment_User,
	User_Course,
	Message,
	User_Lesson,
	UserDevice,
	Score,
	PaymentLog,
	Wallet,
	Network,
	LessonVideoLog,
	Order,
	Discount,
} = require("./models");

/**
 * defining database relations
 */
module.exports = () => {
	/* user relation to userDevice */
	User.hasMany(UserDevice);
	UserDevice.belongsTo(User);

	/* user relation to wallet */
	User.hasMany(Wallet);
	Wallet.belongsTo(User);

	/* user relation to network */
	User.hasMany(Network);
	Network.belongsTo(User);

	/* user relation to paymentLog */
	User.hasMany(PaymentLog);
	PaymentLog.belongsTo(User);

	Course.hasMany(PaymentLog);
	PaymentLog.belongsTo(Course);

	/* user relation to score */
	User.hasMany(Score);
	Score.belongsTo(User);

	User.hasMany(User_Course);
	User_Course.belongsTo(User);
	

	// /* course relation to user (user's library) */
	User.belongsToMany(Course, { through: User_Course });
	Course.belongsToMany(User, { through: User_Course });

	/* lesson relation to user */
	Lesson.belongsToMany(User, { through: User_Lesson });
	User.belongsToMany(Lesson, { through: User_Lesson });

	/* message relation to user */
	User.hasMany(Message);
	Message.belongsTo(User);

	/* course relation to chapter */
	Course.hasMany(Lesson);
	Lesson.belongsTo(Course);

	/* course relation to attachment */
	Course.hasMany(Attachment);
	Attachment.belongsTo(Course);

	/* course relation to tag */
	Course.belongsToMany(Tag, { through: "course_tag" });
	Tag.belongsToMany(Course, { through: "course_tag" });

	/* comment relation to user */
	Comment.belongsToMany(User, { through: Comment_User });
	User.belongsToMany(Comment, { through: Comment_User });
	User.hasMany(Comment);
	Comment.belongsTo(User);

	/* comment relation to lesson */
	Lesson.hasMany(Comment);
	Comment.belongsTo(Lesson);

	/* user relation to lessonVideoLog */
	User.hasMany(LessonVideoLog);
	LessonVideoLog.belongsTo(User);

	/* lesson relation to lessonVideoLog */
	Lesson.hasMany(LessonVideoLog);
	LessonVideoLog.belongsTo(Lesson);

	/* user relation to order */
	User.hasMany(Order);
	Order.belongsTo(User);

	/* course relation to order */
	Course.hasMany(Order);
	Order.belongsTo(Course);

	/* wallet relation to order */
	Wallet.hasOne(Order);
	Order.belongsTo(Wallet);

	/* paymentLog relation to order */
	PaymentLog.hasOne(Order);
	Order.belongsTo(PaymentLog);

	/* discount relation to order */
	Discount.hasMany(Order);
	Order.belongsTo(Discount);
};
