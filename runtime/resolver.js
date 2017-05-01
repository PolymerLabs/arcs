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

var runtime = require('./runtime.js');
var assert = require('assert');
var recipe = require('./recipe.js');
var tracing = require('tracelib');
var typeLiteral = require('./type-literal.js');

class Resolver {

  static resolve(recipe, arc) {
    assert(arc, "resolve requires an arc");
    var context = {
      arc: arc,
      constraintNames: new Map(),
      variableBindings: new Map(),
      pendingViewChecks: [],
    };
    var resolve; var reject;
    context.afterResolution = [];
    for (var component of recipe.components) {
      if (!new Resolver()._resolveComponent(context, component)) {
        return false;
      }
    }
    recipe.arc = arc;
    context.afterResolution.forEach(f => f());
    return true;
  }

  // TODO: Either all of this logic should be static or context should be folded into `this`
  _matchVariableReference(context, typeVar, type) {
    assert(typeVar.isVariable, "can't resolve a type variable that isn't a type variable");
    assert(context.variableBindings.get(typeVar.variableID) == undefined, "can't re-resolve an already resolved type variable");
    // TODO: check for circularity of references?
    context.variableBindings.set(typeVar.variableID, type);
    // TODO: this should drop pending view checks as they actually return true
    if (context.pendingViewChecks.map(a => this._viewExists(context, a)).reduce((a,b) => a && b, true) == false) {
      context.variableBindings.remove(typeVar.variableID);
      return false;
    }
    return true;
  }

  _matchViewReference(context, typeView, type) {
    let typeViewPrimitiveType = typeView.primitiveType(context.arc.scope);
    let typePrimitiveType = type.primitiveType(context.arc.scope);
    if (typeViewPrimitiveType.isVariable && !typePrimitiveType.isVariable)
      return this._matchVariableReference(context, typeViewPrimitiveType, typePrimitiveType);
    if (typePrimitiveType.isVariable && !typeViewPrimitiveType.isVariable)
      return this._matchVariableReference(context, typePrimitiveType, typeViewPrimitiveType);
    return false;
  }

  _matches(context, authority, spec) {
    if (authority == undefined)
      return false;
    // can't match directly against a constraint - that comes later.
    if (spec.constructor == recipe.RecipeConstraintConnection)
      return true;  
    assert(spec.constructor == recipe.RecipeSpecConnection, "Should only match RecipeSpecConnections in Resolver::matches");
    authority = authority;
    spec = spec.spec;
    // TODO: better matching enforcement goes here
    if (typeLiteral.equal(spec.typeName, authority.typeName))
      return true;
    assert(spec.type, '_matches requires spec.type');
    assert(authority.type, '_matches requires authority.type');
    let resolvedSpecType = this._resolveType(context, spec.type);
    let resolvedAuthorityType = this._resolveType(context, authority.type);
    if (resolvedSpecType != undefined && resolvedSpecType == resolvedAuthorityType)
      return true;
    if (spec.type.isVariable && !authority.type.isVariable)
      return this._matchVariableReference(context, spec.type, authority.type);
    if (authority.type.isVariable && !spec.type.isVariable)
      return this._matchVariableReference(context, authority.type, spec.type);
    if (authority.type.isView && spec.type.isView)
      return this._matchViewReference(context, spec.type, authority.type);
    return false;
  }

  _resolveComponent(context, component) {
    var trace = tracing.start({cat: "resolver", name: "Resolver::resolveComponent", args: {name: component.particleName}});
    var componentSpec = context.arc.scope.particleSpec(component.particleName);
    if (componentSpec == undefined) {
      trace.end({args: {resolved: false, reason: "no such particle"}});
      return false;
    }
    context.componentSpec = componentSpec;
    context.component = component;
    var connections = new Map();
    for (var connection of componentSpec.connections)
      connections.set(connection.name, connection);
    trace.update({args: {components: component.connections.length, specifiedComponents: componentSpec.connections.length}});    
    var success = true;
    for (var connection of component.connections) {
      var connectionSpec = connections.get(connection.name);
      success &= this._matches(context, connectionSpec, connection);
      connections.delete(connection.name);
      context.connectionSpec = connectionSpec;
      success &= this._resolveConnection(context, connection);
    }
    for (var connection of connections.values()) {
      var newConnection = new recipe.RecipeSpecConnection(connection.name, connection)
      context.connectionSpec = connection; 
      component.addConnection(newConnection);
      success &= this._resolveConnection(context, newConnection);
    }
    trace.end({args: {resolved: success}});
    return success;
  }

  _resolveConnection(context, connection) {
    var trace = tracing.start({cat: "resolver", name: "Resolver::resolveConnection",
      args: {type: connection.constructor.name, name: connection.name}});
    var result = this._resolveConnection(context, connection);
    trace.end({args: {resolved: result}});
    return result;
  }

  _resolveConnection(context, connection) {
    switch (connection.constructor) {
      case recipe.RecipeViewConnection:
        return true;
      case recipe.RecipeSpecConnection:
        return this._resolveSpecConnection(context, connection);
      case recipe.RecipeConstraintConnection:
        return this._resolveConstraintConnection(context, connection);
      default:
        return false;
    }
  }

  _viewExists(context, type) {
    var resolved = this._resolveType(context, type);
    if (resolved == undefined) {
      context.pendingViewChecks.push(type);
      return -1;
    }
    return context.arc.findViews(resolved).length > 0;
  }

  _resolveType(context, type) {
    if (type.isView) {
      var resolved = this._resolveType(context, type.primitiveType(context.arc.scope));
      if (resolved == undefined) {
        return undefined;
      }
      return resolved.viewOf(context.arc.scope);
    }

    if (type.isVariable) {
      var t = context.variableBindings.get(type.variableID);
      return t;
    }

    return type;
  }

  _resolveSpecConnection(context, connection) {
    var trace = tracing.start({cat: "resolver", name: "Resolver::resolveSpecConnection",
      args: {name: connection.name}});
    // TODO this is *not* the right way to deal with singleton vs. list connections :)
    assert(connection.spec, "cannot resolve an undefined spec connection");
    var typeName = connection.spec.typeName;
    trace.update({args: {type: typeName}});
    var type = runtime.internals.Type.fromLiteral(typeName, context.arc.scope);

    if (type.isView || type.isRelation) {
      if (!connection.spec.mustCreate && this._viewExists(context, type) == false) {
        trace.end({args: {resolved: false, reason: "creation forbidden but no view exists"}});
        return false;
      }
    }

    type = this._resolveType(context, type);

    // TODO: More complex resolution logic should go here.
    if (connection.spec.mustCreate)
      context.afterResolution.push(() => { connection.view = context.arc.createView(type, connection.constraintName); });
    else
      context.afterResolution.push(() => { connection.view = context.arc.findViews(type)[0]; });
      connection.view = () => context.arc.scope.findViews(type)[0];
    connection.type = type;
    trace.end({resolved: true});
    return true;
  }

  _resolveConstraintConnection(context, connection) {
    var trace = tracing.start({cat: "resolver", name: "Resolver::resolveConstraintConnection", 
      args: {name: connection.name, constraintName: connection.constraintName}});
    var constrainedConnection = context.constraintNames.get(connection.constraintName);
    if (constrainedConnection !== undefined) {
      if (!this._matches(context, context.connectionSpec, constrainedConnection)) {
        trace.end({args: {resolved: false, reason: "could not match existing constraint"}});
        return false;
      }
      context.afterResolution.push(() => {
        connection.view = constrainedConnection.view;
        connection.type = constrainedConnection.type;
      });
      trace.end({args: {resolved: true}})
      return true;
    }
    constrainedConnection = new recipe.RecipeSpecConnection(connection.name, context.connectionSpec);
    constrainedConnection.constraintName = connection.constraintName;
    if (this._resolveSpecConnection(context, constrainedConnection)) {
      context.constraintNames.set(connection.constraintName, constrainedConnection);
      context.afterResolution.push(() => {
        connection.view = constrainedConnection.view;
        connection.type = constrainedConnection.type;
      });
      trace.end({args: {resolved: true}});
      return true;
    }

    trace.end({args: {resolved: false, reason: "could not resolve spec connection as new constraint"}});
    return false;
  }
}

module.exports = Resolver;
