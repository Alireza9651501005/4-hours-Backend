module.exports = {
	headers: [
		"Content-Type",
		"Authorization",
		"client_id",
		"client_secret",
		"os",
		"os_version",
		"device_uuid",
		"device_brand",
		"Access-Control-Expose-Headers",
		"X-Total-Count",
		"Uuid",
	],
	exposedHeaders: ["Uuid"],
	origins: [
		"http://localhost:3000",
		"http://pms-pwa.myfreenet.ir",
		"http://pms-ui.myfreenet.ir",
		"http://pms-admin.myfreenet.ir",
	],
	methods: ["GET", "POST", "PUT", "DELETE", "OPTION"],
};
