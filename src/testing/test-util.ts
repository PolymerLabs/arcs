/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../platform/chai-web.js';

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
