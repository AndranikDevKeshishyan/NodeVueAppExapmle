"use strict";

let logger 		= require("./logger");
let config 		= require("../config");

let _			= require("lodash");

let Services;

let warn = function(msg) {
	logger.warn("[Service warn]: " + msg);
};

let exception = function(msg) {
	throw new Error("[Service warn]: " + msg);
};

class Service {

	/**
	 * Creates an instance of Service.
	 * 
	 * @param {any} schema
	 * @param {any} app
	 * @param {any} db
	 * 
	 * @memberOf Service
	 */
	constructor(schema, app, db) {
		let self = this;
		schema = schema || {};
		self.$schema = schema; 
		self.$app = app;
		self.$db = db;

		if (!Services) 
			Services = require("./services");		

		if (!schema.settings)
			exception(`No settings of service '${self.name}'! Please create a settings object in service schema!`);

		let settings = _.defaultsDeep(schema.settings, {
			version: 1,
			namespace: "",
			idParamName: "id", // GET /users/find?id=1
			modelPropFilter: null
		});
		self.$settings = settings;

		// Common properties
		self.name = settings.name;
		self.version = settings.version;
		self.namespace = settings.namespace;
		self.collection = settings.collection;

		// Assert properties
		if (!self.name)
			exception(`No name of service '${self.name}'! Please set in settings of service schema!`);

		if (!self.namespace && (settings.rest || settings.ws || settings.graphql))
			exception(`No namespace of service '${self.name}'! Please set in settings of service schema!`);	

		// Handle actions
		if (schema.actions && _.isObject(schema.actions)) {
			self.actions = {};
			_.forIn(schema.actions, (action, name) => {
				if (_.isFunction(action)) {
					// Change action function to action object
					action = {
						handler: action,
						name: name
					};
				}

				if (_.isFunction(action.handler)) {
					let func = action.handler.bind(self);
					
					self.actions[name] = func;
				}
				self.actions[name].settings = action;
				self.actions[name].settings.name = self.actions[name].settings.name || name;
				delete self.actions[name].settings.handler;

			});
		}

		// Handle methods
		if (schema.methods && _.isObject(schema.methods)) {
			_.forIn(schema.methods, (method, name) => {
				if (["name", "version", "namespace", "collection", "actions"].indexOf(name) != -1) {
					warn(`Invalid method name '${name}' in '${self.name}' service! Skipping...`);
					return;
				}

				if (["toJSON", "getByID", "modelResolver"].indexOf(name) != -1) {
					warn(`This method name '${name}' is prohibited under 'methods' object. If you want to override the built-in method, please declare in the root of service schema! Skipping...`);
					return;
				}
				
				self[name] = method.bind(self);
			});
		}

		// Handle internal methods overrides
		let internalMethods = ["toJSON", "getByID", "modelResolver"];
		internalMethods.forEach((name) => {
			if (_.isFunction(schema[name])) {
				// Save the original function
				self["__" + name] = self[name];
				// Override
				self[name] = schema[name].bind(self);
			}
		});
	}

	/**
	 * Convert the `docs` MongoDB model to JSON object.
	 * With `skipFields` can be filter the properties
	 * 
	 * @param {any} 	docs		MongoDB document(s)
	 * @param {String} 	propFilter	Filter properties of model. It is a space-separated `String` or an `Array`
	 * @returns						JSON object/array
	 * 
	 * @memberOf Service
	 */
	toJSON(docs, propFilter) {
		let func = function(doc) {
			let json = doc.toJSON();
			if (propFilter != null)
				return _.pick(json, propFilter);
			else
				return json;
		};

		if (propFilter == null) {
			propFilter = this.$settings.modelPropFilter;
		}

		if (_.isString(propFilter)) 
			propFilter = propFilter.split(" ");

		if (_.isArray(docs)) {
			return _.map(docs, (doc) => func(doc, propFilter));
		} else if (_.isObject(docs)) {
			return func(docs);
		}
	}

	/**
	 * Populate models by schema
	 * 
	 * @param {any} docs			Models
	 * @param {any} populateSchema	schema for population
	 * @returns	{Promise}
	 * 
	 * @memberOf Service
	 */
	populateModels(docs, populateSchema) {
		populateSchema = populateSchema || this.$settings.modelPopulates; 
		if (docs != null && populateSchema) {
			let promises = [];
			_.forIn(populateSchema, (serviceName, field) => {
				if (_.isString(serviceName)) {
					let service = Services.get(serviceName);
					if (service && _.isFunction(service["getByID"])) {
						let items = _.isArray(docs) ? docs : [docs]; 
						items.forEach((doc) => {
							promises.push(service.getByID(doc[field]).then((populated) => {
								doc[field] = populated;
							}));
						});
					}
				}
			});

			if (promises.length > 0) {
				return Promise.all(promises).then(() => {
					return docs;
				});
			}
		}
		return Promise.resolve(docs);		
	}	

	/**
	 * Get model(s) by ID(s). The `id` can be a number or an array with IDs.
	 * 
	 * @param {Number|Array} id
	 * @returns {Object|Array} JSON object(s)
	 */
	getByID(id) {
		if (this.collection == null || id == null)
			return Promise.resolve();

		if (_.isArray(id) && id.length == 0)
			return Promise.resolve([]);

		let query;
		if (_.isArray(id)) {
			query = this.collection.find({ _id: { $in: id} });
		} else
            query = this.collection.findById(id);

		return query.exec().then((docs) => {
			return this.toJSON(docs);
		})
        .then((json) => {
			return this.populateModels(json);
        });
	}	

	/**
	 * Resolve model by `code` param
	 * 
	 * @param {any} ctx		Context of request
	 * @param {any} code	Code of the model
	 * @returns	{Promise}
	 */	
	modelResolver(ctx, id) {
		if (this.collection == null)
			return Promise.resolve();

		ctx.modelID = id;

		if (id == null || id == "")
			return ctx.errorBadRequest(C.ERR_INVALID_CODE, ctx.t("app:InvalidCode"));

		return this.getByID(id);
	}

	/**
	 * Get a service by name of service
	 * 
	 * @param {any} serviceName
	 * @returns {Service}
	 * 
	 * @memberOf Service	
	 */
	services(serviceName) {
		return Services.get(serviceName);
	}

}

module.exports = Service;