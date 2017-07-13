// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

class ConnectionConstraint {
  constructor(from, fromConnection, to, toConnection) {
    this.fromParticle = from;
    this.fromConnection = fromConnection;
    this.toParticle = to;
    this.toConnection = toConnection;
    Object.freeze(this);
  }

  clone() {
    return new ConnectionConstraint(this.fromParticle, this.fromConnection, this.toParticle, this.toConnection);
  }

  compareTo(other) {
    let cmp;
    if ((cmp = compareStrings(this.fromParticle, other.fromParticle)) != 0) return cmp;
    if ((cmp = compareStrings(this.fromConnection, other.fromConnection)) != 0) return cmp;
    if ((cmp = compareStrings(this.toParticle, other.toParticle)) != 0) return cmp;
    if ((cmp = compareStrings(this.toConnection, other.toConnection)) != 0) return cmp;
    return 0;
  }

  toString() {
    return `${this.fromParticle}.${this.fromConnection} -> ${this.toParticle}.${this.toConnection}`;
  }
}

module.exports = ConnectionConstraint;
