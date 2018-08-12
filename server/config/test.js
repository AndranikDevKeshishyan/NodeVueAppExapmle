"use strict";

let pkg = require("../../package.json");

module.exports = {
	app: {
		title: pkg.name + " [Test mode]"
	},
	
	hashSecret: "test",
	sessionSecret: "test",
	
	test: true,

	db: {
		uri: "mongodb://localhost/" + pkg.config.dbName + "-test",
		options: {
			user: "",
			pass: ""
		}
	}
};