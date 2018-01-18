/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import assert from '../platform/assert-web.js';

// ShapeView {name, direction, type}
// Slot {name, direction, isRequired, isSet}

function _fromLiteral(member) {
  if (!!member && typeof member == 'object')
    return Type.fromLiteral(member);
  return member;
}

function _toLiteral(member) {
  if (!!member && member.toLiteral)
    return member.toLiteral();
  return member;
}

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
      for (let field of ['name', 'direction', 'isRequired', 'isSet'])
        if (Shape.isTypeVar(slot[field]))
          this._typeVars.push({object: slot, field});
  }

  toPrettyString() {
    return 'SHAAAAPE';
  }

  static fromLiteral(data) {
    let views = data.views.map(view => ({type: _fromLiteral(view.type), name: _fromLiteral(view.name), direction: _fromLiteral(view.direction)}));
    let slots = data.slots.map(slot => ({name: _fromLiteral(slot.name), direction: _fromLiteral(slot.direction), isRequired: _fromLiteral(slot.isRequired), isSet: _fromLiteral(slot.isSet)}));
    return new Shape(views, slots);
  }

  toLiteral() {
    let views = this.views.map(view => ({type: _toLiteral(view.type), name: _toLiteral(view.name), direction: _toLiteral(view.direction)}));
    let slots = this.slots.map(slot => ({name: _toLiteral(slot.name), direction: _toLiteral(slot.direction), isRequired: _toLiteral(slot.isRequired), isSet: _toLiteral(slot.isSet)}));
    return {views, slots};
  }

  clone() {
    var views = this.views.map(({name, direction, type}) => ({name, direction, type}));
    var slots = this.slots.map(({name, direction, isRequired, isSet}) => ({name, direction, isRequired, isSet}));
    return new Shape(views, slots);
  }

  equals(other) {
    if (this.views.length !== other.views.length)
      return false;

    // TODO: this isn't quite right as it doesn't deal with duplicates properly
    if (!this._equalItems(other.views, this.views, this._equalView)) {
      return false;
    }

    if (!this._equalItems(other.slots, this.slots, this._equalSlot)) {
      return false;
    }
    return true;
  }

  _equalView(view, otherView) {
    return view.name == otherView.name && view.direction == otherView.direction && view.type.equals(otherView.type);
  }

  _equalSlot(slot, otherSlot) {
    return slot.name == otherSlot.name && slot.direction == otherSlot.direction && slot.isRequired == otherSlot.isRequired && slot.isSet == otherSlot.isSet;
  }

  _equalItems(otherItems, items, compareItem) {
    for (let otherItem of otherItems) {
      let exists = false;
      for (let item of items) {
        if (compareItem(item, otherItem)) {
          exists = true;
          break;
        }
      }
      if (!exists)
        return false;
    }

    return true;
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

  static slotsMatch(shapeSlot, particleSlot) {
    if (Shape.mustMatch(shapeSlot.name) && shapeSlot.name !== particleSlot.name)
      return false;
    if (Shape.mustMatch(shapeSlot.direction) && shapeSlot.direction !== particleSlot.direction)
      return false;
    if (Shape.mustMatch(shapeSlot.isRequired) && shapeSlot.isRequired !== particleSlot.isRequired)
      return false;
    if (Shape.mustMatch(shapeSlot.isSet) && shapeSlot.isSet !== particleSlot.isSet)
      return false;
    return true;
  }

  particleMatches(particleSpec) {
    var viewMatches = this.views.map(view => particleSpec.connections.filter(connection => Shape.viewsMatch(view, connection)));
    let particleSlots = [];
    particleSpec.slots.forEach(consumedSlot => {
      particleSlots.push({name: consumedSlot.name, direction: 'consume', isRequired: consumedSlot.isRequired, isSet: consumedSlot.isSet});
      consumedSlot.providedSlots.forEach(providedSlot => {
        particleSlots.push({name: providedSlot.name, direction: 'provide', isSet: providedSlot.isSet});
      });
    });
    var slotMatches = this.slots.map(slot => particleSlots.filter(particleSlot => Shape.slotsMatch(slot, particleSlot)));

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
    return choose(viewMatches, []) && choose(slotMatches, []);
  }
}

export default Shape;

import Type from './type.js';
