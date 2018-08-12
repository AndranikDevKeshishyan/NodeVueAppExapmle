"use strict";

let path = require("path");
let pkg = require("../../package.json");

module.exports = {
	app: {
		title: pkg.title,
		version: pkg.version,
		description: pkg.description,
		keywords: pkg.keywords.join(","),
		url: "http://localhost:" + (process.env.PORT || 3000) + "/"
	},

	ip: process.env.NODE_IP || "0.0.0.0",
	port: process.env.PORT || 3000,

	rootPath: global.rootPath,
	test: false,

	db: {
		uri: process.env.MONGO_URI || "mongodb://localhost/" + pkg.config.dbName + "-dev",
		options: {
			user: "",
			pass: ""
		}
	},
	logging: {
		console: {
			level: "debug"
		},

		file: {
			enabled: false,
			path: path.join(global.rootPath, "logs"),
			level: "info",
			json: false,
			exceptionFile: true
		}
	}
};