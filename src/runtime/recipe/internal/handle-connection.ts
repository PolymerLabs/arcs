/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/assert-web.js';
import {HandleConnectionSpec} from '../../arcs-types/particle-spec.js';
import {Type} from '../../../types/lib-types.js';
import {RELAXATION_KEYWORD} from '../../manifest-ast-types/manifest-ast-nodes.js';
import {acceptedDirections} from '../../arcs-types/direction-util.js';
import {Handle} from './handle.js';
import {SlotConnection} from './slot-connection.js';
import {Particle} from './particle.js';
import {CloneMap, Recipe, VariableMap} from './recipe.js';
import {TypeChecker} from '../../type-checker.js';
import {compareArrays, compareComparables, compareStrings, compareBools, Comparable} from '../../../utils/comparable.js';
import {Direction} from '../../arcs-types/enums.js';
import {HandleConnection as PublicHandleConnection, IsValidOptions, RecipeComponent, ToStringOptions} from './recipe-interface.js';

export class HandleConnection implements Comparable<HandleConnection>, PublicHandleConnection {
  private readonly _recipe: Recipe;
  private _name: string;
  private _tags: string[] = [];
  private resolvedType?: Type = undefined;
  private _direction: Direction = 'any';
  private _relaxed = false;
  private _particle: Particle;
  _handle?: Handle = undefined;

  constructor(name: string, particle: Particle) {
    assert(particle);
    assert(particle.recipe);
    this._recipe = particle.recipe;
    this._name = name;
    this._particle = particle;
  }

  get name(): string { return this._name; } // Parameter name?
  get recipe(): Recipe { return this._recipe; }
  get isOptional(): boolean { return this.spec !== null && this.spec.isOptional; }
  get spec(): HandleConnectionSpec {
    return this.particle.spec && this.particle.spec.handleConnectionMap.get(this.name);
  }
  get isInput(): boolean { return this.direction === 'reads' || this.direction === 'reads writes'; }
  get isOutput(): boolean { return this.direction === 'writes' || this.direction === 'reads writes'; }
  get handle(): Handle|undefined { return this._handle; } // Handle?
  get particle() { return this._particle; } // never null

  get relaxed() { return this._relaxed; }
  set relaxed(relaxed: boolean) { this._relaxed = relaxed; }

  get tags(): string[] { return this._tags; }
  set tags(tags: string[]) { this._tags = tags; }

  get type(): Type|undefined|null {
    if (this.resolvedType) {
      return this.resolvedType;
    }
    const spec = this.spec;
    // TODO: We need a global way to generate variables so that everything can
    // have proper type bounds.
    return spec ? spec.type : undefined;
  }
  set type(type: Type|undefined|null) {
    this.resolvedType = type;
    this._resetHandleType();
  }

  get direction(): Direction {
    // TODO: Should take the most strict of the direction and the spec direction.
    if (this._direction !== 'any') {
      return this._direction;
    }
    const spec = this.spec;
    return spec ? spec.direction : 'any';
  }
  set direction(direction: Direction) {
    if (direction === null) {
      throw new Error(`Invalid direction '${direction}' for handle connection '${this.getQualifiedName()}'`);
    }
    this._direction = direction;
    this._resetHandleType();
  }

  _clone(particle: Particle, cloneMap: CloneMap): HandleConnection {
    if (cloneMap.has(this)) {
      return cloneMap.get(this) as HandleConnection;
    }
    const handleConnection = new HandleConnection(this._name, particle);
    handleConnection._tags = [...this._tags];
    // Note: _resolvedType will be cloned later by the particle that references this connection.
    // Doing it there allows the particle to maintain variable associations across the particle
    // scope.
    handleConnection.resolvedType = this.resolvedType;
    handleConnection._direction = this._direction;
    handleConnection._relaxed = this._relaxed;
    if (this._handle != undefined) {
      handleConnection._handle = cloneMap.get(this._handle) as Handle;
      assert(handleConnection._handle !== undefined);
      handleConnection._handle.connections.push(handleConnection);
    }
    cloneMap.set(this, handleConnection);
    return handleConnection;
  }

  // Note: don't call this method directly, only called from particle cloning.
  cloneTypeWithResolutions(variableMap: VariableMap): void {
    if (this.resolvedType) {
      this.resolvedType = this.resolvedType._cloneWithResolutions(variableMap);
    }
  }

  _normalize(): void {
    this._tags.sort();
    // TODO: type?
    Object.freeze(this);
  }

  _compareTo(other: HandleConnection): number {
    let cmp: number;
    if ((cmp = compareComparables(this._particle, other._particle)) !== 0) return cmp;
    if ((cmp = compareStrings(this._name, other._name)) !== 0) return cmp;
    if ((cmp = compareArrays(this._tags, other._tags, compareStrings)) !== 0) return cmp;
    if ((cmp = compareComparables(this._handle, other._handle)) !== 0) return cmp;
    // TODO(cypher1): add type comparison
    // if ((cmp = compareStrings(this._type, other._type)) != 0) return cmp;
    if ((cmp = compareStrings(this._direction, other._direction)) !== 0) return cmp;
    if ((cmp = compareBools(this._relaxed, other._relaxed)) !== 0) return cmp;
    return 0;
  }

  getQualifiedName(): string { return `${this.particle.name}::${this.name}`; }

  toSlotConnection(): SlotConnection {
    // TODO: Remove in SLANDLESv2
    if (!this.handle || this.handle.fate !== '`slot') {
      return undefined;
    }
    const slandle: SlotConnection = new SlotConnection(this.name, this.particle);
    slandle.tags = this.tags;
    slandle.targetSlot = this.handle && this.handle.toSlot();
    slandle.targetSlot.name = slandle.targetSlot.name || this.name;
    if (this.spec) {
      this.spec.dependentConnections.forEach(connSpec => {
        const conn = this.particle.getConnectionByName(connSpec.name);
        if (!conn) return;
        const slandleConn = conn.toSlotConnection();
        if (!slandleConn) return;
        assert(!slandle.providedSlots[conn.spec.name], `provided slot '${conn.spec.name}' already exists`);
        slandle.providedSlots[conn.spec.name] = slandleConn.targetSlot;
      });
    }
    return slandle;
  }

  _isValid(options: IsValidOptions): boolean {
    // Note: The following casts are necessary to catch invalid values that typescript does not manage to check).
    if (this.direction === null || this.direction === undefined) {
      if (options && options.errors) {
        options.errors.set(this, `Invalid direction '${this.direction}' for handle connection '${this.getQualifiedName()}'`);
      }
      return false;
    }
    if (this.particle.spec && this.name) {
      const connectionSpec = this.spec;
      if (!connectionSpec) {
        if (options && options.errors) {
          options.errors.set(this, `Connection ${this.name} is not defined by ${this.particle.name}.`);
        }
        return false;
      }
      if (!acceptedDirections(this.direction).includes(connectionSpec.direction)) {
        if (options && options.errors) {
          options.errors.set(this, `Direction '${this.direction}' for handle connection '${this.getQualifiedName()}' doesn't match particle spec's direction '${connectionSpec.direction}'`);
        }
        return false;
      }
      if (this.resolvedType) {
        if (!connectionSpec.isCompatibleType(this.resolvedType)) {
          if (options && options.errors) {
            options.errors.set(this, `Type '${this.resolvedType.toString()} for handle connection '${this.getQualifiedName()}' doesn't match particle spec's type '${connectionSpec.type.toString()}'`);
          }
          return false;
        }
    } else {
        this.resolvedType = connectionSpec.type;
      }
    }
    return true;
  }

  isResolved(options?): boolean {
    assert(Object.isFrozen(this));

    let parent: HandleConnection;
    if (this.spec && this.spec.parentConnection) {
      parent = this.particle.connections[this.spec.parentConnection.name];
      if (!parent) {
        if (options) {
          options.details = `parent connection '${this.spec.parentConnection.name}' missing`;
        }
        return false;
      }
      if (!parent.handle) {
        if (options) {
          options.details = `parent connection '${this.spec.parentConnection.name}' missing handle`;
        }
        return false;
      }
    }

    if (!this.handle) {
      if (this.isOptional) {
        // We're optional we don't need to resolve.
        return true;
      }
      // We're not optional we do need to resolve.
      if (options) {
        options.details = 'missing handle';
      }
      return false;
    }

    if (!this.direction) {
      if (options) {
        options.details = 'missing direction';
      }
      return false;
    }

    // TODO: This should use this._type, or possibly not consider type at all.
    if (!this.type) {
      if (options) {
        options.details = 'missing type';
      }
      return false;
    }
    return true;
  }

  private _resetHandleType(): void {
    if (this._handle) {
      this._handle._type = undefined;
    }
  }

  connectToHandle(handle: Handle): void {
    assert(handle.recipe === this.recipe);
    this._handle = handle;
    this._resetHandleType();
    this._handle.connections.push(this);
  }

  disconnectHandle(): void {
    const idx = this._handle.connections.indexOf(this);
    assert(idx >= 0);
    this._handle.connections.splice(idx, 1);
    this._handle = undefined;
  }

  toString(nameMap: Map<RecipeComponent, string>, options: ToStringOptions): string {
    const result: string[] = [];
    result.push(`${this.name || '*'}:`);
    // TODO(cypher1): support optionality.
    result.push(this.direction);
    result.push(this.relaxed ? RELAXATION_KEYWORD : '');
    if (this.handle) {
      if (this.handle.immediateValue) {
        result.push(this.handle.immediateValue.name);
      } else {
        result.push(`${(nameMap && nameMap.get(this.handle)) || this.handle.localName}`);
      }
    }
    result.push(...this.tags.map(a => `#${a}`));

    if (options && options.showUnresolved) {
      if (!this.isResolved(options)) {
        result.push(`// unresolved handle-connection: ${options.details}`);
      }
    }

    return result.filter(s => s !== '').join(' ');
  }

  // TODO: the logic is wrong :)
  findSpecsForUnnamedHandles() {
    return this.particle.spec.handleConnections.filter(specConn => {
          // filter specs with matching types that don't have handles bound to the corresponding handle connection.
          return !specConn.isOptional &&
                 TypeChecker.compareTypes({type: this.handle.type}, {type: specConn.type}) &&
                 !this.particle.getConnectionByName(specConn.name);
        });
  }
}
