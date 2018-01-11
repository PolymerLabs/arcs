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
  constructor(type, arc, name, id, key) {
    var trace = tracing.start({cat: 'view', name: 'StorageProviderBase::constructor', args: {type: type.key, name: name}});
    this._type = type;
    this._arc = arc;
    this._listeners = new Map();
    this.name = name;
    this._version = 0;
    this.id = id || this._arc.generateID();
    this.source = null;
    this._storageKey = key;
    trace.end();
  }

  get storageKey() {
    return this._storageKey;
  }

  generateID() {
    return this._arc.generateID();
  }

  generateIDComponents() {
    return this._arc.generateIDComponents();
  }

  get type() {
    return this._type;
  }
  // TODO: add 'once' which returns a promise.
  on(kind, callback, target) {
    assert(target !== undefined, 'must provide a target to register a view event handler');
    let listeners = this._listeners.get(kind) || new Map();
    listeners.set(callback, {version: -Infinity, target});
    this._listeners.set(kind, listeners);
  }

  _fire(kind, details) {
    var listenerMap = this._listeners.get(kind);
    if (!listenerMap || listenerMap.size == 0)
      return;

    var callTrace = tracing.start({cat: 'view', name: 'StorageProviderBase::_fire', args: {kind, type: this._type.key,
        name: this.name, listeners: listenerMap.size}});

    // TODO: wire up a target (particle)
    let eventRecords = [];

    for (let [callback, registration] of listenerMap.entries()) {
      let target = registration.target;
      eventRecords.push({target, callback, kind, details});
    }

    this._arc.scheduler.enqueue(this, eventRecords);

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
