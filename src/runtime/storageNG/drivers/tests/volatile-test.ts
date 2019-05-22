/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../../platform/chai-web.js';
import {VolatileDriver, VolatileStorageKey} from '../volatile.js';
import {Exists} from '../driver-factory.js';
import {Runtime} from '../../../runtime.js';

describe('Volatile Driver', async () => {

  afterEach(() => {
    Runtime.clearRuntimeForTesting();
  })

  it('can be multiply instantiated against the same storage location', () => {
    const volatileKey = new VolatileStorageKey('unique');
    const volatile1 = new VolatileDriver(volatileKey, Exists.ShouldCreate);
    const volatile2 = new VolatileDriver(volatileKey, Exists.ShouldExist);
  });

  it(`can't be instantiated as ShouldExist if the storage location doesn't yet exist`, () => {
    const volatileKey = new VolatileStorageKey('unique');
    assert.throws(() => new VolatileDriver(volatileKey, Exists.ShouldExist), `location doesn't exist`);
  });

  it(`can't be instantiated as ShouldCreate if the storage location already exists`, () => {
    const volatileKey = new VolatileStorageKey('unique');
    const volatile1 = new VolatileDriver(volatileKey, Exists.ShouldCreate);
    assert.throws(() => new VolatileDriver(volatileKey, Exists.ShouldCreate), 'location already exists');
  });

  it('can be instantiated either as a creation or as a connection using MayExist', () => {
    const volatileKey = new VolatileStorageKey('unique');
    const volatile1 = new VolatileDriver(volatileKey, Exists.MayExist);
    const volatile2 = new VolatileDriver(volatileKey, Exists.MayExist);
  });
});
