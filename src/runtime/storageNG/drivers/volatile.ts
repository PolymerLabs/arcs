/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {StorageDriverProvider, DriverFactory} from './driver-factory.js';
import {Driver, ReceiveMethod, Exists} from './driver.js';
import {StorageKey} from '../storage-key.js';
import {Arc} from '../../arc.js';
import {ArcId} from '../../id.js';
import {RamDiskStorageKey} from './ramdisk.js';
import {Dictionary} from '../../hot.js';
import {assert} from '../../../platform/assert-web.js';
import {StorageKeyParser} from '../storage-key-parser.js';
import {Capabilities} from '../../capabilities.js';
import {CapabilitiesResolver, StorageKeyOptions} from '../../capabilities-resolver.js';

type VolatileEntry<Data> = {data: Data, version: number, drivers: VolatileDriver<Data>[]};
type VolatileEntryCollection<Data> = {root: VolatileEntry<Data>, locations: Dictionary<VolatileEntry<Data>>};

export class VolatileStorageKey extends StorageKey {
  public static readonly protocol = 'volatile';
  readonly arcId: ArcId;
  readonly unique: string;
  readonly path: string;

  constructor(arcId: ArcId, unique: string, path: string='') {
    super(VolatileStorageKey.protocol);
    this.arcId = arcId;
    this.unique = unique;
    this.path = path;
  }

  toString() {
    return `${this.protocol}://${this.arcId}/${this.unique}@${this.path}`;
  }

  childWithComponent(component: string) {
    return new VolatileStorageKey(this.arcId, this.unique, `${this.path}/${component}`);
  }

  // Note that subKeys lose path information.
  subKeyWithComponent(component: string) {
    return new VolatileStorageKey(this.arcId, `${this.unique}/${component}`);
  }

  static fromString(key: string): VolatileStorageKey {
    const match = key.match(/^volatile:\/\/([^/]+)\/([^@]*)@(.*)$/);
    if (!match) {
      throw new Error(`Not a valid VolatileStorageKey: ${key}.`);
    }
    const [_, arcId, unique, path] = match;
    return new VolatileStorageKey(ArcId.fromString(arcId), unique, path);
  }
}

export class VolatileMemory {
  entries = new Map<string, VolatileEntryCollection<unknown>>();
  // Tokens can't just be an incrementing number as VolatileMemory is the basis for RamDiskMemory too;
  // if we were to use numbers here then a RamDisk could be reaped, restarted, and end up with the
  // same token as a previous iteration.
  // When we want to support RamDisk fast-forwarding (e.g. by keeping a rotating window of recent
  // operations) then we'll need tokens to be a combination of a per-instance random value and a
  // per-operation updating number. For now, just a random value that is updated with each write
  // is sufficient.
  token = Math.random() + '';

  deserialize(data, unique: string) {
    assert(!this.entries.has(unique));
    const entry: VolatileEntryCollection<unknown> = {root: null, locations: {}};
    entry.root = {data: data.root, version: 0, drivers: []};
    if (data.locations) {
      for (const [key, value] of Object.entries(data.locations)) {
        entry.locations[key] = {data: value, version: 0, drivers: []};
      }
    }
    this.entries.set(unique, entry);
  }
}

/**
 * Allows for loosely coupled memory provisioning by clients of the storage
 * stack.
 */
export interface VolatileMemoryProvider {
  getVolatileMemory(): VolatileMemory;
}

export class SimpleVolatileMemoryProvider implements VolatileMemoryProvider {
  private readonly memory: VolatileMemory = new VolatileMemory();

  getVolatileMemory(): VolatileMemory {
    return this.memory;
  }
}

let id = 0;

export class VolatileDriver<Data> extends Driver<Data> {
  private memory: VolatileMemory;
  private pendingVersion = 0;
  private pendingModel: Data | null = null;
  private receiver: ReceiveMethod<Data>;
  private data: VolatileEntryCollection<Data>;
  private id: number;
  private path: string;

  constructor(storageKey: VolatileStorageKey | RamDiskStorageKey, exists: Exists, memory: VolatileMemory) {
    super(storageKey, exists);
    this.id = id++;
    this.memory = memory;
    this.path = null;
    if (storageKey instanceof VolatileStorageKey && storageKey.path !== '') {
      this.path = storageKey.path;
    }
    switch (exists) {
      case Exists.ShouldCreate:
        if (this.memory.entries.has(storageKey.unique)) {
          throw new Error(`requested creation of memory location ${storageKey} can't proceed as location already exists`);
        }
        this.data = {root: null, locations: {}};
        this.memory.entries.set(storageKey.unique, this.data as VolatileEntryCollection<unknown>);
        break;
      case Exists.ShouldExist:
        if (!this.memory.entries.has(storageKey.unique)) {
          throw new Error(`requested connection to memory location ${storageKey} can't proceed as location doesn't exist`);
        }
      /* falls through */
      case Exists.MayExist:
        {
          const data = this.memory.entries.get(storageKey.unique);
          if (data) {
            this.data = data as VolatileEntryCollection<Data>;
            this.pendingModel = this.localData();
            this.pendingVersion = this.localVersion();
          } else {
            this.data = {locations: {}, root: null};
            this.memory.entries.set(storageKey.unique, this.data as VolatileEntryCollection<unknown>);
            this.memory.token = Math.random() + '';
          }
          break;
        }
      default:
        throw new Error(`unknown Exists code ${exists}`);
    }
    this.pushLocalDriver(this);
  }

  private getOrCreateEntry() {
    if (this.path) {
      if (!this.data.locations[this.path]) {
        this.data.locations[this.path] = {data: null, version: 0, drivers: []};
      }
      return this.data.locations[this.path];
    }
    if (!this.data.root) {
      this.data.root = {data: null, version: 0, drivers: []};
    }
    return this.data.root;
  }

  private localData() {
    return this.getOrCreateEntry().data;
  }

  private localVersion() {
    return this.getOrCreateEntry().version;
  }

  private setLocalData(data: Data) {
    this.getOrCreateEntry().data = data;
  }

  private incrementLocalVersion() {
    this.getOrCreateEntry().version += 1;
  }

  private pushLocalDriver(driver: VolatileDriver<Data>) {
    this.getOrCreateEntry().drivers.push(driver);
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
    if (this.localVersion() !== version - 1) {
      return false;
    }
    this.setLocalData(model);
    this.incrementLocalVersion();
    this.getOrCreateEntry().drivers.forEach(driver => {
      if (driver === this) {
        return;
      }
      if (driver.receiver) {
        driver.receiver(model, this.localVersion());
      }
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
    return storageKey.protocol === VolatileStorageKey.protocol
        && (storageKey as VolatileStorageKey).arcId.equal(this.arc.id);
  }

  async driver<Data>(storageKey: StorageKey, exists: Exists) {
    if (!this.willSupport(storageKey)) {
      throw new Error(`This provider does not support storageKey ${storageKey.toString()}`);
    }

    return new VolatileDriver<Data>(storageKey as VolatileStorageKey, exists, this.arc.volatileMemory);
  }

  // QUESTION: This method is never being called, is it needed?
  static register(arc: Arc) {
    DriverFactory.register(new VolatileStorageDriverProvider(arc));
  }
}

StorageKeyParser.addDefaultParser(VolatileStorageKey.protocol, VolatileStorageKey.fromString);
CapabilitiesResolver.registerDefaultKeyCreator(
    VolatileStorageKey.protocol,
    Capabilities.tiedToArc,
    (options: StorageKeyOptions) => new VolatileStorageKey(options.arcId, options.unique(), ''));
CapabilitiesResolver.registerDefaultKeyCreator(
    VolatileStorageKey.protocol,
    Capabilities.empty,
    (options: StorageKeyOptions) => new VolatileStorageKey(options.arcId, options.unique(), ''));
