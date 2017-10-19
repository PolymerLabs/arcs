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
}

module.exports = Shape;
