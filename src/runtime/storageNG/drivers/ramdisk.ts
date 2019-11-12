/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {StorageKey} from '../storage-key.js';
import {Runtime} from '../../runtime.js';
import {StorageDriverProvider, Exists, DriverFactory} from './driver-factory.js';
import {VolatileDriver} from './volatile.js';

export class RamDiskStorageKey extends StorageKey {
  readonly unique: string;

  constructor(unique: string) {
    super('ramdisk');
    this.unique = unique;
  }

  toString() {
    return `${this.protocol}://${this.unique}`;
  }

  childWithComponent(component: string) {
    return new RamDiskStorageKey(`${this.unique}/${component}`);
  }

  static fromString(key: string): RamDiskStorageKey {
    const match = key.match(/^ramdisk:\/\/(.*)$/);
    if (!match) {
      throw new Error(`Not a valid RamDiskStorageKey: ${key}.`);
    }
    const unique = match[1];
    return new RamDiskStorageKey(unique);
  }
}

/**
 * Provides RamDisk storage drivers. RamDisk storage is shared amongst all Arcs,
 * and will persist for as long as the Arcs Runtime does.
 *
 * This works in the exact same way as Volatile storage, but the memory is not
 * tied to a specific running Arc.
 */
export class RamDiskStorageDriverProvider implements StorageDriverProvider {

  willSupport(storageKey: StorageKey): boolean {
    return storageKey.protocol === 'ramdisk';
  }

  async driver<Data>(storageKey: StorageKey, exists: Exists) {
    if (!this.willSupport(storageKey)) {
      throw new Error(`This provider does not support storageKey ${storageKey.toString()}`);
    }

    // Use a VolatileDriver backed by the Runtime's RamDisk memory instance.
    const memory = Runtime.getRuntime().getRamDiskMemory();
    return new VolatileDriver<Data>(storageKey as RamDiskStorageKey, exists, memory);
  }

  static register() {
    DriverFactory.register(new RamDiskStorageDriverProvider());
  }
}

// Note that this will automatically register for any production code
// that uses ramdisk drivers; but it won't automatically register in
// testing; for safety, call RamDiskStorageDriverProvider.register()
// from your test code somewhere.
RamDiskStorageDriverProvider.register();
