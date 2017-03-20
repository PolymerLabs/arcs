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

class Resolver {

  resolve(recipe, arc) {
    assert(arc, "resolve requires an arc");
    var success = true;
    for (var component of recipe.components)
      success &= this.resolveComponent(component, arc);
    recipe.arc = arc;
    return success;
  }

  resolveComponent(component, arc) {
    var success = true;
    console.log(component.particleName);
    for (var connection of component.connections)
      success &= this.resolveConnection(component, connection, arc);
    return success;
  }

  resolveConnection(component, connection, arc) {
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
