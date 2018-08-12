"use strict";

let logger 			= require("./logger");
let config 			= require("../config");

let express 		= require("express");
let http 			= require("http");
let path 			= require("path");

let moment 			= require("moment");
let morgan 			= require("morgan");
let bodyParser 		= require("body-parser");
let validator 		= require("express-validator");

let compress 		= require("compression");
let methodOverride 	= require("method-override");
let helmet 			= require("helmet");
let crossdomain 	= require("helmet-crossdomain");
let mongoose 		= require("mongoose");

/**
 * Initialize middlewares
 * 
 * @param {any} app
 */
function initMiddleware(app) {

	app.use(function (req, res, next) {
			// Website you wish to allow to connect , in owr case it`s localhost
		res.setHeader("Access-Control-Allow-Origin", "http://localhost:" + "8080");

			// Request methods you wish to allow
		res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");

			// Request headers you wish to allow
		res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type");

			// Pass to next layer of middleware
		next();
	});

	app.use(express.static(path.join(__dirname, 'public')));
	// Should be placed before express.static
	app.use(compress({
		filter: function(req, res) {
			return /json|text|javascript|css/.test(res.getHeader("Content-Type"));
		},
		level: 3,
		threshold: 512
	}));

	// Configure express app
	app.set("port", config.port);

	// Request body parsing middleware should be above methodOverride
	app.use(bodyParser.urlencoded({
		extended: true,
		limit: config.contentMaxLength * 2
	}));

	app.use(validator());
	app.use(bodyParser.json());	
	app.use(methodOverride());

	if (config.isDevMode()) {
		// Init morgan
		let stream = require("stream");
		let lmStream = new stream.Stream();

		lmStream.writable = true;
		lmStream.write = function(data) {
			return logger.debug(data);
		};	

		app.use(morgan("dev", {
			stream: lmStream
		}));

		// app.use(require('express-status-monitor')());
	}
}

/**
 * Initiliaze Helmet security module
 * 
 * @param {any} app
 */
function initHelmetHeaders(app) {
	// Use helmet to secure Express headers
	app.use(helmet.xssFilter());
	app.use(helmet.noSniff());
	app.use(helmet.frameguard());
	app.use(helmet.ieNoOpen());
	app.use(crossdomain());
	app.use(helmet.hidePoweredBy());
}

module.exports = function(db) {

	// Create express app
	let app = express();

	// Init middlewares
	initMiddleware(app);

	// Init Helmet security headers
	initHelmetHeaders(app);


	// Load services
	let services = require("./services");
	services.loadServices(app, db);

	// Load routes
	require("../routes")(app, db);

	return app;
};
