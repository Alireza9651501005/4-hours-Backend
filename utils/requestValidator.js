const { validationResult } = require("express-validator");

/**
 * For restructuring response when validation went wrong
 * @param {request} req 
 * @param {ResponseBuilder} responseStructure 
 */
module.exports = (req, responseStructure) => {
    const error = [];
    const validationError = validationResult(req);

    if (!validationError.isEmpty()) {
        const validationErrors = validationError.array();

        validationErrors.forEach((el) => {
            const errObject = {
                message: el.msg,
                field: el.param,
            };

            error.push(errObject);
            responseStructure.addDevMsg(errObject);
        });

        responseStructure.setUserMessage(error[0].message, "error");
        return responseStructure.build();
    } else {
        return false;
    }
};