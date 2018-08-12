"use strict";

let logger 			= require("./logger");
let config 			= require("../config");
let response		= require("./response");
let tokgen			= require("../libs/tokgen");

let C 				= require("./constants");

let _ 				= require("lodash");

let Services; // circular reference

/**
 * Context class for requests
 */
class Context {
	/**
	 * Constructor of Context
	 * 
	 * @param {any} called service
	 */
	constructor(service) {
		this.id = tokgen(); 
		this.createdAt = Date.now(); 

		this.service = service; // service instance
		this.app = null; // ExpressJS app
		this.req = null; // req from ExpressJS router
		this.res = null; // res from ExpressJS router
		this.action = null; // action of service
		this.user = null;
		this.params = []; // params from ExpressJS REST
		this.model = null; // model from `modelResolvers` (This is a plain JSON object, not a Mongo doc!)
		this.modelID = null; // `id` of model from `modelResolvers`
		this.provider = "internal";

		this.validationErrors = [];

		if (!Services) 
			Services = require("./services");
	}

	/**
	 * Get a service by name of service
	 * 
	 * @param {any} serviceName
	 * @returns {Service}
	 * 
	 * @memberOf Context	
	 */
	services(serviceName) {
		return Services.get(serviceName);
	}

	/**
	 * Create a new Context from a REST request
	 * 
	 * @param {any} service
	 * @param {any} action
	 * @param {any} app
	 * @param {any} req
	 * @param {any} res
	 * @returns
	 */
	static CreateFromREST(service, action, app, req, res) {
		let ctx = new Context(service);
		ctx.provider = "rest";
		ctx.app = app;
		ctx.req = req;
		ctx.res = res;
		ctx.user = req.user;
		ctx.params = _.defaults({}, req.query, req.params, req.body);
		ctx.action = action;

		return ctx;
	}
	/**
	 * Create a new Context for initialize services
	 * 
	 * @param {any} service
	 * @param {any} app
	 * @param {any} db
	 * @returns
	 */
	static CreateToServiceInit(service) {
		let ctx = new Context(service);
		ctx.provider = "";
		ctx.app = service.$app;

		return ctx;
	}

	/**
	 * Initialize new Context from self
	 * 
	 * @param {any} params
	 * @returns
	 * 
	 * @memberOf Context
	 */
	copy(params, appendParams) {
		let newCtx = _.defaults(new Context(this.service), this);
		newCtx.provider = "internal";
		
		if (appendParams === true)
			newCtx.params = _.defaults(this.params, params);
		else
			newCtx.params = params;

		return newCtx;
	}
	
	/**
	 * Return the response time in milliseconds
	 * 
	 * @returns {Number}
	 * 
	 * @memberOf Context	
	 */
	responseTime() {
		return Date.now() - this.createdAt;
	}

	/**
	 * Resolve model from request by id/something else
	 * 
	 * @returns
	 * 
	 * @memberOf Context	
	 */
	resolveModel() {
		if (_.isFunction(this.service.modelResolver)) {
			let idParamName = this.service.$settings.idParamName || "id";

			let id = this.params[idParamName];

			if (id != null) {
				return this.service.modelResolver.call(this.service, this, id).then( (model) => {
					this.model = model;
					return model;
				});
			}
		}

		return Promise.resolve(null);
	}

	/**
	 * Check the ctx.model exists. If not we throw a BAD_REQUEST exception
	 * 
	 * @param {any} errorMessage
	 * @returns
	 * 
	 * @memberOf Context
	 */
	assertModelIsExist(errorMessage) {
		if (!this.model)
			throw this.errorBadRequest(C.ERR_MODEL_NOT_FOUND, errorMessage);

		return true;
	}

	/**
	 * Check the context has the `name` parameter may be needed in future maintain
	 * 
	 * @param {any} name
	 * @returns {boolean}
	 * 
	 * @memberOf Context	
	 */
	hasParam(name, errorMessage) {
		return this.params[name] != null;
	}

	/**
	 * Validate the requested parameters
	 * 
	 * @param {any} name
	 * @param {any} errorMessage
	 * @returns
	 * 
	 * @memberOf Context	
	 */
	
	validateParam(name, errorMessage) {
		let self = this;

		let validator = {
			name: name,
			value: null,
			errors: []
		};

		/**
		 * Check has no errors yet
		 * 
		 * @returns
		 */
		validator.noError = function() {
			return validator.errors.length == 0;
		};

		/**
		 * Add a new validation error
		 * 
		 * @param {any} message
		 */
		validator.addError = function(message) {
			validator.errors.push(message);
			self.validationErrors.push(message);
		};

		/**
		 * Close the validation. If no error set back the parameter value to this.params
		 * 
		 * @returns
		 */
		validator.end = function() {
			if (validator.noError())
				self.params[validator.name] = validator.value;

			return validator.value;
		};

		/**
		 * Throw exception if has validation error
		 * 
		 * @returns
		 */
		validator.throw = function() {
			if (!validator.noError())
				throw new Error(validator.errors.join(" "));
			
			return validator.value;
		};

		/**
		 * Assert the parameter is not empty
		 * 
		 * @param {any} errorMessage
		 * @returns
		 */
		validator.notEmpty = function(errorMessage) {
			if (validator.value == null || validator.value === "")
				validator.addError(errorMessage || `Parameter '${name}' is empty!`); // i18n

			if (_.isArray(validator.value) && validator.value.length == 0)
				validator.addError(errorMessage || `Parameter '${name}' is empty!`); // i18n

			return validator;
		};

		/**
		 * Assert the parameter is a Number
		 * 
		 * @param {any} errorMessage
		 * @returns
		 */
		validator.isNumber = function(errorMessage) {
			if (validator.value != null)
				return _.isNumber(validator.value);

			// We don't check if it is not null
			return true;
		};	

		/**
		 * Trim the content of parameter
		 * 
		 * @returns
		 */
		validator.trim = function() {
			if (validator.noError() && validator.value != null)
				validator.value = validator.value.trim();
			
			return validator;
		};

		let value = this.params[name];
		if (value != null) 
			validator.value = value;
		//else
		//	validator.addError(errorMessage || `Parameter '${name}' missing!`); // i18n

		return validator;
	}

	/**
	 * Check has validation errors
	 * 
	 * @returns
	 * 
	 * @memberOf Context	
	 */
	hasValidationErrors() {
		return this.validationErrors.length > 0;
	}

	/**
	 * Generate and throw a new BAD_REQUEST response error
	 * 
	 * @param {any} type 	type of error
	 * @param {any} msg		message of error (localized)
	 * 
	 * @memberOf Context	
	 */
	errorBadRequest(type, msg) {
		let err = new Error(msg);
		err = _.defaults(response.BAD_REQUEST);
		if (type)
			err.type = type;
		if (msg)
			err.message = msg;

		throw err;
	}
	/**
	 * Process limit, offset and sort params from request
	 * and use them in the query
	 *
	 * Example:
	 * 		GET /posts?offset=20&limit=10&sort=-votes,createdAt
	 * 
	 * @param  {query} query Mongo query object
	 * @return {query}
	 * 
	 * @memberOf Context	
	 */
	queryPageSort(query) {
		if (this.params) {
			if (this.params.limit) {
				let limit = parseInt(this.params.limit);
				query.limit(limit);
			}

			if (this.params.offset) {
				let offset = parseInt(this.params.offset);
				query.skip(offset);
			}

			if (this.params.sort)
				query.sort(this.params.sort.replace(/,/, " "));
		}
		return query;
	}
}

module.exports = Context;
