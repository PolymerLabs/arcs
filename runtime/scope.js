/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
"use strict";

const assert = require('assert');
const View = require('./view.js');
const Identifier = require('./identifier.js');
const Symbols = require('./symbols.js');
const Entity = require('./entity.js');
const Type = require('./type.js');
const Relation = require('./relation.js');

class Scope {
  constructor() {
    this._types = new Map();
    // TODO: more elaborate type keys
    this._nextType = 1;
    // TODO: more elaborate identifier keys
    this._nextIdentifier = 1;
    this._views = new Map();
  }

  viewExists(type) {
    return this._views.get(type) !== undefined;
  }

  createViewForTesting(type) {
    this._viewFor(type);
  }

  _viewFor(type) {
    assert(type instanceof Type);
    var result = this._views.get(type);
    if (!result) {
      console.log("constructing new view for", type);
      result = new View(type, this);
      this._views.set(type, result);
    }
    return result;
  }

  typeFor(classOrInstance) {
    if (classOrInstance instanceof Entity) {
      if (classOrInstance[Symbols.identifier]) {
        assert(classOrInstance[Symbols.identifier].type);
        return classOrInstance[Symbols.identifier].type;
      }

      if (classOrInstance instanceof Relation) {
        return Relation.typeFor(classOrInstance, this);
      }

      return this.typeFor(classOrInstance.constructor);
    }
    if (!this._types.has(classOrInstance)) {
      let key = classOrInstance.key || this._nextType++;
      this._types.set(classOrInstance, new Type(key, this));
    }
    return this._types.get(classOrInstance);
  }

  _newIdentifier(view, type) {
    return new Identifier(view, type, this._nextIdentifier++);
  }

  commit(entities) {
    let view = null; // TODO: pass the correct view identifiers.
    for (let entity of entities) {
      if (entity instanceof Relation) {
        entity.entities.forEach(entity => entity.identify(view, this));
      }
    }
    for (let entity of entities) {
      entity.identify(view, this);
    }
    for (let entity of entities) {
      if (entity instanceof Relation) {
        entity.entities.forEach(entity => this._viewFor(this.typeFor(entity)).store(entity));
      }
      console.log(entity, this.typeFor(entity));
      this._viewFor(this.typeFor(entity)).store(entity);
    }
  }
}

module.exports = Scope;
