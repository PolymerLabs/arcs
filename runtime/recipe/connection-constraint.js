// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import util from './util.js';
import assert from '../../platform/assert-web.js';

class ConnectionConstraint {
  constructor(from, fromConnection, to, toConnection, direction) {
    assert(direction);
    this.fromParticle = from;
    this.fromConnection = fromConnection;
    this.toParticle = to;
    this.toConnection = toConnection;
    this.direction = direction;
    Object.freeze(this);
  }

  _copyInto(recipe) {
    return recipe.newConnectionConstraint(this.fromParticle, this.fromConnection, this.toParticle, this.toConnection, this.direction);
  }

  _compareTo(other) {
    let cmp;
    if ((cmp = util.compareStrings(this.fromParticle.name, other.fromParticle.name)) != 0) return cmp;
    if ((cmp = util.compareStrings(this.fromConnection, other.fromConnection)) != 0) return cmp;
    if ((cmp = util.compareStrings(this.toParticle.name, other.toParticle.name)) != 0) return cmp;
    if ((cmp = util.compareStrings(this.toConnection, other.toConnection)) != 0) return cmp;
    if ((cmp = util.compareStrings(this.direction, other.direction)) != 0) return cmp;
    return 0;
  }

  toString() {
    return `${this.fromParticle.name}.${this.fromConnection} ${this.direction} ${this.toParticle.name}.${this.toConnection}`;
  }
}

export default ConnectionConstraint;
