// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import * as util from './util.js';
import {assert} from '../../platform/assert-web.js';

export class ParticleEndPoint {
  constructor(particle, connection) {
    this.particle = particle;
    this.connection = connection;
  }

  _clone() {
    return new ParticleEndPoint(this.particle, this.connection);
  }

  _compareTo(other) {
    let cmp;
    if ((cmp = util.compareStrings(this.particle.name, other.particle.name)) != 0) return cmp;
    if ((cmp = util.compareStrings(this.connection, other.connection)) != 0) return cmp;
    return 0;
  }

  toString() {
    if (!this.connection)
      return `${this.particle.name}`;
    return `${this.particle.name}.${this.connection}`;
  }
}

export class InstanceEndPoint {
  constructor(instance, connection) {
    assert(instance);
    this.recipe = instance.recipe;
    this.instance = instance;
    this.connection = connection;
  }

  _clone(cloneMap) {
    return new InstanceEndPoint(cloneMap.get(this.instance), this.connection);
  }

  _compareTo(other) {
    let cmp;
    if ((cmp = this.instance._compareTo(other.instance)) != 0) return cmp;
    if ((cmp = util.compareStrings(this.connection, other.connection)) != 0) return cmp;
    return 0;
  }

  toString(nameMap) {
    if (!this.connection)
      return `${nameMap.get(this.instance)}`;
    return `${nameMap.get(this.instance)}.${this.connection}`;
  }
}

export class HandleEndPoint {
  constructor(handle) {
    this.handle = handle;
  }

  _clone() {
    return new HandleEndPoint(this.handle);
  }

  _compareTo(other) {
    let cmp;
    if ((cmp = util.compareStrings(this.handle.localName, other.handle.localName)) != 0) return cmp;
    return 0;
  }

  toString() {
    return `${this.handle.localName}`;
  }
}

export class TagEndPoint {
  constructor(tags) {
    this.tags = tags;
  }

  _clone() {
    return new TagEndPoint(this.tags);
  }

  _compareTo(other) {
    let cmp;
    if ((cmp = util.compareArrays(this.handle.tags, other.handle.tags, util.compareStrings)) != 0) return cmp;
    return 0;
  }

  toString() {
    return this.tags.map(a => `#${a}`).join(' ');
  }
}

export class ConnectionConstraint {
  constructor(fromConnection, toConnection, direction, type) {
    assert(direction);
    assert(type);
    this.from = fromConnection;
    this.to = toConnection;
    this.direction = direction;
    this.type = type;
    Object.freeze(this);
  }

  _copyInto(recipe, cloneMap) {
    if (this.type == 'constraint')
      return recipe.newConnectionConstraint(this.from._clone(), this.to._clone(), this.direction);
    return recipe.newObligation(this.from._clone(cloneMap), this.to._clone(cloneMap), this.direction);
  }
    
  _compareTo(other) {
    let cmp;
    if ((cmp = this.from._compareTo(other.from)) != 0) return cmp;
    if ((cmp = this.to._compareTo(other.to)) != 0) return cmp;
    if ((cmp = util.compareStrings(this.direction, other.direction)) != 0) return cmp;
    return 0;
  }

  toString(nameMap, options) {
    let unresolved = '';
    if (options && options.showUnresolved == true && this.type == 'obligation') {
      unresolved = ' // unresolved obligation';
    }
    return `${this.from.toString(nameMap)} ${this.direction} ${this.to.toString(nameMap)}${unresolved}`;
  }
}
