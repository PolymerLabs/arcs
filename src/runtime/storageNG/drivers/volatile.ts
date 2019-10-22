/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Driver, ReceiveMethod, StorageDriverProvider, Exists, DriverFactory} from './driver-factory.js';
import {StorageKey} from '../storage-key.js';
import {Arc} from '../../arc.js';
import {ArcId} from '../../id.js';

type VolatileEntry<Data> = {data: Data, version: number, drivers: VolatileDriver<Data>[]};

export class VolatileStorageKey extends StorageKey {
  readonly arcId: ArcId;
  readonly unique: string;

  constructor(arcId: ArcId, unique: string) {
    super('volatile');
    this.arcId = arcId;
    this.unique = unique;
  }

  toString() {
    return `${this.protocol}://${this.arcId}/${this.unique}`;
  }

  childWithComponent(component: string) {
    return new VolatileStorageKey(this.arcId, `${this.unique}/${component}`);
  }

  static fromString(key: string): VolatileStorageKey {
    const match = key.match(/^volatile:\/\/([^/]+)\/(.*)$/);
    if (!match) {
      throw new Error(`Not a valid VolatileStorageKey: ${key}.`);
    }
    const [_, arcId, unique] = match;
    return new VolatileStorageKey(ArcId.fromString(arcId), unique);
  }
}

export class VolatileMemory {
  entries = new Map<string, VolatileEntry<unknown>>();
  // Tokens can't just be an incrementing number as VolatileMemory is the basis for RamDiskMemory too;
  // if we were to use numbers here then a RamDisk could be reaped, restarted, and end up with the
  // same token as a previous iteration.
  // When we want to support RamDisk fast-forwarding (e.g. by keeping a rotating window of recent
  // operations) then we'll need tokens to be a combination of a per-instance random value and a
  // per-operation updating number. For now, just a random value that is updated with each write
  // is sufficient.
  token = Math.random() + '';
}

export class VolatileDriver<Data> extends Driver<Data> {
  private memory: VolatileMemory;
  private pendingVersion = 0;
  private pendingModel: Data | null = null;
  private receiver: ReceiveMethod<Data>;
  private data: VolatileEntry<Data>;

  constructor(storageKey: StorageKey, exists: Exists, memory: VolatileMemory) {
    super(storageKey, exists);
    const keyAsString = storageKey.toString();
    this.memory = memory;
    switch (exists) {
      case Exists.ShouldCreate:
        if (this.memory.entries.has(keyAsString)) {
          throw new Error(`requested creation of memory location ${storageKey} can't proceed as location already exists`);
        }
        this.data = {data: null, version: 0, drivers: []};
        this.memory.entries.set(keyAsString, this.data as VolatileEntry<unknown>);
        break;
      case Exists.ShouldExist:
        if (!this.memory.entries.has(keyAsString)) {
          throw new Error(`requested connection to memory location ${storageKey} can't proceed as location doesn't exist`);
        }
      /* falls through */
      case Exists.MayExist:
        {
          const data = this.memory.entries.get(keyAsString);
          if (data) {
            this.data = data as VolatileEntry<Data>;
            this.pendingModel = data.data as Data;
            this.pendingVersion = data.version;
          } else {
            this.data = {data: null, version: 0, drivers: []};
            this.memory.entries.set(keyAsString, this.data as VolatileEntry<unknown>);
            this.memory.token = Math.random() + '';
          }
          break;
        }
      default:
        throw new Error(`unknown Exists code ${exists}`);
    }
    this.data.drivers.push(this);
  }

  registerReceiver(receiver: ReceiveMethod<Data>, token?: string) {
    this.receiver = receiver;
    if (this.pendingModel && token !== this.memory.token) {
      receiver(this.pendingModel, this.pendingVersion);
    }
    this.pendingModel = null;
  }

  getToken() { return this.memory.token; }

  async send(model: Data, version: number): Promise<boolean> {
    // This needs to contain an "empty" await, otherwise there's
    // a synchronous send / onReceive loop that can be established
    // between multiple Stores/Drivers writing to the same location.
    await 0;
    if (this.data.version !== version - 1) {
      return false;
    }
    this.data.data = model;
    this.data.version += 1;
    this.data.drivers.forEach(driver => {
      if (driver === this) {
        return;
      }
      driver.receiver(model, this.data.version);
    });
    return true;
  }

  async write(key: StorageKey, value: Data): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async read(key: StorageKey): Promise<Data> {
    throw new Error('Method not implemented.');
  }
}

/**
 * Provides Volatile storage drivers. Volatile storage is local to an individual
 * running Arc. It lives for as long as that Arc instance, and then gets
 * deleted when the Arc is stopped.
 */
export class VolatileStorageDriverProvider implements StorageDriverProvider {
  private readonly arc: Arc;

  constructor(arc: Arc) {
    this.arc = arc;
  }

  willSupport(storageKey: StorageKey): boolean {
    return storageKey.protocol === 'volatile' && (storageKey as VolatileStorageKey).arcId.equal(this.arc.id);
  }

  async driver<Data>(storageKey: StorageKey, exists: Exists) {
    if (!this.willSupport(storageKey)) {
      throw new Error(`This provider does not support storageKey ${storageKey.toString()}`);
    }

    return new VolatileDriver<Data>(storageKey, exists, this.arc.volatileMemory);
  }

  static register(arc: Arc) {
    DriverFactory.register(new VolatileStorageDriverProvider(arc));
  }
}
