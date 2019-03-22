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

import {TypeChecker} from './recipe/type-checker.js';
import {Type, TypeVariable, TypeLiteral} from './type.js';
import {ParticleSpec} from './particle-spec.js';

function _typeFromLiteral(member: TypeLiteral): Type {
  return Type.fromLiteral(member);
}

function _typeVarOrStringFromLiteral(member: TypeLiteral | string): TypeVariable | string {
  if (typeof member === 'object') {
    return _typeFromLiteral(member) as TypeVariable;
  }
  return member;
}

function _HandleFromLiteral({type, name, direction}: HandleLiteral): Handle {
  const typel = type ? _typeFromLiteral(type) : undefined;
  const namel = name ?  _typeVarOrStringFromLiteral(name) : undefined;
  return {type: typel, name: namel, direction};
}

function _SlotFromLiteral({name, direction, isRequired, isSet}: SlotLiteral): Slot {
  const namel = name ? _typeVarOrStringFromLiteral(name) : undefined;
  return {name: namel, direction, isRequired, isSet};
}

function _typeToLiteral(member: Type): TypeLiteral {
  return member.toLiteral();
}

function _typeVarOrStringToLiteral(member: TypeVariable | string): TypeLiteral | string {
  if (member instanceof TypeVariable) {
    return member.toLiteral();
  }
  return member;
}

function _HandleToLiteral({type, name, direction}: Handle): HandleLiteral {
  const typel = type ? _typeToLiteral(type): undefined;
  const namel = name ? _typeVarOrStringToLiteral(name): undefined;
  return {type: typel, name: namel, direction};
}

function _SlotToLiteral({name, direction, isRequired, isSet}:Slot): SlotLiteral {
  const namel = name ? _typeVarOrStringToLiteral(name): undefined;
  return {name: namel, direction, isRequired, isSet};
}

const handleFields = ['type', 'name', 'direction'];
const slotFields = ['name', 'direction', 'isRequired', 'isSet'];

// TODO(lindner): type should be required, only not used in tests
interface Handle {
  type?: Type;
  name?: string|TypeVariable;
  direction?: string;
}

interface HandleLiteral {
  type?: TypeLiteral;
  name?: string|TypeLiteral;
  direction?: string;
}

// TODO(lindner) only tests use optional props
interface Slot {
  name?: string|TypeVariable;
  direction?: string;
  isRequired?: boolean;
  isSet?: boolean;
}

interface SlotLiteral {
  name?: string|TypeLiteral;
  direction?: string;
  isRequired?: boolean;
  isSet?: boolean;
}

interface TypeVarReference {
  object: Handle|Slot;
  field: string;
}

export interface InterfaceInfoLiteral {
  name: string;
  handles: HandleLiteral[];
  slots: SlotLiteral[];
}

type MatchResult = {var: TypeVariable, value: Type, direction: string};

export class InterfaceInfo {
  name: string;
  handles: Handle[];
  slots: Slot[];

  // TODO(lindner) only accessed in tests
  public readonly typeVars: TypeVarReference[];

  constructor(name: string, handles: Handle[], slots: Slot[]) {
    assert(name);
    assert(handles !== undefined);
    assert(slots !== undefined);
    this.name = name;
    this.handles = handles;
    this.slots = slots;
    this.typeVars = [];
    for (const handle of handles) {
      for (const field of handleFields) {
        if (InterfaceInfo.isTypeVar(handle[field])) {
          this.typeVars.push({object: handle, field});
        }
      }
    }

    for (const slot of slots) {
      for (const field of slotFields) {
        if (InterfaceInfo.isTypeVar(slot[field])) {
          this.typeVars.push({object: slot, field});
        }
      }
    }
  }

  toPrettyString(): string {
    return 'InterfaceInfo';
  }

  mergeTypeVariablesByName(variableMap: Map<string, Type>) {
    this.typeVars.map(({object, field}) => object[field] = (object[field] as Type).mergeTypeVariablesByName(variableMap));
  }

  get canReadSubset() {
    return this._cloneAndUpdate(typeVar => typeVar.canReadSubset);
  }

  get canWriteSuperset() {
    return this._cloneAndUpdate(typeVar => typeVar.canWriteSuperset);
  }

  isMoreSpecificThan(other: InterfaceInfo) {
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

  _applyExistenceTypeTest(test: (t: TypeVarReference) => boolean) {
    for (const typeRef of this.typeVars) {
      if (test(typeRef.object[typeRef.field])) {
        return true;
      }
    }

    return false;
  }

  _handlesToManifestString() {
    return this.handles
      .map(h => `  ${h.direction ? h.direction + ' ': ''}${h.type.toString()} ${h.name ? h.name : '*'}`)
      .join('\n');
  }

  _slotsToManifestString() {
    // TODO deal with isRequired
    return this.slots
      .map(slot => `  ${slot.direction} ${slot.isSet ? 'set of ' : ''}${slot.name ? slot.name + ' ' : ''}`)
      .join('\n');
  }
  // TODO: Include name as a property of the interface and normalize this to just toString()
  toString() {
    return `interface ${this.name}
${this._handlesToManifestString()}
${this._slotsToManifestString()}`;
  }

  static fromLiteral(data: InterfaceInfoLiteral) {
    const handles = data.handles.map(_HandleFromLiteral);
    const slots = data.slots.map(_SlotFromLiteral);
    return new InterfaceInfo(data.name, handles, slots);
  }

  toLiteral(): InterfaceInfoLiteral {
    const handles = this.handles.map(_HandleToLiteral);
    const slots = this.slots.map(_SlotToLiteral);
    return {name: this.name, handles, slots};
  }

  clone(variableMap: Map<string, Type>) : InterfaceInfo {
    const handles = this.handles.map(({name, direction, type}) => ({name, direction, type: type ? type.clone(variableMap) : undefined}));
    const slots = this.slots.map(({name, direction, isRequired, isSet}) => ({name, direction, isRequired, isSet}));
    return new InterfaceInfo(this.name, handles, slots);
  }

  cloneWithResolutions(variableMap: Map<string, Type>) {
    return this._cloneWithResolutions(variableMap);
  }

  _cloneWithResolutions(variableMap: Map<string, Type>) {
    const handles = this.handles.map(({name, direction, type}) => ({name, direction, type: type ? type._cloneWithResolutions(variableMap) : undefined}));
    const slots = this.slots.map(({name, direction, isRequired, isSet}) => ({name, direction, isRequired, isSet}));
    return new InterfaceInfo(this.name, handles, slots);
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

  tryMergeTypeVariablesWith(other: InterfaceInfo) {
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
    const handleMap = new Map<Handle, Handle>();
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

    const handleList: Handle[] = [];
    for (const handle of this.handles) {
      const otherHandle = handleMap.get(handle);
      let resultType: Type;
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
    return new InterfaceInfo(this.name, handleList, slots);
  }

  resolvedType() {
    return this._cloneAndUpdate(typeVar => typeVar.resolvedType());
  }

  equals(other: InterfaceInfo) {
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

  _equalHandle(handle: Handle, otherHandle: Handle) {
    return handle.name === otherHandle.name && handle.direction === otherHandle.direction && handle.type.equals(otherHandle.type);
  }

  _equalSlot(slot: Slot, otherSlot: Slot) {
    return slot.name === otherSlot.name && slot.direction === otherSlot.direction && slot.isRequired === otherSlot.isRequired && slot.isSet === otherSlot.isSet;
  }

  _equalItems<T>(otherItems: T[], items: T[], compareItem: (a: T, b: T) => boolean) {
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

  _cloneAndUpdate(update: (t: Type) => Type) {
    const copy = this.clone(new Map());
    copy.typeVars.forEach(typeVar => InterfaceInfo._updateTypeVar(typeVar, update));
    return copy;
  }

  static _updateTypeVar(typeVar: TypeVarReference, update: (t: Type) => Type): void {
    typeVar.object[typeVar.field] = update(typeVar.object[typeVar.field]);
  }

  static isTypeVar(reference: TypeVariable | Type | string | boolean): boolean {
    return reference instanceof TypeVariable || reference instanceof Type && reference.hasVariable;
  }

  static mustMatch(reference: TypeVariable | Type | string | boolean): boolean {
    return !(reference == undefined || InterfaceInfo.isTypeVar(reference));
  }

  static handlesMatch(interfaceHandle: Handle, particleHandle: Handle): boolean|MatchResult[] {
    if (InterfaceInfo.mustMatch(interfaceHandle.name) &&
        interfaceHandle.name !== particleHandle.name) {
      return false;
    }
    // TODO: direction subsetting?
    if (InterfaceInfo.mustMatch(interfaceHandle.direction) &&
        interfaceHandle.direction !== particleHandle.direction) {
      return false;
    }
    if (interfaceHandle.type == undefined) {
      return true;
    }
    const [left, right] = Type.unwrapPair(interfaceHandle.type, particleHandle.type);
    if (left instanceof TypeVariable) {
      return [{var: left, value: right, direction: interfaceHandle.direction}];
    } else {
      return left.equals(right);
    }
  }

  static slotsMatch(interfaceSlot: Slot, particleSlot: Slot): boolean {
    if (InterfaceInfo.mustMatch(interfaceSlot.name) &&
        interfaceSlot.name !== particleSlot.name) {
      return false;
    }
    if (InterfaceInfo.mustMatch(interfaceSlot.direction) &&
        interfaceSlot.direction !== particleSlot.direction) {
      return false;
    }
    if (InterfaceInfo.mustMatch(interfaceSlot.isRequired) &&
        interfaceSlot.isRequired !== particleSlot.isRequired) {
      return false;
    }
    if (InterfaceInfo.mustMatch(interfaceSlot.isSet) &&
        interfaceSlot.isSet !== particleSlot.isSet) {
      return false;
    }
    return true;
  }

  particleMatches(particleSpec: ParticleSpec): boolean {
    const interfaceInfo = this.cloneWithResolutions(new Map());
    return interfaceInfo.restrictType(particleSpec) !== false;
  }

  restrictType(particleSpec: ParticleSpec): boolean {
    return this._restrictThis(particleSpec);
  }
  
  _restrictThis(particleSpec: ParticleSpec): boolean {
    const handleMatches = this.handles.map(h => particleSpec.handleConnections.map(c => ({match: c, result: InterfaceInfo.handlesMatch(h, c)}))
                              .filter(a => a.result !== false)
    );

    const particleSlots: Slot[] = [];
    particleSpec.slotConnections.forEach(consumedSlot => {
      particleSlots.push({name: consumedSlot.name, direction: 'consume', isRequired: consumedSlot.isRequired, isSet: consumedSlot.isSet});
      consumedSlot.provideSlotConnections.forEach(providedSlot => {
        particleSlots.push({name: providedSlot.name, direction: 'provide', isRequired: false, isSet: providedSlot.isSet});
      });
    });
    const slotsThatMatch = this.slots.map(slot => particleSlots.filter(particleSlot => InterfaceInfo.slotsMatch(slot, particleSlot)));
    const slotMatches = slotsThatMatch.map(matchList => matchList.map(slot => ({match: slot, result: true})));

    interface Match<T> {
      match: T;
      result: boolean | MatchResult[];
    }

    // TODO: this probably doesn't deal with multiple match options.
    function choose<T>(list: Match<T>[][], exclusions: T[]): false | MatchResult[] {
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
          if (typeof connection.result === 'boolean') {
            return constraints;
          }
          return constraints.concat(connection.result);
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
      } else if (constraint.var.variable.resolution instanceof TypeVariable) {
        // TODO(shans): revisit how this should be done,
        // consider reusing tryMergeTypeVariablesWith(other).
        if (!TypeChecker.processTypeList(constraint.var, [{
            type: constraint.value, direction: constraint.direction}])) return false;
      } else {
        if (!constraint.var.variable.resolution.equals(constraint.value)) return false;
      }
    }

    return true;
  }
}
