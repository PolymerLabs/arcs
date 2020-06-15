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
    assert.isTrue(sk.capabilities.isEmpty());
  });
  it('parses without capabilities and extra separator', () => {
    const sk = CreatableStorageKey.fromString('create://abc?');
    assert.equal(sk.name, 'abc');
    assert.isTrue(sk.capabilities.isEmpty());
  });
  it('parses with a single capability', () => {
    const sk = CreatableStorageKey.fromString('create://abc?TiedToRuntime');
    assert.equal(sk.name, 'abc');
    assert.isTrue(sk.capabilities.hasEquivalent(new Shareable(true)));
    assert.isFalse(sk.capabilities.hasEquivalent(new Shareable(false)));
    assert.isFalse(sk.capabilities.hasEquivalent(Persistence.onDisk()));
    assert.isFalse(sk.capabilities.hasEquivalent(new Queryable(true)));
  });
  it('parses with multiple capabilities', () => {
    const sk = CreatableStorageKey.fromString('create://abc?Persistent,Queryable');
    assert.equal(sk.name, 'abc');
    assert.isFalse(sk.capabilities.hasEquivalent(new Shareable(false)));
    assert.isFalse(sk.capabilities.hasEquivalent(new Shareable(true)));
    assert.isTrue(sk.capabilities.hasEquivalent(Persistence.onDisk()));
    assert.isTrue(sk.capabilities.hasEquivalent(new Queryable(true)));
  });
  it('does not parse invalid string', () => {
    assert.throws(
      () => CreatableStorageKey.fromString('create:///abc?abc?abc@/woohoo'),
      /Not a valid CreatableStorageKey/
    );
  });
  it('complains about unknown capability', () => {
    assert.throws(
      () => CreatableStorageKey.fromString('create://abc?Pertinent'),
      /Capability not recognized: Pertinent./
    );
  });
  it('serializes to string with empty capabilities', () => {
    assert.equal(
      new CreatableStorageKey('my-handle-id').toString(),
      'create://my-handle-id'
    );
  });
  it('serializes to string with one capability', () => {
    assert.equal(
      new CreatableStorageKey('my-handle-id', Capabilities.create([new Shareable(false)])).toString(),
      'create://my-handle-id?TiedToArc'
    );
  });
  it('serializes to string with multiple capabilities', () => {
    assert.equal(
      new CreatableStorageKey('my-handle-id', Capabilities.create([new Queryable(true), new Shareable(true)])).toString(),
      'create://my-handle-id?TiedToRuntime,Queryable'
    );
  });
});
