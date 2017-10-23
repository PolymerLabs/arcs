/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const assert = require('assert');
const Type = require('./type.js');

// ShapeView {name, direction, type}
// Slot {name, direction}

class Shape {
  constructor(views, slots) {
    this.views = views;
    this.slots = slots;
    this._typeVars = [];
    for (let view of views)
      for (let field of ['type', 'name', 'direction'])
        if (Shape.isTypeVar(view[field]))
          this._typeVars.push({object: view, field});

    for (let slot of slots)
      for (let field of ['name', 'direction'])
        if (Shape.isTypeVar(slot[field]))
          this._typeVars.push({object: slot, field});
  }


  clone() {
    var views = this.views.map(({name, direction, type}) => ({name, direction, type}));
    var slots = this.slots.map(({name, direction}) => ({name, direction}));
    return new Shape(views, slots);
  }

  static isTypeVar(reference) {
    return (reference instanceof Type) && reference.hasProperty(r => r.isVariable || r.isVariableReference);
  }

  static mustMatch(reference) {
    return !(reference == undefined || Shape.isTypeVar(reference));
  }

  static viewsMatch(shapeView, particleView) {
    if (Shape.mustMatch(shapeView.name) && shapeView.name !== particleView.name)
      return false;
    // TODO: direction subsetting?
    if (Shape.mustMatch(shapeView.direction) && shapeView.direction !== particleView.direction)
      return false;
    // TODO: polymorphism?
    if (Shape.mustMatch(shapeView.type) && !shapeView.type.equals(particleView.type))
      return false;
    return true;
  }

  _particleMatches(particleSpec) {
    var viewMatches = this.views.map(view => particleSpec.connections.filter(connection => Shape.viewsMatch(view, connection)));

    var exclusions = [];

    function choose(list, exclusions) {
      if (list.length == 0)
        return true;
      var thisLevel = list.pop();
      for (var connection of thisLevel) {
        if (exclusions.includes(connection))
          continue;
        var newExclusions = exclusions.slice();
        newExclusions.push(connection);
        if (choose(list, newExclusions))
          return true;
      }

      return false;
    }

    return choose(viewMatches, []);
  }
}

module.exports = Shape;
