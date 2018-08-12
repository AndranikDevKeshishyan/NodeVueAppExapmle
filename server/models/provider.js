"use strict";

// let ROOT 			= "../../../../";
let config    		= require("../config");
let logger    		= require("../core/logger");
let C 				= require("../core/constants");

let _ 				= require("lodash");

let db	    		= require("../core/mongo");
let mongoose 		= require("mongoose");
let Schema 			= mongoose.Schema;

let autoIncrement 	= require("mongoose-auto-increment");

let schemaOptions = {
	timestamps: true,
	toObject: {
		virtuals: true
	},
	toJSON: {
		virtuals: true
	}
};

let ProviderSchema = new Schema({
	name: {
		type: String,
		trim: true
	}

}, schemaOptions);


ProviderSchema.plugin(autoIncrement.plugin, {
	model: "provider",
	startAt: 1
});

let Provider = mongoose.model("provider", ProviderSchema);

module.exports = Provider;
