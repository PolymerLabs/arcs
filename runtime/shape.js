/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/assert-web.js';

// ShapeHandle {name, direction, type}
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

const handleFields = ['type', 'name', 'direction'];
const slotFields = ['name', 'direction', 'isRequired', 'isSet'];

export class Shape {
  constructor(name, handles, slots) {
    assert(name);
    assert(handles !== undefined);
    assert(slots !== undefined);
    this.name = name;
    this.handles = handles;
    this.slots = slots;
    this._typeVars = [];
    for (let handle of handles)
      for (let field of handleFields)
        if (Shape.isTypeVar(handle[field]))
          this._typeVars.push({object: handle, field});

    for (let slot of slots)
      for (let field of slotFields)
        if (Shape.isTypeVar(slot[field]))
          this._typeVars.push({object: slot, field});
  }

  toPrettyString() {
    return 'SHAAAAPE';
  }

  get canReadSubset() {
    return this._cloneAndUpdate(typeVar => typeVar.canReadSubset);
  }

  get canWriteSuperset() {
    return this._cloneAndUpdate(typeVar => typeVar.canWriteSuperset);
  }

  isMoreSpecificThan(other) {
    if (this.handles.length !== other.handles.length || this.slots.length !== other.slots.length)
      return false;
    // TODO: should probably confirm that handles and slots actually match.
    for (let i = 0; i < this._typeVars.length; i++) {
      let thisTypeVar = this._typeVars[i];
      let otherTypeVar = other._typeVars[i];
      if (!thistypeVar.object[thistypeVar.field].isMoreSpecificThan(othertypeVar.object[othertypeVar.field]))
        return false;
    }
    return true;
  }

  _applyExistenceTypeTest(test) {
    for (let typeRef of this._typeVars) {
      if (test(typeRef.object[typeRef.field]))
        return true;
    }

    return false;
  }

  _handlesToManifestString() {
    return this.handles
      .map(handle => {
        let type = handle.type.resolvedType();
        return `  ${handle.direction ? handle.direction + ' ': ''}${type.toString()} ${handle.name ? handle.name : '*'}`;
      }).join('\n');
  }

  _slotsToManifestString() {
    // TODO deal with isRequired
    return this.slots
      .map(slot => `  ${slot.direction} ${slot.isSet ? 'set of ' : ''}${slot.name ? slot.name + ' ' : ''}`)
      .join('\n');
  }
  // TODO: Include name as a property of the shape and normalize this to just
  // toString().
  toString() {
    return `shape ${this.name}
${this._handlesToManifestString()}
${this._slotsToManifestString()}
`;
  }

  static fromLiteral(data) {
    let handles = data.handles.map(handle => ({type: _fromLiteral(handle.type), name: _fromLiteral(handle.name), direction: _fromLiteral(handle.direction)}));
    let slots = data.slots.map(slot => ({name: _fromLiteral(slot.name), direction: _fromLiteral(slot.direction), isRequired: _fromLiteral(slot.isRequired), isSet: _fromLiteral(slot.isSet)}));
    return new Shape(data.name, handles, slots);
  }

  toLiteral() {
    let handles = this.handles.map(handle => ({type: _toLiteral(handle.type), name: _toLiteral(handle.name), direction: _toLiteral(handle.direction)}));
    let slots = this.slots.map(slot => ({name: _toLiteral(slot.name), direction: _toLiteral(slot.direction), isRequired: _toLiteral(slot.isRequired), isSet: _toLiteral(slot.isSet)}));
    return {name: this.name, handles, slots};
  }

  clone() {
    let handles = this.handles.map(({name, direction, type}) => ({name, direction, type}));
    let slots = this.slots.map(({name, direction, isRequired, isSet}) => ({name, direction, isRequired, isSet}));
    return new Shape(this.name, handles, slots);
  }

  canEnsureResolved() {
    for (let typeVar of this._typeVars)
      if (!typeVar.object[typeVar.field].canEnsureResolved()) return false;
    return true;
  }

  maybeEnsureResolved() {
    for (let typeVar of this._typeVars) {
      let variable = typeVar.object[typeVar.field];
      variable = variable.clone(new Map());
      if (!variable.maybeEnsureResolved()) return false;
    }
    for (let typeVar of this._typeVars)
      typeVar.object[typeVar.field].maybeEnsureResolved();
    return true;
  }

  resolvedType() {
    return this._cloneAndUpdate(typeVar => typeVar.resolvedType());
  }

  equals(other) {
    if (this.handles.length !== other.handles.length)
      return false;

    // TODO: this isn't quite right as it doesn't deal with duplicates properly
    if (!this._equalItems(other.handles, this.handles, this._equalHandle)) {
      return false;
    }

    if (!this._equalItems(other.slots, this.slots, this._equalSlot)) {
      return false;
    }
    return true;
  }

  _equalHandle(handle, otherHandle) {
    return handle.name == otherHandle.name && handle.direction == otherHandle.direction && handle.type.equals(otherHandle.type);
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

  _cloneAndUpdate(update) {
    let copy = this.clone();
    copy._typeVars.forEach(typeVar => Shape._updateTypeVar(typeVar, update));
    return copy;
  }

  static _updateTypeVar(typeVar, update) {
    typeVar.object[typeVar.field] = update(typeVar.object[typeVar.field]);
  }

  static isTypeVar(reference) {
    return (reference instanceof Type) && reference.hasProperty(r => r.isVariable);
  }

  static mustMatch(reference) {
    return !(reference == undefined || Shape.isTypeVar(reference));
  }

  static handlesMatch(shapeHandle, particleHandle) {
    if (Shape.mustMatch(shapeHandle.name) && shapeHandle.name !== particleHandle.name)
      return false;
    // TODO: direction subsetting?
    if (Shape.mustMatch(shapeHandle.direction) && shapeHandle.direction !== particleHandle.direction)
      return false;
    if (shapeHandle.type == undefined)
      return true;
    if (shapeHandle.type.isVariableReference)
      return false;
    let [left, right] = Type.unwrapPair(shapeHandle.type, particleHandle.type);
    if (left.isVariable) {
      return [{var: left, value: right}];
    } else {
      return left.equals(right);
    }

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
    return this.restrictType(particleSpec) !== false;
  }

  restrictType(particleSpec) {
    let newShape = this.clone();
    return newShape._restrictThis(particleSpec);
  }

  _restrictThis(particleSpec) {

    let handleMatches = this.handles.map(
      handle => particleSpec.connections.map(connection => ({match: connection, result: Shape.handlesMatch(handle, connection)}))
                                      .filter(a => a.result !== false));

    let particleSlots = [];
    particleSpec.slots.forEach(consumedSlot => {
      particleSlots.push({name: consumedSlot.name, direction: 'consume', isRequired: consumedSlot.isRequired, isSet: consumedSlot.isSet});
      consumedSlot.providedSlots.forEach(providedSlot => {
        particleSlots.push({name: providedSlot.name, direction: 'provide', isRequired: false, isSet: providedSlot.isSet});
      });
    });
    let slotMatches = this.slots.map(slot => particleSlots.filter(particleSlot => Shape.slotsMatch(slot, particleSlot)));
    slotMatches = slotMatches.map(matchList => matchList.map(slot => ({match: slot, result: true})));

    let exclusions = [];

    // TODO: this probably doesn't deal with multiple match options.
    function choose(list, exclusions) {
      if (list.length == 0)
        return [];
      let thisLevel = list.pop();
      for (let connection of thisLevel) {
        if (exclusions.includes(connection.match))
          continue;
        let newExclusions = exclusions.slice();
        newExclusions.push(connection.match);
        let constraints = choose(list, newExclusions);
        if (constraints !== false) {
          return connection.result.length ? constraints.concat(connection.result) : constraints;
        }
      }

      return false;
    }

    let handleOptions = choose(handleMatches, []);
    let slotOptions = choose(slotMatches, []);

    if (handleOptions === false || slotOptions === false)
      return false;

    for (let constraint of handleOptions)
      if (!constraint.var.variable.resolution)
        constraint.var.variable.resolution = constraint.value;

    return this;
  }
}

import {Type} from './type.js';
