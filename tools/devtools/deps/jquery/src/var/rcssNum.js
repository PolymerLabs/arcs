/// BareSpecifier=jquery\src\var\rcssNum
define(["../var/pnum"], function (pnum) {

	"use strict";

	return new RegExp("^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i");
});