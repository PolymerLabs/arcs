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

class Resolver {

  resolve(recipe, arc) {
    assert(arc, "resolve requires an arc");
    var success = true;
    for (var component of recipe.components)
      success &= this.resolveComponent(component, arc);
    recipe.arc = arc;
    return success;
  }

  matches(authority, spec) {
    if (authority == undefined)
      return false;
    // TODO: better matching enforcement goes here
    return true;
  }

  resolveComponent(component, arc) {
    var trace = tracing.start({cat: "resolver", name: "Resolver::resolverComponent", args: {name: component.particleName}});
    var componentSpec = arc.scope.particleSpec(component.particleName);
    if (componentSpec == undefined) {
      trace.end({args: {resolved: false, reason: "no such particle"}});
      return false;
    }
    var connections = new Map();
    for (var connection of componentSpec.connections)
      connections.set(connection.name, connection);
    trace.update({args: {components: component.connections.length, specifiedComponents: componentSpec.connections.length}});    
    var success = true;
    for (var connection of component.connections) {
      success &= this.matches(connections.get(connection.name), connection);
      connections.delete(connection.name);
      success &= this.resolveConnection(component, connection, arc);
    }
    for (var connection of connections.values()) {
      var newConnection = new recipe.RecipeSpecConnection(connection.name, connection)
      component.addConnection(newConnection);
      success &= this.resolveConnection(component, newConnection, arc);
    }
    trace.end({args: {resolved: success}});
    return success;
  }

  resolveConnection(component, connection, arc) {
    switch (connection.constructor) {
      case recipe.RecipeViewConnection:
        return true;
      case recipe.RecipeSpecConnection:
        return this.resolveSpecConnection(component, connection, arc);
      default:
        return false;
    }
  }

  resolveSpecConnection(component, connection, arc) {
    // connection already has a view
    if (connection.view !== undefined)
      return true;

    // TODO this is *not* the right way to deal with singleton vs. list connections :)
    var typeName = connection.spec.typeName;
    var type = runtime.internals.Type.fromLiteral(typeName, arc.scope);

    if ((type.isView || type.isRelation) && connection.spec.mustCreate == arc.scope.viewExists(type))
      return false;
  
    // TODO: More complex resolution logic should go here.
    connection.view = () => arc.scope._viewFor(type);
    connection.type = type;
    return true;
  }

}

module.exports = Resolver;
