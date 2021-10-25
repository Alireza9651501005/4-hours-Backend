const setActionAsBody = (req, res, next) => {
	if (req.action !== undefined) {
		req.body = req.action;
	}
	next();
};

module.exports = setActionAsBody;
