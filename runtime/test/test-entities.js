/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
 "use strict";

var runtime = require("../runtime.js");

exports.Foo = runtime.testing.testEntityClass('Foo');
exports.Bar = runtime.testing.testEntityClass('Bar');
exports.Far = runtime.testing.testEntityClass('Far');

exports.register = scope => [exports.Foo, exports.Bar, exports.Far].map(a => scope.registerEntityClass(a));