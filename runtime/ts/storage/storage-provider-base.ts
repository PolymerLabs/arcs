// @
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../../platform/assert-web.js';
import {Tracing} from '../../../tracelib/trace.js';
import {Type} from '../type';
import {Id} from '../id.js';
import {KeyBase} from './key-base.js';

import {compareStrings, compareNumbers} from '../recipe/util.js';

enum EventKind {
  change = 'Change'
}
type Callback = ({}) => void;

export abstract class StorageBase {
  protected constructor(protected readonly arcId: Id) {
    assert(arcId !== undefined, 'Arcs with storage must have ids');
  }

  abstract construct(id: string, type: Type, keyFragment: string) : Promise<StorageProviderBase>;
  abstract connect(id: string, type: Type, key: string) : Promise<StorageProviderBase>;
  abstract baseStorageKey(type: Type, key: string) : string;
  abstract baseStorageFor(type: Type, key: string) : Promise<StorageProviderBase>;
  abstract parseStringAsKey(s: string) : KeyBase;

  // Provides graceful shutdown for tests.
  shutdown() {}
}

/**
 * Docs TBD
 */
export abstract class StorageProviderBase {
  private listeners: Map<EventKind, Map<Callback, {target: {}}>>;
  private nextLocalID: number;
  private readonly _type: Type;

  protected readonly _storageKey: string;
  referenceMode = false;
  
  version: number|null;
  id: string;
  originalId: string|null;
  name: string;
  source: string|null;
  description: string;

  protected constructor(type: Type, name, id, key) {
    assert(id, 'id must be provided when constructing StorageProviders');
    assert(!type.hasUnresolvedVariable, 'Storage types must be concrete');
    const trace = Tracing.start({cat: 'handle', name: 'StorageProviderBase::constructor', args: {type: type.toString(), name}});
    this._type = type;
    this.listeners = new Map();
    this.name = name;
    this.version = 0;
    this.id = id;
    this.source = null;
    this._storageKey = key;
    this.nextLocalID = 0;
    trace.end();
  }

  enableReferenceMode(): void {
    this.referenceMode = true;
  }

  get storageKey(): string {
    return this._storageKey;
  }

  generateID(): string {
    return `${this.id}:${this.nextLocalID++}`;
  }

  generateIDComponents() {
    return {base: this.id, component: () => this.nextLocalID++};
  }

  get type(): Type {
    return this._type;
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
  protected async _fire(kindStr: 'change', details: {}) {
    const kind: EventKind = EventKind[kindStr];

    const listenerMap = this.listeners.get(kind);
    if (!listenerMap || listenerMap.size === 0) {
      return;
    }

    const trace = Tracing.start({cat: 'handle', name: 'StorageProviderBase::_fire', args: {kind, type: this.type.tag,
        name: this.name, listeners: listenerMap.size}});

    const callbacks:Callback[] = [];
    for (const [callback] of listenerMap.entries()) {
      callbacks.push(callback);
    }
    // Yield so that event firing is not re-entrant with mutation.
    await trace.wait(0);
    for (const callback of callbacks) {
      callback(details);
    }
    trace.end();
  }

  _compareTo(other) : number {
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

  toString(handleTags: string[]): string {
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
  abstract toLiteral();

  abstract cloneFrom(store: StorageProviderBase);

  // TODO(shans): remove this when it's possible to.
  abstract ensureBackingStore();

  // tslint:disable-next-line: no-any
  abstract backingStore: any;

  /** TODO */
  modelForSynchronization() {
    return this.toLiteral();
  }
}
