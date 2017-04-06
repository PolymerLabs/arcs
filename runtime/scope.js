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
const view = require('./view.js');
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
    this._particles = new Map();
  }

  clone() {
    var scope = new Scope();
    for (let [key, value] of this._types.entries())
      scope._types.set(key, value);
    scope._nextType = this._nextType;
    scope._nextIdentifier = this._nextIdentifier;
    for (let [key, value] of this._particles.entries())
      scope._particles.set(key, value);
    return scope;
  }

  typeFor(classOrInstance) {
    if (classOrInstance instanceof Entity) {
      if (classOrInstance[Symbols.identifier]) {
        assert(classOrInstance[Symbols.identifier].type, "Identifier must have a type");
        return classOrInstance[Symbols.identifier].type;
      }

      if (classOrInstance instanceof Relation) {
        return Relation.typeFor(classOrInstance, this);
      }

      return this.typeFor(classOrInstance.constructor);
    }
    if (!this._types.has(classOrInstance)) {
      let key = classOrInstance.key || this._nextType++;
      this._types.set(classOrInstance, new Type(key, this, classOrInstance));
    }
    return this._types.get(classOrInstance);
  }

  _newIdentifier(view, type) {
    return new Identifier(view, type, this._nextIdentifier++);
  }

  commit(entities) {
    let entityMap = new Map();
    for (let entity of entities) {
      entityMap.set(entity, this._viewFor(this.typeFor(entity).viewOf(this)));
    }
    for (let entity of entities) {
      if (entity instanceof Relation) {
        entity.entities.forEach(entity => entityMap.set(entity, this._viewFor(this.typeFor(entity).viewOf(this))));
      }
    }
    this.newCommit(entityMap);
  }

  newCommit(entityMap) {
    for (let [entity, view] of entityMap.entries()) {
      entity.identify(view, this);
    }
    for (let [entity, view] of entityMap.entries()) {
      view.store(entity);
    }
  }

  registerEntityClass(clazz) {
    this.typeFor(clazz);
  }

  registerParticle(clazz) {
    this._particles.set(clazz.name, clazz);
  }

  particleSpec(name) {
    if (this._particles.has(name))
      return this._particles.get(name).spec.resolve(this);
  }

  instantiateParticle(name, arc) {
    let particleClass = this._particles.get(name);
    assert(particleClass, name);
    let particle = arc.constructParticle(particleClass);
    return particle;
  }
}

module.exports = Scope;
