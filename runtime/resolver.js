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
var tracing = require('../tracelib/trace.js');
var typeLiteral = require('./type-literal.js');

class Resolver {

  resolve(recipe, arc) {
    var constraintNames = new Map();
    assert(arc, "resolve requires an arc");
    var success = true;
    var context = {arc: arc, constraintNames: constraintNames};
    for (var component of recipe.components)
      success &= this.resolveComponent(context, component);
    recipe.arc = arc;
    return success;
  }

  matchVariableReference(context, variable, other) {
    return context.arc.scope.resolve(variable, other);
  }

  matches(context, authority, spec) {
    if (authority == undefined)
      return false;
    // can't match directly against a constraint - that comes later.
    if (spec.constructor == recipe.RecipeConstraintConnection)
      return true;  
    assert(spec.constructor == recipe.RecipeSpecConnection);
    authority = authority;
    spec = spec.spec;
    // TODO: better matching enforcement goes here
    if (typeLiteral.equal(spec.typeName, authority.typeName))
      return true;
    if (spec.type.isVariable && !authority.type.isVariable)
      return this.matchVariableReference(context, spec.type, authority.type);
    if (authority.type.isVariable && !spec.type.isVariable)
      return this.matchVariableReference(context, authority.type, spec.type);
    return false;
  }

  resolveComponent(context, component) {
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
      success &= this.matches(context, connectionSpec, connection);
      connections.delete(connection.name);
      context.connectionSpec = connectionSpec;
      success &= this.resolveConnection(context, connection);
    }
    for (var connection of connections.values()) {
      var newConnection = new recipe.RecipeSpecConnection(connection.name, connection)
      context.connectionSpec = connection; 
      component.addConnection(newConnection);
      success &= this.resolveConnection(context, newConnection);
    }
    trace.end({args: {resolved: success}});
    return success;
  }

  resolveConnection(context, connection) {
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
        return this.resolveSpecConnection(context, connection);
      case recipe.RecipeConstraintConnection:
        return this.resolveConstraintConnection(context, connection);
      default:
        return false;
    }
  }

  resolveSpecConnection(context, connection) {
    var trace = tracing.start({cat: "resolver", name: "Resolver::resolveSpecConnection",
      args: {name: connection.name}});
    // TODO this is *not* the right way to deal with singleton vs. list connections :)
    var typeName = connection.spec.typeName;
    trace.update({args: {type: typeName}});
    var type = runtime.internals.Type.fromLiteral(typeName, context.arc.scope);

    if (type.isView || type.isRelation) {
      if (connection.spec.mustCreate && context.arc.scope.viewExists(type) == true) {
        trace.end({args: {resolved: false, reason: "creation required but view exists"}});
        return false;
      }
      if (!connection.spec.mustCreate && context.arc.scope.viewExists(type) == false) {
        trace.end({args: {resolved: false, reason: "creation forbidden but view doesn't exist"}});
        return false;
      }
    }
  
    // TODO: More complex resolution logic should go here.
    connection.view = () => context.arc.scope._viewFor(type);
    connection.type = type;
    trace.end({resolved: true});
    return true;
  }

  resolveConstraintConnection(context, connection) {
    var trace = tracing.start({cat: "resolver", name: "Resolver::resolveConstraintConnection", 
      args: {name: connection.name, constraintName: connection.constraintName}});
    var constrainedConnection = context.constraintNames.get(connection.constraintName);
    if (constrainedConnection !== undefined) {
      if (!this.matches(context, context.connectionSpec, constrainedConnection)) {
        trace.end({args: {resolved: false, reason: "could not match existing constraint"}});
        return false;
      }
      connection.view = constrainedConnection.view;
      connection.type = constrainedConnection.type;
      trace.end({args: {resolved: true}})
      return true;
    }
    constrainedConnection = new recipe.RecipeSpecConnection(connection.name, context.connectionSpec);
    if (this.resolveSpecConnection(context, constrainedConnection)) {
      context.constraintNames.set(connection.constraintName, constrainedConnection);
      connection.view = constrainedConnection.view;
      connection.type = constrainedConnection.type;
      trace.end({args: {resolved: true}});
      return true;
    }

    trace.end({args: {resolved: false, reason: "could not resolve spec connection as new constraint"}});
    return false;
  }
}

module.exports = Resolver;
