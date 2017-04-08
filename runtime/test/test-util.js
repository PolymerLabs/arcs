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

let assert = require('chai').assert;
let viewlet = require('../viewlet.js');

function assertSingletonHas(view, expectation) {
  return new Promise((resolve, reject) => {
    var variable = viewlet.viewletFor(view);
    variable.on('change', () => variable.get().then(result => {
      if (result == undefined)
        return;
      assert.equal(result.data, expectation);
      resolve();
    }), {});
  });
}

function assertSingletonEmpty(view) {
  return new Promise((resolve, reject) => {
    var variable = new viewlet.viewletFor(view);
    variable.get().then(result => {
      assert.equal(result, undefined);
      resolve();
    });
  });
}

function logDebug(particleName, paramType, paramName, view) {
  view.debugString().then(v => console.log(`[${particleName}][${paramType}][${paramName}]:`, v));
}

exports.assertSingletonHas = assertSingletonHas;
exports.assertSingletonEmpty = assertSingletonEmpty;
exports.logDebug = logDebug;
