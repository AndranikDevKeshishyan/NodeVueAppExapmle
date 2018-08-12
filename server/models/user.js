"use strict";

let config    		= require("../config");
let logger    		= require("../core/logger");
let C 				= require("../core/constants");
let fs 				= require("fs");
let path 			= require("path");

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

let validateProperty = function(property) {
	return (property.length);
};

let UserSchema = new Schema({
	email: {
		type: String,
		trim: true,
		unique: true,
		index: true,
		lowercase: true,
		"default": "",
		validate: [validateProperty, "Please fill in your email"],
		// match: [/.+\@.+\..+/, "Please fill a valid email address"]
	},
	username: {
		type: String,
		unique: true,
		index: true,
		lowercase: true,
		required: "Please fill in a username",
		//trim: true
		//match: [ , "Please fill a valid username"]
	},
	phone: {
		type: Number,
		unique: true,
		lowercase: true
		//match: [ , "Please fill a valid phone number"]
	},
	providers: [{
		type: Array,
		ref: "user"
	}],
}, schemaOptions);

/**
 * Auto increment for `_id`
 */
UserSchema.plugin(autoIncrement.plugin, {
	model: "user",
	startAt: 1
});

let User = mongoose.model("user", UserSchema);

module.exports = User;
