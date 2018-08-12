"use strict";

let logger 		= require("../../core/logger");
let config 		= require("../../config");
let C 	 		= require("../../core/constants");

let _			= require("lodash");

let User 		= require("./models/user");

let Provider 		= require("../../models/provider");

module.exports = {
	settings: {
		name: "users",
		version: 1,
		namespace: "users",
		rest: true,
		collection: User,

		modelPropFilter: "id username email phone providers",

		modelPopulates: {
			"providers": "provider"
		}
	},
	
	actions: {
		find: {
			handler(ctx) {
				let filter = {};
				
				let query = User.find(filter);

				return ctx.queryPageSort(query).exec().then( (docs) => {
					return this.toJSON(docs);
				})
				.then((json) => {
					return this.populateModels(json);
				});
			}
		},


		// return my user with all properties
		get: {
			handler(ctx) {
				return User.findById(ctx.params.id).exec().then( (doc) => {

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

				let user = new User({
					username: ctx.params.username,
					email: ctx.params.email,
					phone: ctx.params.phone
				});

				return user.save()
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
				ctx.assertModelIsExist("UserNotFound");
				this.validateParams(ctx, true);

				return this.collection.findById(ctx.modelID).exec()
				.then((doc) => {
					console.log(doc)
					console.log(ctx.params.email)
					if (ctx.params.username != null)
						doc.username = ctx.params.username;
					if (ctx.params.email != null)
						doc.email = ctx.params.email;
					if (ctx.params.phone != null)
						doc.email = ctx.params.phone;
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
				ctx.assertModelIsExist("UresNotFound");

				return User.remove({ _id: ctx.modelID })
				.then(() => {
					return ctx.model;
				});		
			}
		},

		addProvider (ctx) {
			return Provider.findById(ctx.params.providerId).exec().
			then((providerDoc) => {

				if(!providerDoc){
					throw ctx.errorBadRequest(C.INVALID_ID, "ProviderNotFound");
				}

				return this.collection.findById(ctx.modelID).exec();
			})
			.then((doc) => {
				// Check user is on voters
				if (doc.providers.indexOf(ctx.params.id) !== -1) 
					throw ctx.errorBadRequest(C.ERR_ALREADY_EXIST, "YouHaveAlreadyThisProvider");
				return doc;
			})
			.then((doc) => {
				return User.findByIdAndUpdate(doc.id, { $addToSet: { providers: ctx.params.providerId }}, { "new": true });
			})
			.then((user) => {
				return this.toJSON(user);
			})
			.then((json) => {
				return this.populateModels(json);
			});
		},

		removeProvider(ctx) {
			ctx.assertModelIsExist("UserNotFound");

			return this.collection.findById(ctx.modelID).exec()
			.then((doc) => {
				// Check provider is in user providers
				if (doc.providers.indexOf(ctx.providerId) == -1) 
					throw ctx.errorBadRequest(C.INVALID_ID, "PostNotExist");
				return doc;
			})
			.then((doc) => {
				// Remove providrr from users providers
				return User.findByIdAndUpdate(doc.id, { $pull: { providers: ctx.params.providerId }}, { "new": true });
			})
			.then((doc) => {
				return this.toJSON(doc);
			})
			.then((json) => {
				return this.populateModels(json);
			});

		}


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
			if (strictMode || ctx.hasParam("username"))
				ctx.validateParam("username").trim().notEmpty("UserNameCannotBeEmpty").end();
			
			if (ctx.hasValidationErrors())
				throw ctx.errorBadRequest(C.ERR_VALIDATION_ERROR, ctx.validationErrors);			
		}

	},

	init(ctx) {
		// Fired when start the service
		this.userService = ctx.services("users");
	},

};