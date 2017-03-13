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
    for (var component of recipe.components)
      this.resolveComponent(component, arc);
    recipe.arc = arc;
  }

  resolveComponent(component, arc) {
    for (var connection of component.connections)
      this.resolveConnection(component, connection, arc);
  }

  resolveConnection(component, connection, arc) {
    // connection already has a view
    if (connection.view !== undefined)
      return;

    // TODO: More complex resolution logic should go here.
    connection.view = arc.scope._viewFor(runtime.internals.Type.fromLiteral(connection.type, arc.scope));
  }

}

module.exports = Resolver;
