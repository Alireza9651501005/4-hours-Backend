/**
 * For handling response formatting
 */
class ResponseBuilder {
	constructor() {
		this.devMsg = [];
		this.userMessage = {};
		this.data = null;
	}

	addDevMsg(devMsg) {
		this.devMsg.push(devMsg);
	}

	setUserMessage(msg, type, popup) {
		this.userMessage.message = msg;
		this.userMessage.type = type || "success";
		this.userMessage.popup = popup || false;
	}

	setResponseData(data) {
		this.data = data;
	}

  build() {
    
		if (this.userMessage.message && this.devMsg.length > 0) {
			return {
				data: this.data,
				message: this.userMessage,
				error: this.devMsg,
			};
    }
    
		if (this.userMessage.message) {
			return {
				data: this.data,
				message: this.userMessage,
			};
    }
    
		if (!this.userMessage.message && this.devMsg.length > 0) {
			return {
				data: this.data,
				error: this.devMsg,
			};
    }
    
		return {
			data: this.data
		};
	}
}

module.exports = ResponseBuilder;
