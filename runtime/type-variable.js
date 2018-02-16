// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

class TypeVariable {
  constructor(name, id) {
    this.name = name;
    this.id = id;
    this.resolution = null;
  }

  // this shouldn't be called on a 
  // resolved TypeVariable.. how do we
  // pass a resolution across the PEC?
  toLiteral() {
    assert(this.resolution == null);
    return this;
  }

  static fromLiteral(data) {
    return new TypeVariable(data.name, data.id);
  }

  get isResolved() {
    return !!this.resolution;
  }

  equals(other) {
    if (this.isResolved && other.isResolved) {
      return this.resolution.equals(other.resolution);
    }
    return this.name == other.name;
  }
}

export default TypeVariable;
