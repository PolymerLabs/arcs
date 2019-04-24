// @
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../platform/assert-web.js';
import {Id} from '../id.js';
import {Comparable, compareNumbers, compareStrings} from '../recipe/comparable.js';
import {Type} from '../type.js';
import {StorageStub} from '../manifest.js';
import {ModelValue, SerializedModelEntry} from './crdt-collection-model.js';
import {KeyBase} from './key-base.js';
import {BigCollectionStore, CollectionStore, Store, VariableStore} from '../store.js';
import {PropagatedException} from '../arc-exceptions.js';


enum EventKind {
  change = 'Change'
}

// tslint:disable-next-line: no-any
type Callback = (v: {[index: string]: any}) => void;

/**
 * Methods that must be implemented by a Variable Storage Provider
 * that are not already defined in VariableStore.
 */
export interface VariableStorageProvider extends StorageProviderBase, VariableStore {
  set(value: {}, originatorId?: string, barrier?: string): Promise<void>;
  clear(originatorId?: string, barrier?: string): Promise<void>;
}

/**
 * Methods that must be implemented by a Collection Storage Provider,
 * that are not already defined in CollectionStore.
 */
export interface CollectionStorageProvider extends StorageProviderBase, CollectionStore {
  // tslint:disable-next-line: no-any
  getMultiple(ids: string[]): Promise<any[]>;
  store(value, keys: string[], originatorId?: string): Promise<void>;
  storeMultiple(values: {}, keys: string[], originatorId?: string): Promise<void>;
  // tslint:disable-next-line: no-any
  removeMultiple(items: any[], originatorId?: string) : Promise<void>;
}

/**
 * Methods that must be implemented by a BigCollection Storage Provider,
 * that are not already defined in BigCollectionStore.
 */
export interface BigCollectionStorageProvider extends StorageProviderBase, BigCollectionStore {
  cursorVersion(cursorId: number);
  cloneFrom(store: StorageProviderBase | StorageStub);
  clearItemsForTesting(): void;
}

export abstract class StorageBase {
  protected _debug = false;

  protected constructor(protected readonly arcId: Id) {
    assert(arcId !== undefined, 'Arcs with storage must have ids');
  }

  abstract construct(id: string, type: Type, keyFragment: string) : Promise<StorageProviderBase>;
  abstract connect(id: string, type: Type, key: string) : Promise<StorageProviderBase>;
  abstract baseStorageKey(type: Type, key: string) : string;
  abstract baseStorageFor(type: Type, key: string) : Promise<StorageProviderBase>;
  abstract parseStringAsKey(s: string) : KeyBase;


  /**
   * Turn on debugginf for this storage provider.  Providers should
   * subclass this and react to changes in the debug value.
   */
  public set debug(d: boolean) {
    this._debug = d;
  }

  /**
   * Provides graceful shutdown for tests.
   */
  async shutdown(): Promise<void> {}
}

// tslint:disable-next-line: no-any
type DeltaItems = {value: any, keys?: string[], effective?: boolean}[];

export class ChangeEvent {
  public readonly add: DeltaItems;
  public readonly remove: DeltaItems;
  // tslint:disable-next-line: no-any
  public readonly data: any;
  public readonly version: number;
  public readonly originatorId: string;
  public readonly barrier: string;

  constructor(args: {add?: DeltaItems, remove?: DeltaItems, data?, version?: number, originatorId?: string, barrier?: string}) {
    Object.assign(this, args);
  }
}

/**
 * Docs TBD
 */
export abstract class StorageProviderBase implements Comparable<StorageProviderBase>, Store {
  private listeners: Map<EventKind, Map<Callback, {target: {}}>>;
  private nextLocalID: number;
  private readonly _type: Type;

  protected readonly _storageKey: string;
  referenceMode = false;

  version: number|null;
  readonly id: string;
  originalId: string|null;
  name: string;
  source: string|null;
  description: string;

  protected constructor(type: Type, name: string, id: string, key: string) {
    assert(id, 'id must be provided when constructing StorageProviders');
    assert(!type.hasUnresolvedVariable, 'Storage types must be concrete');
    this._type = type;
    this.listeners = new Map();
    this.name = name;
    this.version = 0;
    this.id = id;
    this.source = null;
    this._storageKey = key;
    this.nextLocalID = 0;
  }

  enableReferenceMode(): void {
    this.referenceMode = true;
  }

  get storageKey(): string {
    return this._storageKey;
  }

  get type(): Type {
    return this._type;
  }

  reportExceptionInHost(exception: PropagatedException) {
    // This class lives in the host, so it's safe to just rethrow the exception here.
    throw exception;
  }

  // TODO: add 'once' which returns a promise.
  on(kindStr: string, callback: Callback, target): void {
    assert(target !== undefined, 'must provide a target to register a storage event handler');
    const kind: EventKind = EventKind[kindStr];

    const listeners = this.listeners.get(kind) || new Map();
    listeners.set(callback, {target});
    this.listeners.set(kind, listeners);
  }

  off(kindStr: string, callback: Callback): void {
    const kind: EventKind = EventKind[kindStr];
    const listeners = this.listeners.get(kind);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  // TODO: rename to _fireAsync so it's clear that callers are not re-entrant.
  /**
   * Propagate updates to change listeners.
   *
   * @param kindStr the type of event, only 'change' is supported.
   * @param details details about the change
   */
  protected async _fire(kindStr: 'change', details: ChangeEvent) {
    const kind: EventKind = EventKind[kindStr];

    const listenerMap = this.listeners.get(kind);
    if (!listenerMap || listenerMap.size === 0) {
      return;
    }

    const callbacks:Callback[] = [];
    for (const [callback] of listenerMap.entries()) {
      callbacks.push(callback);
    }
    // Yield so that event firing is not re-entrant with mutation.
    await 0;
    for (const callback of callbacks) {
      callback(details);
    }
  }

  _compareTo(other: StorageProviderBase): number {
    let cmp;
    cmp = compareStrings(this.name, other.name);
    if (cmp !== 0) return cmp;
    cmp = compareNumbers(this.version, other.version);
    if (cmp !== 0) return cmp;
    cmp = compareStrings(this.source, other.source);
    if (cmp !== 0) return cmp;
    cmp = compareStrings(this.id, other.id);
    if (cmp !== 0) return cmp;
    return 0;
  }

  toString(handleTags?: string[]): string {
    const results: string[] = [];
    const handleStr: string[] = [];
    handleStr.push(`store`);
    if (this.name) {
      handleStr.push(`${this.name}`);
    }
    handleStr.push(`of ${this.type.toString()}`);
    if (this.id) {
      handleStr.push(`'${this.id}'`);
    }
    if (handleTags && handleTags.length) {
      handleStr.push(`${handleTags.join(' ')}`);
    }
    if (this.source) {
      handleStr.push(`in '${this.source}'`);
    }
    results.push(handleStr.join(' '));
    if (this.description) {
      results.push(`  description \`${this.description}\``);
    }
    return results.join('\n');
  }

  get apiChannelMappingId() {
    return this.id;
  }

  // TODO: make abstract?
  dispose() {}

  /**
   * @returns an object notation of this storage provider.
   */
  abstract async toLiteral(): Promise<{version: number, model: SerializedModelEntry[]}>;

  abstract cloneFrom(store: StorageProviderBase | StorageStub);

  // TODO(shans): remove this when it's possible to.
  abstract async ensureBackingStore();

  // tslint:disable-next-line: no-any
  abstract backingStore: any;

  /**
   * Called by Particle Execution Host to synchronize it's proxy.
   */
  async modelForSynchronization(): Promise<{version: number, model: {}}> {
    return this.toLiteral();
  }
}
