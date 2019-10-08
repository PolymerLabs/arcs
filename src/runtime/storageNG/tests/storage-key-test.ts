/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {StorageKeyParser} from '../storage-key-parser.js';
import {assert} from '../../../platform/chai-web.js';
import {VolatileStorageKey} from '../drivers/volatile.js';
import {FirebaseStorageKey} from '../drivers/firebase.js';
import {RamDiskStorageKey} from '../drivers/ramdisk.js';

describe('StorageKey', () => {

  it('can round-trip VolatileStorageKey', () => {
    const encoded = 'volatile://!1234:my-arc-id/first/second/';

    const key = StorageKeyParser.parse(encoded) as VolatileStorageKey;

    assert.instanceOf(key, VolatileStorageKey);
    assert.strictEqual(key.arcId.toString(), '!1234:my-arc-id');
    assert.strictEqual(key.unique, 'first/second/');
    assert.strictEqual(key.toString(), encoded);
  });

  it('can round-trip FirebaseStorageKey', () => {
    const encoded = 'firebase://my-project.test.domain:some-api-key/first/second/';

    const key = StorageKeyParser.parse(encoded) as FirebaseStorageKey;

    assert.instanceOf(key, FirebaseStorageKey);
    assert.strictEqual(key.databaseURL, 'my-project.test.domain');
    assert.strictEqual(key.domain, 'test.domain');
    assert.strictEqual(key.projectId, 'my-project');
    assert.strictEqual(key.apiKey, 'some-api-key');
    assert.strictEqual(key.location, 'first/second/');
    assert.strictEqual(key.toString(), encoded);
  });

  it('can round-trip RamDiskStorageKey', () => {
    const encoded = 'ramdisk://first/second/';

    const key = StorageKeyParser.parse(encoded) as RamDiskStorageKey;

    assert.instanceOf(key, RamDiskStorageKey);
    assert.strictEqual(key.unique, 'first/second/');
    assert.strictEqual(key.toString(), encoded);
  });
});
