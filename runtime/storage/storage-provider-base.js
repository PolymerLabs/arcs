// @
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import assert from '../../platform/assert-web.js';
import tracing from '../../tracelib/trace.js';
import util from '../recipe/util.js';

export default class StorageProviderBase {
  constructor(type, arcId, name, id, key) {
    assert(id, 'id must be provided when constructing StorageProviders');
    let trace = tracing.start({cat: 'view', name: 'StorageProviderBase::constructor', args: {type: type.key, name: name}});
    this._type = type;
    this._arcId = arcId;
    this._listeners = new Map();
    this.name = name;
    this._version = 0;
    this.id = id;
    this.source = null;
    this._storageKey = key;
    this._nextLocalID = 0;
    trace.end();
  }

  get storageKey() {
    return this._storageKey;
  }

  generateID() {
    return `${this.id}:${this._nextLocalID++}`;
  }

  generateIDComponents() {
    return {base: this.id, component: () => this._nextLocalID++};
  }

  get type() {
    return this._type;
  }
  // TODO: add 'once' which returns a promise.
  on(kind, callback, target) {
    assert(target !== undefined, 'must provide a target to register a storage event handler');
    let scheduler = target._scheduler;
    assert(scheduler !== undefined, 'must provider a scheduler to register a storage event handler');
    let listeners = this._listeners.get(kind) || new Map();
    listeners.set(callback, {version: -Infinity, target, scheduler});
    this._listeners.set(kind, listeners);
  }

  _fire(kind, details) {
    let listenerMap = this._listeners.get(kind);
    if (!listenerMap || listenerMap.size == 0)
      return;

    let callTrace = tracing.start({cat: 'view', name: 'StorageProviderBase::_fire', args: {kind, type: this._type.key,
        name: this.name, listeners: listenerMap.size}});

    // TODO: wire up a target (particle)
    let eventRecords = new Map();

    for (let [callback, registration] of listenerMap.entries()) {
      let target = registration.target;
      if (!eventRecords.has(registration.scheduler))
        eventRecords.set(registration.scheduler, []);
      eventRecords.get(registration.scheduler).push({target, callback, kind, details});
    }
    eventRecords.forEach((records, scheduler) => scheduler.enqueue(this, records));
    callTrace.end();
  }

  _compareTo(other) {
    let cmp;
    if ((cmp = util.compareStrings(this.name, other.name)) != 0) return cmp;
    if ((cmp = util.compareNumbers(this._version, other._version)) != 0) return cmp;
    if ((cmp = util.compareStrings(this.source, other.source)) != 0) return cmp;
    if ((cmp = util.compareStrings(this.id, other.id)) != 0) return cmp;
    return 0;
  }

  toString(viewTags) {
    let results = [];
    let viewStr = [];
    viewStr.push(`view`);
    if (this.name) {
      viewStr.push(`${this.name}`);
    }
    viewStr.push(`of ${this.type.toString()}`);
    if (this.id) {
      viewStr.push(`'${this.id}'`);
    }
    if (viewTags && viewTags.length) {
      viewStr.push(`${[...viewTags].join(' ')}`);
    }
    if (this.source) {
      viewStr.push(`in '${this.source}'`);
    }
    results.push(viewStr.join(' '));
    if (this.description)
      results.push(`  description \`${this.description}\``);
    return results.join('\n');
  }
}
