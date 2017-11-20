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

  toLiteral() {
    return this;
  }

  fromLiteral(data) {
    return new TypeVariable(data.name, data.id);
  }

  get isResolved() {
    return this.resolution !== undefined;
  }

  resolve(type) {
    this.resolution = type;
  }

}

export default TypeVariable;
