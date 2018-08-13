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
import * as util from '../../recipe/util.js';

enum EventKind {'change'}
type Callback = () => any;

export class StorageProviderBase {
  private listeners: Map<EventKind, Map<Callback, {target: {}}>>;
  private _storageKey: string;
  private nextLocalID: number;
  private _type: Type;

  protected version: number;
  
  id: string;
  name: string;
  source: any;
  description: string;

  constructor(type, name, id, key) {
    assert(id, 'id must be provided when constructing StorageProviders');
    assert(!type.hasUnresolvedVariable, 'Storage types must be concrete');
    const trace = Tracing.start({cat: 'handle', name: 'StorageProviderBase::constructor', args: {type: type.key, name}});
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

  get storageKey() {
    return this._storageKey;
  }

  generateID() {
    return `${this.id}:${this.nextLocalID++}`;
  }

  generateIDComponents() {
    return {base: this.id, component: () => this.nextLocalID++};
  }

  get type() {
    return this._type;
  }
  // TODO: add 'once' which returns a promise.
  on(kind, callback, target) {
    assert(target !== undefined, 'must provide a target to register a storage event handler');
    const listeners = this.listeners.get(kind) || new Map();
    listeners.set(callback, {target});
    this.listeners.set(kind, listeners);
  }

  // TODO: rename to _fireAsync so it's clear that callers are not re-entrant.
  async _fire(kind, details) {
    const listenerMap = this.listeners.get(kind);
    if (!listenerMap || listenerMap.size == 0) {
      return;
    }

    const trace = Tracing.start({cat: 'handle', name: 'StorageProviderBase::_fire', args: {kind, type: this.type.tag,
        name: this.name, listeners: listenerMap.size}});

    const callbacks = [];
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

  _compareTo(other) {
    let cmp;
    if ((cmp = util.compareStrings(this.name, other.name)) != 0) return cmp;
    if ((cmp = util.compareNumbers(this.version, other.version)) != 0) return cmp;
    if ((cmp = util.compareStrings(this.source, other.source)) != 0) return cmp;
    if ((cmp = util.compareStrings(this.id, other.id)) != 0) return cmp;
    return 0;
  }

  toString(handleTags) {
    const results = [];
    const handleStr = [];
    handleStr.push(`store`);
    if (this.name) {
      handleStr.push(`${this.name}`);
    }
    handleStr.push(`of ${this.type.toString()}`);
    if (this.id) {
      handleStr.push(`'${this.id}'`);
    }
    if (handleTags && handleTags.length) {
      handleStr.push(`${[...handleTags].join(' ')}`);
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
}
