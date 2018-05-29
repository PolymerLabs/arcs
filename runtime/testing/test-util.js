/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

 'use strict';

import {assert} from '../test/chai-web.js';
import {handleFor} from '../handle.js';
import {Scheduler} from '../scheduler.js';
import {Schema} from '../schema.js';

const scheduler = new Scheduler();

// Helper class for testing a Collection-based handle that collects messages from a particle.
// This detects when too few or too many messages are sent in addition to matching the message
// values, and can be used multiple times within the same unit test.
//
// Example usage:
//   [manifest]
//     schema Result
//       Text value
//     particle P
//       out [Result] res
//
//   [particle code]
//     setHandles(handles) {
//       this._resHandle = handles.get('res');
//     }
//     testFunction(arg) {
//       await this._resHandle.store(new this._resHandle.entityClass({value: arg}));
//     }
//
//   [test code]
//     let {manifest, arc} = setUpManifestAndArc();
//     let Result = manifest.findSchemaByName('Result').entityClass();
//     let resStore = await arc.createStore(Result.type.collectionOf(), 'res');
//     let recipe = setUpRecipeWithResHandleMapped(resStore);
//
//     let inspector = new util.ResultInspector(arc, resStore, 'value');
//     await arc.instantiate(recipe);
//     triggerParticleTestFunctionWith('one');
//     triggerParticleTestFunctionWith('two');
//     await inspector.verify('one', 'two');
//
//     triggerParticleTestFunctionWith('three');
//     await inspector.verify('three');
export class ResultInspector {
  // arc: the arc being tested; used to detect when all messages have been processed
  // handle: a Collection-based handle that should be connected as an output for the particle
  // field: the field within handle's contained Entity type that this inspector should observe
  constructor(arc, handle, field) {
    assert(handle.type.isCollection, `ResultInspector given non-Collection handle: ${handle}`);
    this._arc = arc;
    this._handle = handle;
    this._field = field;
  }

  // Wait for the arc to be idle then verify that exactly the expected messages have been received.
  // This clears the contents of the observed handle after each call, allowing repeated independent
  // checks in the same test. The order of expectations is not significant.
  async verify(...expectations) {
    await this._arc.idle;
    let received = await this._handle.toList();
    let misses = [];
    for (let item of received.map(r => r.rawData[this._field])) {
      let i = expectations.indexOf(item);
      if (i >= 0) {
        expectations.splice(i, 1);
      } else {
        misses.push(item);
      }
    }
    this._handle.clearItemsForTesting();

    let errors = [];
    if (expectations.length) {
      errors.push(`Expected, not received: ${expectations.join(' ')}`);
    }
    if (misses.length) {
      errors.push(`Received, not expected: ${misses.join(' ')}`);
    }

    return new Promise((resolve, reject) => {
      if (errors.length === 0) {
        resolve();
      } else {
        reject(new Error(errors.join(' | ')));
      }
    });
  }
}

export function assertSingletonWillChangeTo(store, entityClass, expectation) {
  return new Promise((resolve, reject) => {
    let variable = handleFor(store);
    variable.entityClass = entityClass;
    variable.on('change', () => variable.get().then(result => {
      if (result == undefined)
        return;
      assert.equal(result.value, expectation);
      resolve();
    }), {_scheduler: scheduler});
  });
}

export function assertSingletonIs(store, entityClass, expectation) {
  let variable = handleFor(store);
  variable.entityClass = entityClass;
  return variable.get().then(result => {
    assert(result !== undefined);
    assert.equal(result.value, expectation);
  });
}

export function assertCollectionWillChangeTo(collection, entityClass, field, expectations) {
  return new Promise((resolve, reject) => {
    let handle = handleFor(collection, true);
    handle.entityClass = entityClass;
    handle.on('change', () => handle.toList().then(result => {
      if (result == undefined)
        return;
      if (result.length == expectations.length) {
          if (result.every(a => expectations.indexOf(a[field]) >= 0))
            resolve();
          else
            reject(new Error(`expected ${expectations} but got ${result.map(a => a[field])}`));
      }
    }), {_scheduler: scheduler});
  });
}

export function assertHandleHas(store, entityClass, field, expectations) {
  return new Promise((resolve, reject) => {
    handle = handleFor(store, true);
    handle.entityClass = entityClass;
    handle.toList().then(result => {
      assert.deepEqual(result.map(a => a[field]), expectations);
      resolve();
    });
  });
}

export function assertSingletonEmpty(store) {
  return new Promise((resolve, reject) => {
    let variable = new handle.handleFor(store);
    variable.get().then(result => {
      assert.equal(result, undefined);
      resolve();
    });
  });
}

export function initParticleSpec(name) {
  return {
    spec: {
      name,
    },
  };
}

export function testEntityClass(type) {
  return new Schema({
    names: [type],
    fields: {
      id: 'Number',
      value: 'Text',
    },
  }).entityClass();
}
