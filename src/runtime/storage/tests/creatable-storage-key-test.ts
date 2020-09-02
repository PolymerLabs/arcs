/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/chai-web.js';
import {CreatableStorageKey} from '../creatable-storage-key.js';
import {Capabilities, Shareable, Queryable, Persistence} from '../../capabilities.js';

describe('Creatable storage key', async () => {
  it('parses without capabilities', () => {
    const sk = CreatableStorageKey.fromString('create://abc');
    assert.equal(sk.name, 'abc');
  });
  it('does not parse invalid string', () => {
    assert.throws(
      () => CreatableStorageKey.fromString('create://abc?'),
      /Not a valid CreatableStorageKey/
    );

    assert.throws(
      () => CreatableStorageKey.fromString('create://abc?TiedToRuntime'),
      /Not a valid CreatableStorageKey/
    );

    assert.throws(
      () => CreatableStorageKey.fromString('create:///abc?abc?abc@/woohoo'),
      /Not a valid CreatableStorageKey/
    );
  });
});
