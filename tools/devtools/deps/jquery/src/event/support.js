/// BareSpecifier=jquery\src\event\support
define(["../var/support"], function (support) {

	"use strict";

	support.focusin = "onfocusin" in window;

	return support;
});