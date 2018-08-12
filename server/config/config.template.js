"use strict";

let path = require("path");
let pkg = require("./package.json");

module.exports = {

	// Application settings
	app: {
		//version: "1.0.0",
		
	},

	// ip: process.env.NODE_IP || "0.0.0.0",
	// port: process.env.NODE_PORT || 3000,

	// Database (Mongo) settings
	db: {
		// uri: process.env.MONGO_URI || "mongodb://localhost/vemapp",
		options: {
			user: process.env.MONGO_USERNAME || "",
			pass: process.env.MONGO_PASSWORD || ""
		}
	},
	// Logging settings
	logging: {
		
		console: {
			// level: "debug"
		},

		file: {
			enabled: false,
			// path: path.join(global.rootPath, "logs"),
			// level: "info",
			// json: false,
			// exceptionsSeparateFile: true
		}
	}

};

