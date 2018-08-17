/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';

// ShapeHandle {name, direction, type}
// Slot {name, direction, isRequired, isSet}

function _fromLiteral(member) {
  if (!!member && typeof member === 'object') {
    return Type.fromLiteral(member);
  }
  return member;
}

function _toLiteral(member) {
  if (!!member && member.toLiteral) {
    return member.toLiteral();
  }
  return member;
}

const handleFields = ['type', 'name', 'direction'];
const slotFields = ['name', 'direction', 'isRequired', 'isSet'];

export class Shape {
  name: string;
  handles: {type: Type, name: string, direction: string}[];
  slots: {name: string, direction: string, isRequired: boolean, isSet: boolean}[];

  private typeVars: {object: any, field: string}[];

  constructor(name, handles, slots) {
    assert(name);
    assert(handles !== undefined);
    assert(slots !== undefined);
    this.name = name;
    this.handles = handles;
    this.slots = slots;
    this.typeVars = [];
    for (const handle of handles) {
      for (const field of handleFields) {
        if (Shape.isTypeVar(handle[field])) {
          this.typeVars.push({object: handle, field});
        }
      }
    }

    for (const slot of slots) {
      for (const field of slotFields) {
        if (Shape.isTypeVar(slot[field])) {
          this.typeVars.push({object: slot, field});
        }
      }
    }
  }

  toPrettyString() {
    return 'SHAAAAPE';
  }

  mergeTypeVariablesByName(variableMap) {
    this.typeVars.map(({object, field}) => object[field] = object[field].mergeTypeVariablesByName(variableMap));
  }

  get canReadSubset() {
    return this._cloneAndUpdate(typeVar => typeVar.canReadSubset);
  }

  get canWriteSuperset() {
    return this._cloneAndUpdate(typeVar => typeVar.canWriteSuperset);
  }

  isMoreSpecificThan(other) {
    if (this.handles.length !== other.handles.length ||
        this.slots.length !== other.slots.length) {
      return false;
    }
    // TODO: should probably confirm that handles and slots actually match.
    for (let i = 0; i < this.typeVars.length; i++) {
      const thisTypeVar = this.typeVars[i];
      const otherTypeVar = other.typeVars[i];
      if (!thisTypeVar.object[thisTypeVar.field].isMoreSpecificThan(
              otherTypeVar.object[otherTypeVar.field])) {
        return false;
      }
    }
    return true;
  }

  _applyExistenceTypeTest(test) {
    for (const typeRef of this.typeVars) {
      if (test(typeRef.object[typeRef.field])) {
        return true;
      }
    }

    return false;
  }

  _handlesToManifestString() {
    return this.handles
      .map(handle => {
        const type = handle.type.resolvedType();
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
    const handles = data.handles.map(handle => ({type: _fromLiteral(handle.type), name: _fromLiteral(handle.name), direction: _fromLiteral(handle.direction)}));
    const slots = data.slots.map(slot => ({name: _fromLiteral(slot.name), direction: _fromLiteral(slot.direction), isRequired: _fromLiteral(slot.isRequired), isSet: _fromLiteral(slot.isSet)}));
    return new Shape(data.name, handles, slots);
  }

  toLiteral() {
    const handles = this.handles.map(handle => ({type: _toLiteral(handle.type), name: _toLiteral(handle.name), direction: _toLiteral(handle.direction)}));
    const slots = this.slots.map(slot => ({name: _toLiteral(slot.name), direction: _toLiteral(slot.direction), isRequired: _toLiteral(slot.isRequired), isSet: _toLiteral(slot.isSet)}));
    return {name: this.name, handles, slots};
  }

  clone(variableMap) : Shape {
    const handles = this.handles.map(({name, direction, type}) => ({name, direction, type: type ? type.clone(variableMap) : undefined}));
    const slots = this.slots.map(({name, direction, isRequired, isSet}) => ({name, direction, isRequired, isSet}));
    return new Shape(this.name, handles, slots);
  }

  cloneWithResolutions(variableMap) {
    return this._cloneWithResolutions(variableMap);
  }

  _cloneWithResolutions(variableMap) {
    const handles = this.handles.map(({name, direction, type}) => ({name, direction, type: type ? type._cloneWithResolutions(variableMap) : undefined}));
    const slots = this.slots.map(({name, direction, isRequired, isSet}) => ({name, direction, isRequired, isSet}));
    return new Shape(this.name, handles, slots);
  }

  canEnsureResolved() {
    for (const typeVar of this.typeVars) {
      if (!typeVar.object[typeVar.field].canEnsureResolved()) {
        return false;
      }
    }
    return true;
  }

  maybeEnsureResolved() {
    for (const typeVar of this.typeVars) {
      let variable = typeVar.object[typeVar.field];
      variable = variable.clone(new Map());
      if (!variable.maybeEnsureResolved()) return false;
    }
    for (const typeVar of this.typeVars) {
      typeVar.object[typeVar.field].maybeEnsureResolved();
    }
    return true;
  }

  tryMergeTypeVariablesWith(other) {
    // Type variable enabled slot matching will Just Work when we
    // unify slots and handles.
    if (!this._equalItems(other.slots, this.slots, this._equalSlot)) {
      return null;
    }
    if (other.handles.length !== this.handles.length) {
      return null;
    }

    const handles = new Set(this.handles);
    const otherHandles = new Set(other.handles);
    const handleMap = new Map();
    let sizeCheck = handles.size;
    while (handles.size > 0) {
      const handleMatches = [...handles.values()].map(
        handle => ({handle, match: [...otherHandles.values()].filter(otherHandle =>this._equalHandle(handle, otherHandle))}));

      for (const handleMatch of handleMatches) {
        // no match!
        if (handleMatch.match.length === 0) {
          return null;
        }
        if (handleMatch.match.length === 1) {
          handleMap.set(handleMatch.handle, handleMatch.match[0]);
          otherHandles.delete(handleMatch.match[0]);
          handles.delete(handleMatch.handle);
        }
      }
      // no progress!
      if (handles.size === sizeCheck) {
        return null;
      }
      sizeCheck = handles.size;
    }

    const handleList = [];
    for (const handle of this.handles) {
      const otherHandle = handleMap.get(handle);
      let resultType;
      if (handle.type.hasVariable || otherHandle.type.hasVariable) {
        resultType = TypeChecker._tryMergeTypeVariable(handle.type, otherHandle.type);
        if (!resultType) {
          return null;
        }
      } else {
        resultType = handle.type || otherHandle.type;
      }
      handleList.push({name: handle.name || otherHandle.name, direction: handle.direction || otherHandle.direction, type: resultType});
    }
    const slots = this.slots.map(({name, direction, isRequired, isSet}) => ({name, direction, isRequired, isSet}));
    return new Shape(this.name, handleList, slots);
  }

  resolvedType() {
    return this._cloneAndUpdate(typeVar => typeVar.resolvedType());
  }

  equals(other) {
    if (this.handles.length !== other.handles.length) {
      return false;
    }

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
    return handle.name === otherHandle.name && handle.direction === otherHandle.direction && handle.type.equals(otherHandle.type);
  }

  _equalSlot(slot, otherSlot) {
    return slot.name === otherSlot.name && slot.direction === otherSlot.direction && slot.isRequired === otherSlot.isRequired && slot.isSet === otherSlot.isSet;
  }

  _equalItems(otherItems, items, compareItem) {
    for (const otherItem of otherItems) {
      let exists = false;
      for (const item of items) {
        if (compareItem(item, otherItem)) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        return false;
      }
    }

    return true;
  }

  _cloneAndUpdate(update) {
    const copy = this.clone(new Map());
    copy.typeVars.forEach(typeVar => Shape._updateTypeVar(typeVar, update));
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
    if (Shape.mustMatch(shapeHandle.name) &&
        shapeHandle.name !== particleHandle.name) {
      return false;
    }
    // TODO: direction subsetting?
    if (Shape.mustMatch(shapeHandle.direction) &&
        shapeHandle.direction !== particleHandle.direction) {
      return false;
    }
    if (shapeHandle.type == undefined) {
      return true;
    }
    if (shapeHandle.type.isVariableReference) {
      return false;
    }
    const [left, right] = Type.unwrapPair(shapeHandle.type, particleHandle.type);
    if (left.isVariable) {
      return [{var: left, value: right, direction: shapeHandle.direction}];
    } else {
      return left.equals(right);
    }

  }

  static slotsMatch(shapeSlot, particleSlot) {
    if (Shape.mustMatch(shapeSlot.name) &&
        shapeSlot.name !== particleSlot.name) {
      return false;
    }
    if (Shape.mustMatch(shapeSlot.direction) &&
        shapeSlot.direction !== particleSlot.direction) {
      return false;
    }
    if (Shape.mustMatch(shapeSlot.isRequired) &&
        shapeSlot.isRequired !== particleSlot.isRequired) {
      return false;
    }
    if (Shape.mustMatch(shapeSlot.isSet) &&
        shapeSlot.isSet !== particleSlot.isSet) {
      return false;
    }
    return true;
  }

  particleMatches(particleSpec) {
    const shape = this.cloneWithResolutions(new Map());
    return shape.restrictType(particleSpec) !== false;
  }

  restrictType(particleSpec) {
    return this._restrictThis(particleSpec);
  }

  _restrictThis(particleSpec) {

    const handleMatches = this.handles.map(
      handle => particleSpec.connections.map(connection => ({match: connection, result: Shape.handlesMatch(handle, connection)}))
                                      .filter(a => a.result !== false));

    const particleSlots = [];
    particleSpec.slots.forEach(consumedSlot => {
      particleSlots.push({name: consumedSlot.name, direction: 'consume', isRequired: consumedSlot.isRequired, isSet: consumedSlot.isSet});
      consumedSlot.providedSlots.forEach(providedSlot => {
        particleSlots.push({name: providedSlot.name, direction: 'provide', isRequired: false, isSet: providedSlot.isSet});
      });
    });
    let slotMatches = this.slots.map(slot => particleSlots.filter(particleSlot => Shape.slotsMatch(slot, particleSlot)));
    slotMatches = slotMatches.map(matchList => matchList.map(slot => ({match: slot, result: true})));

    const exclusions = [];

    // TODO: this probably doesn't deal with multiple match options.
    function choose(list, exclusions) {
      if (list.length === 0) {
        return [];
      }
      const thisLevel = list.pop();
      for (const connection of thisLevel) {
        if (exclusions.includes(connection.match)) {
          continue;
        }
        const newExclusions = exclusions.slice();
        newExclusions.push(connection.match);
        const constraints = choose(list, newExclusions);
        if (constraints !== false) {
          return connection.result.length ? constraints.concat(connection.result) : constraints;
        }
      }

      return false;
    }

    const handleOptions = choose(handleMatches, []);
    const slotOptions = choose(slotMatches, []);

    if (handleOptions === false || slotOptions === false) {
      return false;
    }

    for (const constraint of handleOptions) {
      if (!constraint.var.variable.resolution) {
        constraint.var.variable.resolution = constraint.value;
      } else if (constraint.var.variable.resolution.isVariable) {
        // TODO(shans): revisit how this should be done,
        // consider reusing tryMergeTypeVariablesWith(other).
        if (!TypeChecker.processTypeList(constraint.var, [{
            type: constraint.value, direction: constraint.direction}])) return false;
      } else {
        if (!constraint.var.variable.resolution.equals(constraint.value)) return false;
      }
    }

    return this;
  }
}

import {Type} from './type.js';
import {TypeChecker} from '../recipe/type-checker.js';
