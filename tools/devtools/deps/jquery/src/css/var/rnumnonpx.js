/// BareSpecifier=jquery\src\css\var\rnumnonpx
define(["../../var/pnum"], function (pnum) {
	"use strict";

	return new RegExp("^(" + pnum + ")(?!px)[a-z%]+$", "i");
});