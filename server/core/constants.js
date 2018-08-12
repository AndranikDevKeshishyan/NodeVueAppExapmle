"use strict";

let C = {};

C.append = function(items, prefix) {
	items.forEach((item) => {
		let name = item.toUpperCase();
		if (prefix)
			name = prefix + "_" + name;
		C[name] = item;
	});
};


/**
 * Response error reasons
 */
C.append([
	"VALIDATION_ERROR",
	"INVALID_ID",
	"MODEL_NOT_FOUND",,
	"ALREADY_EXIST"
], "ERR");


module.exports = C;
