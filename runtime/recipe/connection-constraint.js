// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import * as util from './util.js';
import {assert} from '../../platform/assert-web.js';

export class ParticleConnection {
  constructor(particle, connection) {
    this.particle = particle;
    this.connection = connection;
  }

  _clone() {
    return new ParticleConnection(this.particle, this.connection);
  }

  _compareTo(other) {
    let cmp;
    if ((cmp = util.compareStrings(this.particle.name, other.particle.name)) != 0) return cmp;
    if ((cmp = util.compareStrings(this.connection, other.connection)) != 0) return cmp;
    return 0;
  }

  toString() {
    return `${this.particle.name}.${this.connection}`;
  }
}

export class ConnectionConstraint {
  constructor(fromConnection, toConnection, direction) {
    assert(direction);
    this.from = fromConnection;
    this.to = toConnection;
    this.direction = direction;
    Object.freeze(this);
  }

  _copyInto(recipe) {
    return recipe.newConnectionConstraint(this.from, this.to, this.direction);
  }

  _compareTo(other) {
    let cmp;
    if ((cmp = this.from._compareTo(other.from)) != 0) return cmp;
    if ((cmp = this.to._compareTo(other.to)) != 0) return cmp;
    if ((cmp = util.compareStrings(this.direction, other.direction)) != 0) return cmp;
    return 0;
  }

  toString() {
    return `${this.from} ${this.direction} ${this.to}`;
  }
}
