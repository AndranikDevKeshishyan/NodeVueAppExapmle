"use strict";

let logger 		= require("../../core/logger");
let config 		= require("../../config");
let C 	 		= require("../../core/constants");

let _			= require("lodash");

let Provider 		= require("./models/provider");

module.exports = {
	settings: {
		name: "providers",
		version: 1,
		namespace: "providers",
		rest: true,
		collection: Provider,

		modelPropFilter: "createdAt editedAt",
	},

	actions: {
		find: {
			handler(ctx) {
				let filter = {};

				let query = Provider.find(filter);

				return ctx.queryPageSort(query).exec().then( (docs) => {
					return this.toJSON(docs);
				})
				.then((json) => {
					return this.populateModels(json);
				});
			}
		},

		// return a model by ID
		get: {
			handler(ctx) {
				ctx.assertModelIsExist("ProviderNotFound");

				return Provider.findById(ctx.modelID).exec().then( (doc) => {
					return this.toJSON(doc);
				})
				.then((json) => {
					return this.populateModels(json);
				});
			}
		},

		create: {
			handler(ctx) {
				this.validateParams(ctx, true);

				let provider = new Provider({
					name: ctx.params.name
				});

				return provider.save()
				.then((doc) => {
					return this.toJSON(doc);
				})
				.then((json) => {
					return this.populateModels(json);
				});					
			}
		},

		update: {
			handler(ctx) {
				ctx.assertModelIsExist("ProvidertNotFound");
				this.validateParams(ctx);

				return this.collection.findById(ctx.modelID).exec()
				.then((doc) => {
					if (ctx.params.name != null)
						doc.name = ctx.params.name;
					return doc.save();
				})
				.then((doc) => {
					return this.toJSON(doc);
				})
				.then((json) => {
					return this.populateModels(json);
				});								
			}
		},

		remove: {
			handler(ctx) {
				ctx.assertModelIsExist("ProviderNotFound");

				return Provider.remove({ _id: ctx.modelID })
				.then(() => {
					return ctx.model;
				});		
			}
		},
	},

	methods: {
		/**
		 * Validate params of context.
		 * We will call it in `create` and `update` actions
		 * 
		 * @param {Context} ctx 			context of request
		 * @param {boolean} strictMode 		strictMode. If true, need to exists the required parameters
		 */
		validateParams(ctx, strictMode) {
			if (strictMode || ctx.hasParam("name"))
				ctx.validateParam("name").trim().notEmpty("ProviderNameCannotBeEmpty").end();
			
			if (ctx.hasValidationErrors())
				throw ctx.errorBadRequest(C.ERR_VALIDATION_ERROR, ctx.validationErrors);			
		}

	},

	init(ctx) {
		// Fired when start the service
		this.providerService = ctx.services("providers");
	},



};
