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

var data = require('./data-layer.js');

class Resolver {

  resolve(recipe, context) {
    for (var component of recipe.components)
      this.resolveComponent(component, context);
  }

  resolveComponent(component, context) {
    for (var connection of component.connections)
      this.resolveConnection(component, connection, context);
  }

  resolveConnection(component, connection, context) {
    // connection already has a view
    if (connection.view !== undefined)
      return;

    // TODO: More complex resolution logic should go here.
    connection.view = data.internals.viewFor(connection.type);
  }

}

module.exports = Resolver;