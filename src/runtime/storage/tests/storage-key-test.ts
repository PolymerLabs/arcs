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
import {FirebaseStorageKey, FirebaseStorageDriverProvider} from '../drivers/firebase.js';
import {RamDiskStorageKey, RamDiskStorageDriverProvider} from '../drivers/ramdisk.js';
import {ReferenceModeStorageKey} from '../reference-mode-storage-key.js';
import {DriverFactory} from '../drivers/driver-factory.js';
import {Runtime} from '../../runtime.js';
import {mockFirebaseStorageKeyOptions} from '../testing/mock-firebase.js';

describe('StorageKey', () => {

  beforeEach(() => {
    const runtime = Runtime.getRuntime();
    RamDiskStorageDriverProvider.register(runtime.getMemoryProvider());
    FirebaseStorageDriverProvider.register(runtime.getCacheService(), mockFirebaseStorageKeyOptions);
  });

  afterEach(() => {
    DriverFactory.clearRegistrationsForTesting();
  });

  it('can round-trip VolatileStorageKey', () => {
    const encoded = 'volatile://!1234:my-arc-id/first/second/@';

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

  it('can round-trip ReferenceModeStorageKey', () => {
    const encoded = 'reference-mode://{firebase://my-project.test.domain:some-api-key/first/second/}{volatile://!1234:my-arc-id/first/second/@}';

    const key = StorageKeyParser.parse(encoded) as ReferenceModeStorageKey;

    assert.instanceOf(key, ReferenceModeStorageKey);
    assert.instanceOf(key.storageKey, VolatileStorageKey);
    assert.instanceOf(key.backingKey, FirebaseStorageKey);
    assert.strictEqual((key.storageKey as VolatileStorageKey).arcId.toString(), '!1234:my-arc-id');
    assert.strictEqual((key.storageKey as VolatileStorageKey).unique, 'first/second/');
    assert.strictEqual((key.backingKey as FirebaseStorageKey).databaseURL, 'my-project.test.domain');
    assert.strictEqual((key.backingKey as FirebaseStorageKey).domain, 'test.domain');
    assert.strictEqual((key.backingKey as FirebaseStorageKey).projectId, 'my-project');
    assert.strictEqual((key.backingKey as FirebaseStorageKey).apiKey, 'some-api-key');
    assert.strictEqual((key.backingKey as FirebaseStorageKey).location, 'first/second/');
    assert.strictEqual(key.toString(), encoded);
  });
});
