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

import {assert} from './chai-web.js';
import handle from '../handle.js';

function assertSingletonWillChangeTo(view, entityClass, expectation) {
  return new Promise((resolve, reject) => {
    var variable = handle.handleFor(view);
    variable.entityClass = entityClass;
    variable.on('change', () => variable.get().then(result => {
      if (result == undefined)
        return;
      assert.equal(result.value, expectation);
      resolve();
    }), {});
  });
}

function assertSingletonIs(view, entityClass, expectation) {
  var variable = handle.handleFor(view);
  variable.entityClass = entityClass;
  return variable.get().then(result => {
    assert(result !== undefined);
    assert.equal(result.value, expectation);
  });
}

function assertViewWillChangeTo(setView, entityClass, field, expectations) {
  return new Promise((resolve, reject) => {
    var view = handle.handleFor(setView, true);
    view.entityClass = entityClass;
    view.on('change', () => view.toList().then(result => {
      if (result == undefined)
        return;
      if (result.length == expectations.length) {
          if (result.every(a => expectations.indexOf(a[field]) >= 0))
            resolve();
          else
            reject(new Error(`expected ${expectations} but got ${result.map(a => a[field])}`));
      }
    }), {});
  });
}

function assertViewHas(view, entityClass, field, expectations) {
  return new Promise((resolve, reject) => {
    view = handle.handleFor(view, true);
    view.entityClass = entityClass;
    view.toList().then(result => {
      assert.deepEqual(result.map(a => a[field]), expectations);
      resolve();
    });
  });
}

function assertSingletonEmpty(view) {
  return new Promise((resolve, reject) => {
    var variable = new handle.handleFor(view);
    variable.get().then(result => {
      assert.equal(result, undefined);
      resolve();
    });
  });
}

function initParticleSpec(name) {
  return {
    spec: {
      name,
    },
  };
}

export {
  assertSingletonWillChangeTo,
  assertSingletonIs,
  assertSingletonEmpty,
  assertViewWillChangeTo,
  assertViewHas,
  initParticleSpec,
};
