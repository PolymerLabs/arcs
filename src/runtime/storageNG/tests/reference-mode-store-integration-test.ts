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
import {RamDiskStorageKey, RamDiskStorageDriverProvider} from '../drivers/ramdisk.js';
import {DriverFactory} from '../drivers/driver-factory.js';
import {Runtime} from '../../runtime.js';
import {EntityType} from '../../type.js';
import { ReferenceModeStorageKey } from '../reference-mode-storage-key.js';
import { newHandle } from '../storage-ng.js';
import { Schema } from '../../schema.js';
import { Particle } from '../../particle.js';

describe('ReferenceModeStore Integration', async () => {

  afterEach(() => {
    DriverFactory.clearRegistrationsForTesting();
  });

  it('will store and retrieve entities through referenceModeStores', async () => {
    const runtime = new Runtime();
    RamDiskStorageDriverProvider.register(runtime.getMemoryProvider());
    const storageKey = new ReferenceModeStorageKey(new RamDiskStorageKey('backing'), new RamDiskStorageKey('container'));
    const arc = Runtime.newForNodeTesting().newArc("testArc");

    const type = new EntityType(new Schema(["AnEntity"], {foo: "Text"})).collectionOf();

    // Use newHandle here rather than setting up a store inside the arc, as this ensures writeHandle and readHandle
    // are on top of different storage stacks.
    const writeHandle = await newHandle(type, storageKey, arc, {id: 'write-handle'});
    const readHandle = await newHandle(type, storageKey, arc, {id: 'read-handle'});


    readHandle.particle = new Particle();
    return new Promise(async (resolve, reject) => {

      let state = 0;

      readHandle.particle['onHandleSync'] = async (handle, model) => {
        if (state == 0) {
          assert.deepEqual(model, []);
          state = 1;
        } else {
          assert.equal(model.length, 1);
          assert.equal(model[0].foo, 'This is text in foo');
          resolve();
        }
      }

      await writeHandle.addFromData({foo: "This is text in foo"});
    });
  });
});