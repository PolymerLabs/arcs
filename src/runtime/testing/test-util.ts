/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Arc} from '../arc.js';
import {CollectionType} from '../type.js';

/**
 * Helper class for testing a Collection-based store that collects messages from a particle.
 * This detects when too few or too many messages are sent in addition to matching the message
 * values, and can be used multiple times within the same unit test.
 *
 * Example usage:
 * ```
 *   [manifest]
 *     schema Result
 *       Text value
 *     particle P
 *       out [Result] res
 *
 *   [particle code]
 *     setHandles(handles) {
 *       this._resHandle = handles.get('res');
 *     }
 *     testFunction(arg) {
 *       await this._resHandle.store(new this._resHandle.entityClass({value: arg}));
 *     }
 *
 *   [test code]
 *     let {manifest, arc} = setUpManifestAndArc();
 *     let Result = manifest.findSchemaByName('Result').entityClass();
 *     let resStore = await arc.createStore(Result.type.collectionOf(), 'res');
 *     let recipe = setUpRecipeWithResHandleMapped(resStore);
 *
 *     let inspector = new util.ResultInspector(arc, resStore, 'value');
 *     await arc.instantiate(recipe);
 *     triggerParticleTestFunctionWith('one');
 *     triggerParticleTestFunctionWith('two');
 *     await inspector.verify('one', 'two');
 *
 *     triggerParticleTestFunctionWith('three');
 *     await inspector.verify('three');
 * ```
 */
export class ResultInspector {
  private readonly _arc: Arc;
  private readonly _store;
  private readonly _field;

  /**
   * @param arc the arc being tested; used to detect when all messages have been processed.
   * @param store a Collection-based store that should be connected as an output for the particle.
   * @param field the field within store's contained Entity type that this inspector should observe.
   */
  constructor(arc: Arc, store, field: string) {
    assert(store.type instanceof CollectionType, `ResultInspector given non-Collection store: ${store}`);
    this._arc = arc;
    this._store = store;
    this._field = field;
  }

  /**
   * Wait for the arc to be idle then verify that exactly the expected messages have been received.
   * This clears the contents of the observed store after each call, allowing repeated independent
   * checks in the same test. The order of expectations is not significant.
   */
  async verify(...expectations) {
    await this._arc.idle;
    const received = await this._store.toList();
    const misses = [];
    for (const item of received.map(r => r.rawData[this._field])) {
      const i = expectations.indexOf(item);
      if (i >= 0) {
        expectations.splice(i, 1);
      } else {
        misses.push(item);
      }
    }
    this._store.clearItemsForTesting();

    const errors: string[] = [];
    if (expectations.length) {
      errors.push(`Expected, not received: ${expectations.join(', ')}`);
    }
    if (misses.length) {
      errors.push(`Received, not expected: ${misses.join(', ')}`);
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

export async function assertSingletonWillChangeTo(arc: Arc, store, field: string, expectation): Promise<void> {
  await arc.idle;
  return assertSingletonIs(store, field, expectation);
}

export async function assertSingletonIs(store, field: string, expectation): Promise<void> {
  const actual = await store.get();
  assert.equal(actual !== null ? actual.rawData[field] : '(null)', expectation);
}

export async function assertThrowsAsync(fn: Function, msg?: string);
export async function assertThrowsAsync(fn: Function, errType: Function | RegExp, msg?: string);
export async function assertThrowsAsync(fn: Function, errType: RegExp, regExp: RegExp);

export async function assertThrowsAsync(fn: Function, ...args): Promise<void> {
  try {
    await fn();
    assert.throws(() => undefined, ...args);
  } catch (e) {
    assert.throws(() => {throw e;}, ...args);
  }
}
