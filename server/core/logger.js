"use strict";

let winston = require("winston");
let path = require("path");
let fs = require("fs");
let mkdirp = require("mkdirp");

let config = require("../config");

let	transports = [];

/**
 * Console transporter
 */
transports.push(new winston.transports.Console({
	level: config.logging.console.level,
	colorize: true,
	prettyPrint: true,
	handleExceptions: process.env.NODE_ENV === "production"
}));

/**
 * File transporter
 */
if (config.logging.file.enabled) {

	// Create logs directory
	let logDir = config.logging.file.path;
	if (!fs.existsSync(logDir)) {
		mkdirp(logDir);
	}
	
	transports.push(new (require("winston-daily-rotate-file"))({
		filename: path.join(logDir, "server.log"),
		level: config.logging.file.level || "info",
		timestamp: true,
		json: config.logging.file.json || false,
		handleExceptions: true
	}));
		
	if (config.logging.file.exceptionFile) {
		transports.push(new winston.transports.File({
			filename: path.join(logDir, "exceptions.log"),
			level: "error",
			timestamp: true,
			json: config.logging.file.json || false,
			prettyPrint: true,
			handleExceptions: true,
			humanReadableUnhandledException: true
		}));
	}	
}

let logger = new winston.Logger({
	level: "debug",
	transports: transports,
	exitOnError: false
});

module.exports = logger;
