"use strict";

let logger 		= require("../../../core/logger");
let config 		= require("../../../config");
let C 	 		= require("../../../core/constants");

let _			= require("lodash");

let User 		= require("./models/user");

module.exports = {
	settings: {
		name: "users",
		version: 1,
		namespace: "users",
		rest: true,
		collection: User,

		modelPropFilter: "username"
	},
	
	actions: {
		// return all model
		/*find: {
			cache: true,
			handler(ctx) {
				return ctx.queryPageSort(User.find({})).exec().then( (docs) => {
					return this.toJSON(docs);
				})
				.then((json) => {
					return this.populateModels(json);					
				});
			}
		},*/

		// return a model by ID
		get: {
			handler(ctx) {
				ctx.assertModelIsExist("app:UserNotFound");
				return Promise.resolve(ctx.model);
			}
		}
	},

	methods: {
	}
};