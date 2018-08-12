"use strict";

let config 	= require("../config");
let logger 	= require("../core/logger");
let path 	= require("path");

module.exports = function(app, db) {

	// Handle health check routes
	require("./health")(app, db);

	// Load services routes
	let services = require("../core/services");
	services.registerRoutes(app, db);

	// Handle errors
	require("./errors")(app, db);	
};
