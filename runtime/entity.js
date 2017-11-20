// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

import assert from '../platform/assert-web.js';
import Symbols from './symbols.js';

class Entity {
  constructor(userIDComponent) {
    assert(!userIDComponent || userIDComponent.indexOf(':') == -1, "user IDs must not contain the ':' character")
    this[Symbols.identifier] = undefined;
    this._userIDComponent = userIDComponent;
  }
  get data() {
    return undefined;
  }

  getUserID() {
    return this._userIDComponent;
  }

  isIdentified() {
    return this[Symbols.identifier] !== undefined;
  }
  identify(identifier) {
    assert(!this.isIdentified());
    this[Symbols.identifier] = identifier;
    let components = identifier.split(':');
    if (components[components.length - 2] == 'uid')
      this._userIDComponent = components[components.length - 1];
  }
  createIdentity(components) {
    assert(!this.isIdentified());
    if (this._userIDComponent)
      var id = `${components.base}:uid:${this._userIDComponent}`;
    else
      var id = `${components.base}:${components.component()}`;
    this[Symbols.identifier] = id;
  }
  toLiteral() {
    return this.rawData;
  }

  get debugString() {
    return JSON.stringify(this.rawData);
  }

  static get type() {
    // TODO: should the entity's key just be its type?
    // Should it just be called type in that case?
    return Type.newEntity(this.key.schema);
  }
}

export default Entity;

import Type from './type.js';
