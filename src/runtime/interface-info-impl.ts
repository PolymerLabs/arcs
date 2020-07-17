/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Predicate} from '../runtime/hot.js';
import {TypeChecker} from './recipe/type-checker.js';
import {Type, TypeVariable, TypeLiteral, HandleConnection, Slot, InterfaceInfo,
        TypeVarReference, HandleConnectionLiteral, SlotLiteral,
        InterfaceInfoLiteral, MatchResult} from './type.js';
import * as AstNode from './manifest-ast-nodes.js';
import {ParticleSpec} from './particle-spec.js';
import {ManifestStringBuilder} from './manifest-string-builder.js';

const handleConnectionFields = ['type', 'name', 'direction'];
const slotFields = ['name', 'direction', 'isRequired', 'isSet'];

function _typeVarOrStringFromLiteral(member: TypeLiteral | string): TypeVariable | string {
  if (typeof member === 'object') {
    return Type.fromLiteral(member) as TypeVariable;
  }
  return member;
}

function _HandleConnectionFromLiteral({type, name, direction}: HandleConnectionLiteral): HandleConnection {
  return {
    type: type ? Type.fromLiteral(type) : undefined,
    name: name ?  _typeVarOrStringFromLiteral(name) : undefined,
    direction: direction || 'any'
  };
}

function _SlotFromLiteral({name, direction, isRequired, isSet}: SlotLiteral): Slot {
  return {
    name: name ? _typeVarOrStringFromLiteral(name) : undefined,
    direction, isRequired, isSet
  };
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

function _HandleConnectionToLiteral({type, name, direction}: HandleConnection): HandleConnectionLiteral {
  return {
    type: type && _typeToLiteral(type),
    name: name && _typeVarOrStringToLiteral(name),
    direction
  };
}

function _SlotToLiteral({name, direction, isRequired, isSet}:Slot): SlotLiteral {
  return {
    name: name && _typeVarOrStringToLiteral(name),
    direction,
    isRequired,
    isSet
  };
}

class InterfaceInfoImpl extends InterfaceInfo {

  constructor(name: string, handleConnections: HandleConnection[], slots: Slot[]) {
    super(name, handleConnections, slots);
    for (const handleConnection of handleConnections) {
      for (const field of handleConnectionFields) {
        if (InterfaceInfo.isTypeVar(handleConnection[field])) {
          this.typeVars.push({object: handleConnection, field});
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

  static makeImpl(name: string, handleConnections: HandleConnection[], slots: Slot[]) {
    return new InterfaceInfoImpl(name, handleConnections, slots);
  }

  static fromLiteral(data: InterfaceInfoLiteral) : InterfaceInfo {
    const handleConnections = data.handleConnections.map(_HandleConnectionFromLiteral);
    const slots = data.slots.map(_SlotFromLiteral);
    return new InterfaceInfoImpl(data.name, handleConnections, slots);
  }

  toLiteral(): InterfaceInfoLiteral {
    const handleConnections = this.handleConnections.map(_HandleConnectionToLiteral);
    const slots = this.slots.map(_SlotToLiteral);
    return {name: this.name, handleConnections, slots};
  }  get canReadSubset() : InterfaceInfo {
    return this._cloneAndUpdate(typeVar => typeVar.canReadSubset);
  }

  get canWriteSuperset() : InterfaceInfo {
    return this._cloneAndUpdate(typeVar => typeVar.canWriteSuperset);
  }

  isAtLeastAsSpecificAs(other: InterfaceInfo) : boolean {
    if (this.handleConnections.length !== other.handleConnections.length ||
        this.slots.length !== other.slots.length) {
      return false;
    }
    // TODO: should probably confirm that handleConnections and slots actually match.
    for (let i = 0; i < this.typeVars.length; i++) {
      const thisTypeVar = this.typeVars[i];
      const otherTypeVar = other.typeVars[i];
      if (!thisTypeVar.object[thisTypeVar.field].isAtLeastAsSpecificAs(
              otherTypeVar.object[otherTypeVar.field])) {
        return false;
      }
    }
    return true;
  }

  _applyExistenceTypeTest(test: Predicate<TypeVarReference>) : boolean {
    for (const typeRef of this.typeVars) {
      if (test(typeRef.object[typeRef.field])) {
        return true;
      }
    }

    return false;
  }

  _handleConnectionsToManifestString(builder: ManifestStringBuilder) {
    builder.push(...this.handleConnections.map(h => {
      const parts = [];
      if (h.name) {
        parts.push(`${h.name}:`);
      }
      if (h.direction !== undefined && h.direction !== 'any') {
        parts.push(h.direction);
      }
      parts.push(h.type.toString());
      return parts.join(' ');
    }));
  }

  _slotsToManifestString(builder: ManifestStringBuilder) {
    // TODO deal with isRequired
    builder.push(...this.slots.map(slot => {
      const nameStr = slot.name ? `${slot.name}: ` : '';
      return `${nameStr}${slot.direction}${slot.isRequired ? '' : '?'} ${slot.isSet ? '[Slot]' : 'Slot'}`;
    }));
  }
  // TODO: Include name as a property of the interface and normalize this to just toString()
  toManifestString(builder = new ManifestStringBuilder()) : string {
    builder.push(`interface ${this.name}`);
    builder.withIndent(builder => {
      this._handleConnectionsToManifestString(builder);
      this._slotsToManifestString(builder);
    });
    return builder.toString();
  }

  clone(variableMap: Map<string, Type>) : InterfaceInfo {
    const handleConnections = this.handleConnections.map(({name, direction, type}) => ({name, direction, type: type ? type.clone(variableMap) : undefined}));
    const slots = this.slots.map(({name, direction, isRequired, isSet}) => ({name, direction, isRequired, isSet}));
    return new InterfaceInfoImpl(this.name, handleConnections, slots);
  }

  cloneWithResolutions(variableMap: Map<string, Type>) {
    return this._cloneWithResolutions(variableMap);
  }

  _cloneWithResolutions(variableMap: Map<string, Type>) {
    const handleConnections = this.handleConnections.map(({name, direction, type}) => ({name, direction, type: type ? type._cloneWithResolutions(variableMap) : undefined}));
    const slots = this.slots.map(({name, direction, isRequired, isSet}) => ({name, direction, isRequired, isSet}));
    return new InterfaceInfoImpl(this.name, handleConnections, slots);
  }

  canEnsureResolved() : boolean {
    for (const typeVar of this.typeVars) {
      if (!typeVar.object[typeVar.field].canEnsureResolved()) {
        return false;
      }
    }
    return true;
  }

  maybeEnsureResolved() : boolean {
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
    // unify slots and handleConnections.
    if (!this._equalItems(other.slots, this.slots, this._equalSlot)) {
      return null;
    }
    if (other.handleConnections.length !== this.handleConnections.length) {
      return null;
    }

    const handleConnections = new Set(this.handleConnections);
    const otherHandleConnections = new Set(other.handleConnections);
    const handleConnectionMap = new Map<HandleConnection, HandleConnection>();
    let sizeCheck = handleConnections.size;
    while (handleConnections.size > 0) {
      const handleConnectionMatches = [...handleConnections.values()].map(
        handleConnection => ({handleConnection, match: [...otherHandleConnections.values()].filter(otherHandleConnection =>this._equalHandleConnection(handleConnection, otherHandleConnection))}));

      for (const handleConnectionMatch of handleConnectionMatches) {
        // no match!
        if (handleConnectionMatch.match.length === 0) {
          return null;
        }
        if (handleConnectionMatch.match.length === 1) {
          handleConnectionMap.set(handleConnectionMatch.handleConnection, handleConnectionMatch.match[0]);
          otherHandleConnections.delete(handleConnectionMatch.match[0]);
          handleConnections.delete(handleConnectionMatch.handleConnection);
        }
      }
      // no progress!
      if (handleConnections.size === sizeCheck) {
        return null;
      }
      sizeCheck = handleConnections.size;
    }

    const handleConnectionList: HandleConnection[] = [];
    for (const handleConnection of this.handleConnections) {
      const otherHandleConnection = handleConnectionMap.get(handleConnection);
      let resultType: Type;
      if (handleConnection.type.hasVariable || otherHandleConnection.type.hasVariable) {
        resultType = TypeChecker._tryMergeTypeVariable(handleConnection.type, otherHandleConnection.type);
        if (!resultType) {
          return null;
        }
      } else {
        resultType = handleConnection.type || otherHandleConnection.type;
      }
      handleConnectionList.push({name: handleConnection.name || otherHandleConnection.name, direction: handleConnection.direction || otherHandleConnection.direction, type: resultType});
    }
    const slots = this.slots.map(({name, direction, isRequired, isSet}) => ({name, direction, isRequired, isSet}));
    return new InterfaceInfoImpl(this.name, handleConnectionList, slots);
  }

  resolvedType() : InterfaceInfo {
    return this._cloneAndUpdate(typeVar => typeVar.resolvedType());
  }

  equals(other: InterfaceInfo) : boolean {
    if (this.handleConnections.length !== other.handleConnections.length) {
      return false;
    }

    // TODO: this isn't quite right as it doesn't deal with duplicates properly
    if (!this._equalItems(other.handleConnections, this.handleConnections, this._equalHandleConnection)) {
      return false;
    }

    if (!this._equalItems(other.slots, this.slots, this._equalSlot)) {
      return false;
    }
    return true;
  }

  _equalHandleConnection(handleConnection: HandleConnection, otherHandleConnection: HandleConnection) {
    return handleConnection.name === otherHandleConnection.name
      && handleConnection.direction === otherHandleConnection.direction
      && TypeChecker.compareTypes({type: handleConnection.type}, {type: otherHandleConnection.type});
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

  static handleConnectionsMatch(interfaceHandleConnection: HandleConnection, particleHandleConnection: HandleConnection): boolean|MatchResult[] {
    if (InterfaceInfo.mustMatch(interfaceHandleConnection.name) &&
        interfaceHandleConnection.name !== particleHandleConnection.name) {
      return false;
    }
    // TODO: FIXME direction subsetting?

    if (InterfaceInfo.mustMatch(interfaceHandleConnection.direction)
        && interfaceHandleConnection.direction !== 'any'
        && particleHandleConnection.direction !== 'any'
        && interfaceHandleConnection.direction !== particleHandleConnection.direction) {
      return false;
    }
    if (interfaceHandleConnection.type == undefined) {
      return true;
    }
    const [left, right] = Type.unwrapPair(interfaceHandleConnection.type, particleHandleConnection.type);
    if (left instanceof TypeVariable) {
      return [{var: left, value: right, direction: interfaceHandleConnection.direction}];
    } else {
      return TypeChecker.compareTypes({type: left}, {type: right});
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
    const handleConnectionMatches = this.handleConnections.map(h => particleSpec.handleConnections.map(c => ({match: c, result: InterfaceInfo.handleConnectionsMatch(h, c)}))
                              .filter(a => a.result !== false)
    );

    const particleSlots: Slot[] = [];
    particleSpec.slotConnections.forEach(consumedSlot => {
      particleSlots.push({name: consumedSlot.name, direction: 'consumes', isRequired: consumedSlot.isRequired, isSet: consumedSlot.isSet});
      consumedSlot.provideSlotConnections.forEach(providedSlot => {
        particleSlots.push({name: providedSlot.name, direction: 'provides', isRequired: false, isSet: providedSlot.isSet});
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

    const handleConnectionOptions = choose(handleConnectionMatches, []);
    const slotOptions = choose(slotMatches, []);

    if (handleConnectionOptions === false || slotOptions === false) {
      return false;
    }

    for (const constraint of handleConnectionOptions) {
      if (!constraint.var.variable.resolution) {
        constraint.var.variable.resolution = constraint.value;
      } else if (constraint.var.variable.resolution instanceof TypeVariable) {
        // TODO(shans): revisit how this should be done,
        // consider reusing tryMergeTypeVariablesWith(other).
        if (!TypeChecker.processTypeList(constraint.var, [{
            type: constraint.value, direction: constraint.direction}])) return false;
      } else {
        if (!TypeChecker.compareTypes({type: constraint.var.variable.resolution}, {type: constraint.value})) {
          return false;
        }
      }
    }

    return true;
  }
}

InterfaceInfo.make = InterfaceInfoImpl.makeImpl;
InterfaceInfo.handleConnectionsMatch = InterfaceInfoImpl.handleConnectionsMatch;
InterfaceInfo.fromLiteral = InterfaceInfoImpl.fromLiteral;
InterfaceInfo.slotsMatch = InterfaceInfoImpl.slotsMatch;
