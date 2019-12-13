/// BareSpecifier=jquery\src\css\var\rboxStyle
define(["./cssExpand"], function (cssExpand) {
	"use strict";

	return new RegExp(cssExpand.join("|"), "i");
});