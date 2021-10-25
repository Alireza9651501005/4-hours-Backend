const jalaali = require("jalaali-js");
const Sequelize = require("sequelize");
const { Op, or } = require("sequelize");
const fs = require("fs");
const path = require("path");


const {
    Order,
    Course,
    User,
    Wallet,
    PaymentLog,
    Discount,
} = require("../../database/models");

const { convertPersianNumberToEnglish } = require("../../utils/input");
const MAIN_CONFIG = require("../../config/mainConfig");
const ResponseBuilder = require("../../utils/responseBuilder");
const requestValidator = require("../../utils/requestValidator"); // for validating requests efficiently
const { trace } = require("console");

const ORDER_INFO = [
	"id",
	"total_amount",
    "cash_amount",
	"wallet_amount",
	"discount_amount",
	"description",
	"status",
	"userId",
	"courseId",
	"walletId",
	"paymentlogId",
	"discountId",
	"stars_discount_amount",
	"order_key",
	"createdAt",
];

const ordersFormatter = (orders) => {
    const final = [];
  
    for (let i = 0; i < orders.length; i++) {
      // console.log(comments[i]);
      const order = orders[i];
      const createdAt = jalaali.toJalaali(order.createdAt);
      order.createdAt = `${createdAt.jy}/${createdAt.jm}/${createdAt.jd}`;
  
      if (!order.course) {
        const finalOrder = { ...order.dataValues };
        final.push(finalOrder);
      } else {
        const finalOrder = {
          ...order.dataValues,
          courseId: order.course.id,
          paymentLogId: order.paymentLog.id,
          userId: order.user.id,
          discountId: order.discount.id,
          walletId: order.wallet.id,
        };
        final.push(finalOrder);
      }
    }
    return final;
  };


/**
 * sending all orders information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

 exports.getAllOrders= async(req, res, next) =>{
	const startFrom = req.query["_start"];
	const endFrom = req.query["_end"];
	const orderBy = req.query["_order"] || "ASC";
	const sortBy = req.query["_sort"];
	const all = req.query["_all"];
	// const stars = +req.query["stars"];
	const searchQuery = req.query["q"] || ""; 

	try {
		if(all){
			const allOrders = await Order.findAll();
			// console.log(allOrders);
			res.set("X-Total-Count", allOrders.length);
			res.set("Access-Control-Expose-Headers", "X-Total-Count");

			return res.status(200).json(ordersFormatter(allOrders));
		}
		if(searchQuery !== ""){
			let thisOrders = [],
				allOrders = [];
			if(searchQuery !== ""){
				thisOrders = await Order.findAll({
					where: {
                        [Op.or]: [
                          { "$user.username$": { [Op.startsWith]: searchQuery } },
                          { "$user.name$": { [Op.startsWith]: searchQuery } },
                        //   { "$Course.title$": { [Op.startsWith]: searchQuery } },
						  { status: { [Op.startsWith]: searchQuery } },
						  { userId: { [Op.like]: searchQuery } },
						  { total_amount: { [Op.startsWith]: searchQuery } }
                        ],
                      },
                      include: [
                        {
						  as: 'user',
                          model: User,
                          required: false,
                        },
						// {
						// 	model: Course,
						// 	required: false,
						// },
                      ],
					attributes: ORDER_INFO,
					order: [[sortBy, orderBy]],
					offset: +startFrom,
					limit: +endFrom - +startFrom,
				});

				allOrders = await Order.findAll({
					where: {
                        [Op.or]: [
                          { "$user.username$": { [Op.startsWith]: searchQuery } },
                          { "$user.name$": { [Op.startsWith]: searchQuery } },
                        //   { "$Course.title$": { [Op.startsWith]: searchQuery } },
						  { status: { [Op.startsWith]: searchQuery } },
						  { userId: { [Op.like]: searchQuery } },
						  { total_amount: { [Op.startsWith]: searchQuery } }
                        ],
                      },
                      include: [
                        {
						  as: 'user',
                          model: User,
                          required: false,
                        },
						// {
						// 	model: Course,
						// 	required: false,
						//   },
                      ],
				});
			}
			res.set("X-Total-Count", allOrders.length);
			res.set("Access-Control-Expose-Headers", "X-Total-Count");
			return res.status(200).json(ordersFormatter(thisOrders));	
		}
		const thisOrders = await Order.findAll({
			attributes: ORDER_INFO,
			order: [[sortBy, orderBy]],
			offset: +startFrom,
			limit: +endFrom - +startFrom,
            include:[Course],
            include:[User],
            include:[Wallet],
            include:[PaymentLog],
            include:[Discount],
		});

		const allOrders = await Order.findAll();

		res.set("X-Total-Count", allOrders.length);
		res.set("Access-Control-Expose-Headers", "X-Total-Count");

		return res.status(200).json(ordersFormatter(thisOrders));
	} catch (err) {
	console.log(err);
	res.status(500).json();
	}
 };

/**
 * getting order information
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */
exports.getOneOrder = async (req, res, next) => {
	const orderId = req.params["orderId"];

	try {
		const order = await Order.findOne({
			where: {
				id: orderId,
			},
			attributes: ORDER_INFO,
            include:[Course],
            include:[User],
            include:[Wallet],
            include:[PaymentLog],
            include:[Discount],
		});

		if (!order) {
			return res.status(404).json();
		}

		return res.status(200).json(ordersFormatter([order])[0]);
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
};

 /**
 * creating  order
 * @param {req} req request
 * @param {res} res response
 * @param {next} next
 */

 exports.createOrder= async (req, res, next ) => {
	 const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}

	const {
        total_amount,
        cash_amount,
        wallet_amount,
        discount_amount,
        description,
        status,
        userId,
        courseId,
        walletId,
        paymentlogId,
        discountId,
        stars_discount_amount,
        order_key,
	} = req.body;

	try {
		// creating new order
		const newOrder = await Order.create({
			total_amount: total_amount,
			cash_amount: cash_amount,
			wallet_amount: wallet_amount,
			discount_amount: discount_amount,
			description: description,
			userId: userId,
			status: status,
			courseId: courseId,
			walletId: walletId,
			paymentlogId: paymentlogId,
			discountId: discountId,
			stars_discount_amount: stars_discount_amount,
			order_key: order_key,
		});

		return res.status(201).json(newOrder.dataValues);
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
}

 exports.updateOneOrder = async (req, res, next) => {
	const orderId = req.params["orderId"];
	const response = new ResponseBuilder();

	const isRequestInvalid = requestValidator(req, response);
	if (isRequestInvalid) {
		return res.status(422).json(isRequestInvalid);
	}
	
	const {
        total_amount,
        cash_amount,
        wallet_amount,
        discount_amount,
        description,
        status,
        userId,
        courseId,
        walletId,
        paymentlogId,
        discountId,
        stars_discount_amount,
        order_key,
	} = req.body;

	 try {
		const order = await Order.findOne({
			where: {
				id: orderId,
			},
			attributes: ORDER_INFO,
		});

		if (!order) {
			return res.status(404).json();
		}

		order.total_amount = total_amount;
		order.cash_amount = cash_amount;
		order.wallet_amount = wallet_amount;
		order.discount_amount = discount_amount;
		order.description = description;
		order.status = status;
		order.userId = userId;
		order.walletId = walletId;
		order.courseId = courseId;
		order.paymentLogId = paymentlogId;
		order.discountId = discountId;
		order.stars_discount_amount = stars_discount_amount;
		order.order_key = order_key;
		const updatedOrder = await order.save();

		return res.status(200).json(updatedOrder);
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
};

exports.deleteOneOrder = async (req, res, next) => {
	const orderId = req.params["orderId"];

	try {
		const order = await Order.findOne({
			where: {
				id: orderId,
			},
			attributes: ORDER_INFO,
		});

		if (!order) {
			return res.status(404).json();
		}

		await order.destroy();
		/* do later */
		return res.status(200).json();
	} catch (err) {
		console.log(err);
		res.status(500).json();
	}
};
