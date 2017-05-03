// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

const Identifier = require('./identifier.js');
const Entity = require('./entity.js');
const Relation = require('./relation.js');
const Symbols = require('./symbols.js');
const underlyingView = require('./view.js');
let identifier = Symbols.identifier;

// TODO: This won't be needed once runtime is transferred between contexts.
function cloneData(data) {
  return data;
  //return JSON.parse(JSON.stringify(data));
}

function restore(entry, scope) {
  let {id, data} = entry;
  var entity = Entity.fromLiteral(id, cloneData(data));
  var type = scope.typeFor(entity);
  entity.constructor = type.entityClass;
  // TODO: Relation magic should happen elsewhere, and be better.
  if (scope.typeFor(entity).isRelation) {
    let ids = data.map(literal => Identifier.fromLiteral(literal, scope));
    let entities = ids.map(id => scope._viewFor(id.type.viewOf(scope)).get(id));
    assert(!entities.includes(undefined));
    entity = new Relation(...entities);
    entity.entities = entities;
    entity[identifier] = id;
  }
  return entity;
}

class Viewlet {
  constructor(view) {
    this._view = view;
  }
  underlyingView() {
    return this._view;
  }  
  on(kind, callback, target) {
    return this._view.on(kind, callback, target);
  }

  _serialize(entity) {
    let id = entity[identifier];
    let data = cloneData(entity.toLiteral());
    return {
      id,
      data: data,
    };
  }

  _restore(entry) {
    return restore(entry, this._view._scope);
  }

  get type() {
    return this._view._type;
  }
  get name() {
    return this._view.name;
  }
}

class View extends Viewlet {
  constructor(view) {
    // TODO: this should talk to an API inside the PEC.
    super(view);
  }
  query() {
    // TODO: things
  }
  async toList() {
    // TODO: remove this and use query instead
    return (await this._view.toList()).map(a => this._restore(a));
  }
  store(entity) {
    var serialization = this._serialize(entity);
    return this._view.store(serialization);
  }
  async debugString() {
    var list = await this.toList();
    return list ? ('[' + list.map(p => p.debugString).join(", ") + ']') : 'undefined';
  }
}

class Variable extends Viewlet {
  constructor(variable) {
    super(variable);
  }
  async get() {
    var result = await this._view.get();
    var data = result == null ? undefined : this._restore(result);
    return data;
  }
  set(entity) {
    // TODO: this should happen on entity creation, not here
    if (entity[identifier] == undefined)
      entity[identifier] = this._view._scope._newIdentifier(this._view, this._view._scope.typeFor(entity));

    return this._view.set(this._serialize(entity));
  }
  async debugString() {
    var value = await this.get();
    return value ? value.debugString : 'undefined';
  }
}

function viewletFor(view, isView) {
  if (isView || (isView == undefined && view instanceof underlyingView.View))
    view = new View(view);
  else
    view = new Variable(view);
  return view;
}

module.exports = { viewletFor };
