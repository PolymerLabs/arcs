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
    this._views = new Map();
    this._particles = new Map();
    this._variableBindings = new Map();
  }

  viewExists(type) {
    if (type.isView)
      type = type.primitiveType(this);
    return this._views.get(type) !== undefined;
  }

  createViewForTesting(type) {
    this._viewFor(type);
  }

  resolve(typeVar, type) {
    assert(typeVar.isVariable);
    assert(this._variableBindings.get(typeVar.variableID) == undefined);
    // TODO: check for circularity of references?
    this._variableBindings.set(typeVar.variableID, type);
  }

  _viewFor(type) {
    assert(type instanceof Type);
    console.log("Request to retrieve view for type", type.key);
    assert(type.isValid, "invalid type specifier");
    if (type.isRelation)
      return this._viewForRelation(type);
    if (type.isView)
      return this._viewForPrimitive(type.primitiveType(this));
    return this._singletonView(type);
  }

  _getResolvedType(type) {
    assert(type.isVariable);
    var t = this._variableBindings.get(type.variableID);
    assert(t !== undefined, `no resolved type known for type variable ${type.toString}`);
    return t;
  }

  _viewForRelation(type) {
    type = type.viewOf(this);
    // TODO: deal with variables
    var result = this._views.get(type);
    if (!result) {
      result = new view.View(type, this);
      this._views.set(type, result);
    }
    return result;
  }

  _singletonView(type) {
    if (type.isVariable) {
      return this._singletonView(this._getResolvedType(type));
    }

    var result = this._views.get(type);
    if (!result) {
      console.log("constructing new singleton view for", type);
      result = new view.SingletonView(type, this);
      this._views.set(type, result);
    }
    return result;
  }

  _viewForPrimitive(type) {
    if (type.isVariable) {
      return this._viewForPrimitive(this._getResolvedType(type));
    }

    var type = type.viewOf(this);
    var result = this._views.get(type);
    if (!result) {
      console.log("constructing new view for", type);
      result = new view.View(type, this);
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
      this._types.set(classOrInstance, new Type(key, this, classOrInstance));
    }
    return this._types.get(classOrInstance);
  }

  _newIdentifier(view, type) {
    return new Identifier(view, type, this._nextIdentifier++);
  }

  commitSingletons(entities) {
    let view = null;
    for (let entity of entities) {
      entity.identify(view, this);
    }
    for (let entity of entities) {
      this._viewFor(this.typeFor(entity)).store(entity);
    }
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
        entity.entities.forEach(entity => this._viewFor(this.typeFor(entity).viewOf(this)).store(entity));
      }
      console.log(entity, this.typeFor(entity));
      this._viewFor(this.typeFor(entity).viewOf(this)).store(entity);
    }
  }

  registerEntityClass(clazz) {
    this.typeFor(clazz);
  }

  registerParticle(clazz) {
    this._particles.set(clazz.name, clazz);
  }

  instantiateParticle(name, arc) {
    let particleClass = this._particles.get(name);
    assert(particleClass, name);
    let particle = new particleClass(arc);
    assert(particle);
    assert(particle.arcParticle);
    return particle.arcParticle;
  }
}

module.exports = Scope;
