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
import {HandleConnectionSpec} from '../particle-spec.js';
import {Type} from '../type.js';

import {Handle} from './handle.js';
import {Particle} from './particle.js';
import {Recipe} from './recipe.js';
import {TypeChecker} from './type-checker.js';
import {compareArrays, compareComparables, compareStrings} from './comparable.js';

import {Direction} from '../manifest-ast-nodes.js';

export class HandleConnection {
  private readonly _recipe: Recipe;
  private readonly _name: string;
  private _tags: string[] = [];
  private resolvedType: Type | undefined = undefined;
  private _direction: Direction | undefined = undefined;
  private _particle: Particle;
  _handle: Handle | undefined = undefined;

  constructor(name: string, particle: Particle) {
    assert(particle);
    assert(particle.recipe);
    this._recipe = particle.recipe;
    this._name = name;
    this._particle = particle;
  }

  _clone(particle: Particle, cloneMap) {
    if (cloneMap.has(this)) {
      return cloneMap.get(this);
    }
    const handleConnection = new HandleConnection(this._name, particle);
    handleConnection._tags = [...this._tags];
    // Note: _resolvedType will be cloned later by the particle that references this connection.
    // Doing it there allows the particle to maintain variable associations across the particle
    // scope.
    handleConnection.resolvedType = this.resolvedType;
    handleConnection._direction = this._direction;
    if (this._handle != undefined) {
      handleConnection._handle = cloneMap.get(this._handle);
      assert(handleConnection._handle !== undefined);
      handleConnection._handle.connections.push(handleConnection);
    }
    cloneMap.set(this, handleConnection);
    return handleConnection;
  }

  // Note: don't call this method directly, only called from particle cloning.
  cloneTypeWithResolutions(variableMap): void {
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
    let cmp;
    if ((cmp = compareComparables(this._particle, other._particle)) !== 0) return cmp;
    if ((cmp = compareStrings(this._name, other._name)) !== 0) return cmp;
    if ((cmp = compareArrays(this._tags, other._tags, compareStrings)) !== 0) return cmp;
    if ((cmp = compareComparables(this._handle, other._handle)) !== 0) return cmp;
    // TODO: add type comparison
    // if ((cmp = compareStrings(this._type, other._type)) != 0) return cmp;
    if ((cmp = compareStrings(this._direction, other._direction)) !== 0) return cmp;
    return 0;
  }

  get recipe(): Recipe { return this._recipe; }
  get name(): string { return this._name; } // Parameter name?
  getQualifiedName(): string { return `${this.particle.name}::${this.name}`; }
  get tags(): string[] { return this._tags; }

  get type() {
    if (this.resolvedType) {
      return this.resolvedType;
    }
    const spec = this.spec;
    return spec ? spec.type : null;
  }

  get direction(): Direction|undefined { // in/out/inout/host/consume/provide
    if (this._direction) {
      return this._direction;
    }
    const spec = this.spec;
    return spec ? spec.direction : null;
  }

  get isInput(): boolean {
    return this.direction === 'in' || this.direction === 'inout';
  }
  get isOutput(): boolean {
    return this.direction === 'out' || this.direction === 'inout';
  }
  get handle(): Handle|undefined { return this._handle; } // Handle?
  get particle() { return this._particle; } // never null

  set tags(tags: string[]) { this._tags = tags; }
  set type(type: Type) {
    this.resolvedType = type;
    this._resetHandleType();
  }

  set direction(direction) {
    this._direction = direction;
    this._resetHandleType();
  }

  get spec(): HandleConnectionSpec {
    if (this.particle.spec == null) {
      return null;
    }
    return this.particle.spec.handleConnectionMap.get(this.name);
  }

  get isOptional(): boolean {
    if (this.spec == null) {
      return false;
    }
    return this.spec.isOptional;
  }

  _isValid(options): boolean {
    if (this.direction && !['in', 'out', 'inout', 'host', '`consume', '`provide'].includes(this.direction)) {
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
      if (this.direction !== connectionSpec.direction &&
          !(['in', 'out'].includes(this.direction) && connectionSpec.direction === 'inout')) {
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

    let parent;
    if (this.spec && this.spec.parentConnection) {
      parent = this.particle.connections[this.spec.parentConnection.name];
      if (!parent || !parent.handle) {
        if (options) {
          options.details = 'parent connection missing handle';
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

  toString(nameMap, options): string {
    const result: string[] = [];
    result.push(this.name || '*');
    // TODO: better deal with unspecified direction.
    result.push({'in': '<-', 'out': '->', 'inout': '=', 'host': '=', '`consume': '<-', '`provide': '->'}[this.direction] || this.direction || '=');
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

    return result.join(' ');
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
