// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../platform/assert-web.js';
import {compareStrings, compareArrays, compareComparables} from './util.js';
import {TypeChecker} from './type-checker.js';
import {Type} from '../type.js';
import {Recipe} from './recipe.js';
import {HandleConnection} from './handle-connection.js';
import {ParticleSpec} from '../particle-spec.js';

type Fate = 'use' | 'create' | 'map' | 'copy' | '?' | '`slot';

export class Handle {
  private readonly _recipe: Recipe;
  private _id: string | null = null;
  private _localName: string | undefined = undefined;
  private _tags: string[] = [];
  _type: Type | undefined = undefined;
  private _fate: Fate | null = null;
  // TODO: replace originalFate and originalId with more generic mechanism for tracking
  // how and from what the recipe was generated.
  private _originalFate: Fate | null = null;
  private _originalId: string | null = null;
  private _connections: HandleConnection[] = [];
  private _mappedType: Type | undefined = undefined;
  private _storageKey: string | undefined = undefined;
  private _pattern: string | undefined = undefined;
  // Value assigned in the immediate mode, E.g. hostedParticle = ShowProduct
  // Currently only supports ParticleSpec.
  private _immediateValue: ParticleSpec | undefined = undefined;

  constructor(recipe: Recipe) {
    assert(recipe);
    this._recipe = recipe;
  }

  _copyInto(recipe: Recipe) {
    let handle = undefined;
    if (this._id !== null && ['map', 'use', 'copy'].includes(this.fate)) {
      handle = recipe.findHandle(this._id);
    }

    if (handle == undefined) {
      handle = recipe.newHandle();
      handle._id = this._id;
      handle._tags = [...this._tags];
      handle._type = this._type ? Type.fromLiteral(this._type.toLiteral()) : undefined;
      handle._fate = this._fate;
      handle._originalFate = this._originalFate;
      handle._originalId = this._originalId;
      handle._mappedType = this._mappedType;
      handle._storageKey = this._storageKey;
      handle._immediateValue = this._immediateValue;

      // the connections are re-established when Particles clone their
      // attached HandleConnection objects.
      handle._connections = [];
      handle._pattern = this._pattern;
    }
    return handle;
  }

  // Merges `this` recipe handle into `handle`
  mergeInto(handle) {
    assert(this.recipe === handle.recipe, 'Cannot merge handles from different recipes.');
    while (this.connections.length > 0) {
      const [connection] = this.connections;
      connection.disconnectHandle();
      connection.connectToHandle(handle);
    }
    handle._immediateValue = this._immediateValue;
    handle.tags = handle.tags.concat(this.tags);
    handle.recipe.removeHandle(this);
    handle.fate = this._mergedFate([this.fate, handle.fate]);
  }

  _mergedFate(fates) {
    assert(fates.length > 0, `Cannot merge empty fates list`);
    // Merging handles only used in coalesce-recipe strategy, which is only done for use/create/? fates.
    assert(!fates.includes('map') && !fates.includes('copy'), `Merging map/copy not supported yet`);

    // If all fates were `use` keep their fate, otherwise set to `create`.
    return fates.every(fate => fate === 'use') ? 'use' : 'create';
  }

  _startNormalize() {
    this._localName = null;
    this._tags.sort();
    // TODO: type?
  }

  _finishNormalize() {
    for (const connection of this._connections) {
      assert(Object.isFrozen(connection), `Handle connection '${connection.name}' is not frozen.`);
    }
    this._connections.sort(compareComparables);
    Object.freeze(this);
  }

  _compareTo(other) {
    let cmp;
    if ((cmp = compareStrings(this._id, other._id)) !== 0) return cmp;
    if ((cmp = compareStrings(this._localName, other._localName)) !== 0) return cmp;
    if ((cmp = compareArrays(this._tags, other._tags, compareStrings)) !== 0) return cmp;
    // TODO: type?
    if ((cmp = compareStrings(this.fate, other.fate)) !== 0) return cmp;
    if ((cmp = compareStrings(
        this._immediateValue && this._immediateValue.toString() || '',
        other._immediateValue && other._immediateValue.toString() || '')) !== 0) return cmp;
    return 0;
  }

  // a resolved Handle has either an id or create=true
  get fate() { return this._fate || '?'; }
  set fate(fate) {
    if (this._originalFate == null) {
      this._originalFate = this._fate;
    }
    this._fate = fate;
  }
  get originalFate() { return this._originalFate || '?'; }
  get originalId(): string | null { return this._originalId; }
  get recipe(): Recipe { return this._recipe; }
  get tags(): string[] { return this._tags; } // only tags owned by the handle
  set tags(tags: string[]) { this._tags = tags; }
  get type(): Type { return this._type; } // nullable
  get id(): string | null { return this._id; }
  set id(id: string| null) {
    if (!this._originalId) {
      this._originalId = this._id;
    }
    this._id = id;
  }
  mapToStorage(storage) {
    this._id = storage.id;
    this._originalId = storage.originalId;
    this._type = undefined;
    this._mappedType = storage.type;
    this._storageKey = storage.storageKey;
  }
  get localName() { return this._localName; }
  set localName(name) { this._localName = name; }
  get connections() { return this._connections; } // HandleConnection*
  get storageKey() { return this._storageKey; }
  set storageKey(key) { this._storageKey = key; }
  get pattern() { return this._pattern; }
  set pattern(pattern) { this._pattern = pattern; }
  get mappedType() { return this._mappedType; }
  set mappedType(mappedType: Type) { this._mappedType = mappedType; }
  get immediateValue() { return this._immediateValue; }
  set immediateValue(value) { this._immediateValue = value; }

  static effectiveType(handleType, connections) {
    const variableMap = new Map();
    // It's OK to use _cloneWithResolutions here as for the purpose of this test, the handle set + handleType
    // contain the full set of type variable information that needs to be maintained across the clone.
    const typeSet = connections.filter(connection => connection.type != null).map(connection => ({type: connection.type._cloneWithResolutions(variableMap), direction: connection.direction}));
    return TypeChecker.processTypeList(handleType ? handleType._cloneWithResolutions(variableMap) : null, typeSet);
  }

  static resolveEffectiveType(handleType, connections) {
    const typeSet = connections.filter(connection => connection.type != null).map(connection => ({type: connection.type, direction: connection.direction}));
    return TypeChecker.processTypeList(handleType, typeSet);
  }

  _isValid(options) {
    const tags = new Set();
    for (const connection of this._connections) {
      // A remote handle cannot be connected to an output param.
      if (this.fate === 'map' && ['out', 'inout'].includes(connection.direction)) {
        if (options && options.errors) {
          options.errors.set(this, `Invalid fate '${this.fate}' for handle '${this}'; it is used for '${connection.direction}' ${connection.getQualifiedName()} connection`);
        }
        return false;
      }
      connection.tags.forEach(tag => tags.add(tag));
    }
    const type = Handle.resolveEffectiveType(this._mappedType, this._connections);
    if (type) {
      this._type = type;
      this._tags.forEach(tag => tags.add(tag));
      this._tags = [...tags];
      return true;
    }
    if (options && options.errors) {
      // TODO: pass options to TypeChecker.processTypeList for better error.
      options.errors.set(this, `Type validations failed for handle '${this}'`);
    }
    return false;
  }

  isResolved(options = undefined) {
    assert(Object.isFrozen(this));
    let resolved = true;
    if (this.type) {
      let mustBeResolved = true;
      if (this.fate === 'create' || this.fate === '`slot') {
        mustBeResolved = false;
      }
      if ((mustBeResolved && !this.type.isResolved()) || !this.type.canEnsureResolved()) {
        if (options) {
          options.details.push('unresolved type');
        }
        resolved = false;
      }
    } else {
      if (options) {
        options.details.push('missing type');
      }
      resolved = false;
    }

    switch (this.fate) {
      case '?': {
        if (options) {
          options.details.push('missing fate');
        }
        resolved = false;
        break;
      }
      case 'copy':
      case 'map':
      case 'use': {
        if (options && this.id === null) {
          options.details.push('missing id');
        }
        resolved = resolved && (this.id !== null);
        break;
      }
      case '`slot':
      case 'create':
        break;
      default: {
        if (options) {
          options.details.push(`invalid fate ${this.fate}`);
        }
        throw new Error(`Unexpected fate: ${this.fate}`);
      }
    }
    return resolved;
  }

  toString(nameMap, options) {
    if (this._immediateValue) {
      // Immediate Value handles are only rendered inline with particle connections.
      // E.g. hostedParticle = ShowProduct
      return undefined;
    }
    options = options || {};
    // TODO: type? maybe output in a comment
    const result = [];
    result.push(this.fate);
    if (this.id) {
      result.push(`'${this.id}'`);
    }
    result.push(...this.tags.map(a => `#${a}`));
    result.push(`as ${(nameMap && nameMap.get(this)) || this.localName}`);
    if (this.type) {
      result.push('//');
      if (this.type.isResolved()) {
        result.push(this.type.resolvedType().toString({hideFields: options.hideFields == undefined ? true: options.hideFields}));
      } else {
        // TODO: include the unresolved constraints in toString (ie in the hash).
        result.push(this.type.toString());
        if (options.showUnresolved && this.type.canEnsureResolved()) {
          const type = Type.fromLiteral(this.type.toLiteral());
          type.maybeEnsureResolved();
          result.push('//');
          result.push(type.resolvedType().toString({hideFields: options.hideFields == undefined ? true: options.hideFields}));
        }
      }
    }
    if (options.showUnresolved) {
      const unresolvedOptions = {details: []};
      if (!this.isResolved(unresolvedOptions)) {
        result.push(` // unresolved handle: ${unresolvedOptions.details.join(', ')}`);
      }
    }

    return result.join(' ');
  }

  findConnectionByDirection(dir:string) {
    return this._connections.find(conn => conn.direction === dir);
  }
}
