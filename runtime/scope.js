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
    this._viewsByType = new Map();
    this._particles = new Map();
    this._variableBindings = new Map();
  }

  findViews(type, options) {
    // TODO: use options (location, labels, etc.) somehow.
    return this._viewsByType.get(type) || [];
  }

  viewExists(type) {
    if (type.isView)
      type = type.primitiveType(this);
    return this.findViews(type).length > 0;
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
    var result = this.findViews(type)[0];
    if (!result) {
      result = new view.View(type, this);
      this.registerView(result);
    }
    return result;
  }

  _singletonView(type) {
    if (type.isVariable) {
      return this._singletonView(this._getResolvedType(type));
    }

    var result = this.findViews(type)[0];
    if (!result) {
      result = new view.SingletonView(type, this);
      this.registerView(result);
    }
    return result;
  }

  _viewForPrimitive(type) {
    if (type.isVariable) {
      return this._viewForPrimitive(this._getResolvedType(type));
    }

    var type = type.viewOf(this);
    var result = this.findViews(type)[0];
    if (!result) {
      result = new view.View(type, this);
      this.registerView(result);
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

  // TODO: move commitSingletons and commit to testing.
  commitSingletons(entities) {
    let entityMap = new Map();
    for (let entity of entities) {
      entityMap.set(entity, this._viewFor(this.typeFor(entity)));
    }
    this.newCommit(entityMap);
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

  registerView(view) {
    let views = this.findViews(view.type);
    if (!views.length) {
      this._viewsByType.set(view.type, views);
    }
    views.push(view);
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
    let particle = new particleClass(arc);
    assert(particle);
    assert(particle.arcParticle);
    return particle.arcParticle;
  }
}

module.exports = Scope;
