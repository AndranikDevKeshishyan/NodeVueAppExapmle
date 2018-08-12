"use strict";

let logger 			= require("./logger");
let config 			= require("../config");

let EventEmitter	= require("events").EventEmitter;
let listEndpoints	= require("express-list-endpoints");
let	path 			= require("path");
let	fs 				= require("fs");
let	util 			= require("util");
let _ 				= require("lodash");
let chalk 			= require("chalk");
let express			= require("express");

let Context 		= require("./context");
let response		= require("./response");

let Service			= require("./service");

/**
 * Service handler class
 */
class Services extends EventEmitter {

	/**
	 * Constructor of Service
	 */
	constructor() {
		super();
		this.setMaxListeners(0); // turn off

		this.app = null;
		this.db = null;
		this.services = {};
	}

	/**
	 * Load built-in and modules services. Scan the folders
	 * and load service files
	 * 
	 * @param  {Object} app ExpressJS instance
	 * @param  {Object} db  Database instance
	 */
	loadServices(app, db) {
		let self = this;
		self.app = app;
		self.db = db;

		let addService = function(serviceSchema) {
			let service = new Service(serviceSchema, app, db);
			self.services[service.name] = service;
		};

		if (fs.existsSync(path.join(__dirname, "..", "modules"))) {

			let providerService = require("../modules/provider/service");

			logger.info("  Load", path.relative(path.join(__dirname, "..", "modules"), "provider"), "service...");
			addService(providerService);

			let userService = require("../modules/user/service");
			
			logger.info("  Load", path.relative(path.join(__dirname, "..", "modules"), "user"), "service...");
			addService(userService);
    
		}

		// Call `init` of services
		_.forIn(self.services, (service) => {
			if (_.isFunction(service.$schema.init)) {
				service.$schema.init.call(service, Context.CreateToServiceInit(service));
			}
		});
	}

	/**
	 * Register actions of services as REST routes
	 * 
	 * @param  {Object} app ExpressJS instance
	 */
	registerRoutes(app) {
		let self = this;

		//logger.info("Register routes ", this.services);
		_.forIn(this.services, (service, name) => {
			if (service.actions) {

				let router = express.Router();

				let idParamName = service.$settings.idParamName || "id";

				let lastRoutes = [];

				_.forIn(service.actions, (actionFunc, name) => {

					let action = actionFunc.settings;
					action.handler = actionFunc;

					if (!_.isFunction(action.handler))
						throw new Error(`Missing handler function in '${name}' action in '${service.name}' service!`);

					// Make the request handler for action
					let handler = (req, res) => {
						let ctx = Context.CreateFromREST(service, action, app, req, res);
						logger.debug(`Request via REST '${service.namespace}/${action.name}' (ID: ${ctx.id})`, ctx.params);
						console.time("REST request");
						self.emit("request", ctx);

						Promise.resolve()

						// Resolve model if ID provided
						.then(() => {
							return ctx.resolveModel();
						})

						// Call the action handler
						.then(() => {
							return action.handler(ctx);
						})

						// Response the result
						.then((json) => {
							res.append("Request-Id", ctx.id);
							response.json(res, json);
						})

						// Response the error
						.catch((err) => {
							logger.error(err);
							response.json(res, null, err);
						})

						.then(() => {
							self.emit("response", ctx);
							console.timeEnd("REST request");
							//logger.debug("Response time:", ctx.responseTime(), "ms");
						});

					};

					// Register handler to GET and POST method types
					// So you can call the /api/namespace/action with these request methods.
					//
					// 		GET  /api/namespace/addProvider?id=123
					// 		POST /api/namespace/addProvider?id=123
					router.get("/" + name, handler);
					router.post("/" + name, handler);

					// You can call with ID in the path 
					// 		GET  /api/namespace/123/addProvider
					// 		POST /api/namespace/123/addProvider
					router.get("/:" + idParamName + "/" + name, handler);
					router.post("/:" + idParamName + "/" + name, handler);

					// Create default RESTful handlers
					switch (name) {

					// You can call the `find` action with 
					// 		GET /api/namespace/
					case "find": {
						router.get("/", handler);	
						break;
					}

					// You can call the `get` action with
					// 		GET /api/namespace/?id=123 
					// 	or 
					// 		GET /api/namespace/123
					case "get": {
						//router.get("/" + idParamName, handler);	
						lastRoutes.push({ method: "get", path: "/:" + idParamName, handler: handler });
						break;
					}

					// You can call the `create` action with 
					// 		POST /api/namespace/
					case "create": {
						// router.post("/:" + idParamName, handler);	
						lastRoutes.push({ method: "post", path: "/:" + idParamName, handler: handler });
						router.post("/", handler);	
						break;
					}

					// You can call the `update` action with
					// 		PUT /api/namespace/?id=123 
					// 	or 
					// 		PATCH /api/namespace/?id=123 
					// 	or 
					// 		PUT /api/namespace/123
					// 	or 
					// 		PATCH /api/namespace/123
					case "update": {
						// router.put("/:" + idParamName, handler);	
						lastRoutes.push({ method: "put", path: "/:" + idParamName, handler: handler });
						// router.patch("/:" + idParamName, handler);	
						lastRoutes.push({ method: "patch", path: "/:" + idParamName, handler: handler });

						router.put("/", handler);	
						router.patch("/", handler);	
						break;
					}

					// You can call the `remove` action with 
					// 		DELETE /api/namespace/?id=123 
					// 	or 
					// 		DELETE /api/namespace/123
					case "remove": {
						// router.delete("/:" + idParamName, handler);	
						lastRoutes.push({ method: "delete", path: "/:" + idParamName, handler: handler });
						router.delete("/", handler);	
						break;
					}
					}

				});
				
				// Register '/:id' routes 
				lastRoutes.forEach((item) => {
					router[item.method](item.path, item.handler);
				});
				

				// Register router to namespace
				app.use("/api/" + service.namespace, router);
				
				// Register a version namespace
				if (service.version) {
					app.use("/api/v" + service.version + "/" + service.namespace, router);
				}
			}
		});
	}

	/**
	 * Get a service by name
	 * @param  {String} serviceName Name of service
	 * @return {Object}             Service instance
	 */
	get(serviceName) {
		return this.services[serviceName];
	}

	/**
	 * Print service info to the console (in dev mode)
	 * 
	 * @memberOf Services
	 */
	printServicesInfo() {
		let endPoints = listEndpoints(this.app);
		//logger.debug(endPoints);
	}
}

// Export instance of class
module.exports = new Services();
