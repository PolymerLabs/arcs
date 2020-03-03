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
import {ParticleSpec} from '../particle-spec.js';
import {Schema} from '../schema.js';
import {Type, TypeVariable, TypeVariableInfo} from '../type.js';
import {Slot} from './slot.js';
import {HandleConnection} from './handle-connection.js';
import {SlotConnection} from './slot-connection.js';
import {Ttl} from './ttl.js';
import {Recipe, CloneMap, RecipeComponent, IsResolvedOptions, IsValidOptions, ToStringOptions, VariableMap} from './recipe.js';
import {TypeChecker, TypeListInfo} from './type-checker.js';
import {compareArrays, compareComparables, compareStrings, Comparable} from './comparable.js';
import {Fate, Direction} from '../manifest-ast-nodes.js';
import {ClaimIsTag, Claim} from '../particle-claim.js';
import {StorageKey} from '../storageNG/storage-key.js';
import {Capabilities} from '../capabilities.js';

export class Handle implements Comparable<Handle> {
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
  private _associatedHandles: Handle[] = [];
  private _mappedType: Type | undefined = undefined;
  private _storageKey: StorageKey | undefined = undefined;
  capabilities: Capabilities;
  private _pattern: string | undefined = undefined;
  // Value assigned in the immediate mode, E.g. hostedParticle = ShowProduct
  // Currently only supports ParticleSpec.
  private _immediateValue: ParticleSpec | undefined = undefined;
  claims: Claim[] | undefined = undefined;
  private _ttl = Ttl.infinite;

  constructor(recipe: Recipe) {
    assert(recipe);
    this._recipe = recipe;
  }

  toSlot(): Slot {
    if (!this.type) {
      return undefined;
    }
    if (this.fate !== '`slot') {
      return undefined;
    }
    const slandle = new Slot(this.recipe, this.localName);
    slandle.tags = this.tags;
    slandle.id = this.id;

    const slotType = this.type.slandleType();
    if (slotType) {
      const slotInfo = slotType.getSlot();
      if (slotInfo) {
        slandle.formFactor = slotInfo.formFactor;
        if (slotInfo.handle) {
          // TODO(jopra): cannot assign slandle handles as the slots do not
          // actually track their handles but use a source particle connection
          // mapping.
          const particle = undefined;
          slandle.sourceConnection = new SlotConnection(slotInfo.handle, particle);
        }
      }
    }
    return slandle;
  }

  _copyInto(recipe: Recipe, cloneMap: CloneMap, variableMap: VariableMap) {
    let handle: Handle = undefined;
    if (this._id !== null && ['map', 'use', 'copy'].includes(this.fate)) {
      handle = recipe.findHandle(this._id);
    }

    if (handle == undefined) {
      handle = recipe.newHandle();
      handle._id = this._id;
      handle._tags = [...this._tags];
      handle._type = this._type ? this._type._cloneWithResolutions(variableMap) : undefined;
      handle._fate = this._fate;
      handle._originalFate = this._originalFate;
      handle._originalId = this._originalId;
      handle._mappedType = this._mappedType;
      handle._storageKey = this._storageKey;
      handle._immediateValue = this._immediateValue;
      handle.capabilities = this.capabilities ? this.capabilities.clone() : undefined;
      handle._ttl = this._ttl;
      // the connections are re-established when Particles clone their
      // attached HandleConnection objects.
      handle._connections = [];
      handle._pattern = this._pattern;
      handle._associatedHandles = this._associatedHandles.map(h => cloneMap.get(h) as Handle);
    }
    return handle;
  }

  // Merges `this` recipe handle into `handle`
  mergeInto(handle: Handle) {
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

  _mergedFate(fates: Fate[]) {
    assert(fates.length > 0, `Cannot merge empty fates list`);
    // Merging handles only used in coalesce-recipe strategy, which is only done for use/create/? fates.
    assert(!fates.some(f => f === 'map' || f === 'copy' || f === 'join'), `Merging map/copy/join not supported yet`);

    // If all fates were `use` keep their fate, otherwise set to `create`.
    return fates.every(fate => fate === 'use') ? 'use' : 'create';
  }

  _startNormalize() {
    this._localName = null;
    this._tags.sort();
    const isSlotType = (type: Type) => {
      const hasTypeWithoutFate = type && this._fate === '?';
      const supersetIsSlandle = type.canWriteSuperset && type.canWriteSuperset.slandleType();
      const subersetIsSlandle = type.canReadSubset && type.canReadSubset.slandleType();
      return hasTypeWithoutFate && (supersetIsSlandle || subersetIsSlandle);
    };
    const resolvedType = this.type.resolvedType();
    const collectionType = resolvedType && resolvedType.isCollectionType() && resolvedType.collectionType;
    if (isSlotType(resolvedType) || isSlotType(collectionType)) {
      this._fate = '`slot';
    }
  }

  _finishNormalize() {
    for (const connection of this._connections) {
      assert(Object.isFrozen(connection), `Handle connection '${connection.name}' is not frozen.`);
    }
    this._connections.sort(compareComparables);
    Object.freeze(this);
  }

  _compareTo(other: Handle): number {
    let cmp: number;
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
  set fate(fate: Fate) {
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
  mapToStorage(storage: {id: string, type: Type, originalId?: string, storageKey?: StorageKey, claims?: ClaimIsTag[]}) {
    if (!storage) {
      throw new Error(`Cannot map to undefined storage`);
    }
    this._id = storage.id;
    this._originalId = storage.originalId;
    this._type = undefined;
    this._mappedType = storage.type;
    if (this._mappedType.isSingleton) {
      // TODO(shans): Extend notion of singleton types through recipes and remove this conversion.
      this._mappedType = this._mappedType.getContainedType();
    }
    this._storageKey = storage.storageKey;

    this.claims = storage.claims;
  }
  get localName() { return this._localName; }
  set localName(name: string) { this._localName = name; }
  get connections() { return this._connections; } // HandleConnection*
  get associatedHandles() { return this._associatedHandles; }
  get storageKey() { return this._storageKey; }
  set storageKey(key: StorageKey) { this._storageKey = key; }
  get pattern() { return this._pattern; }
  set pattern(pattern: string) { this._pattern = pattern; }
  get mappedType() { return this._mappedType; }
  set mappedType(mappedType: Type) { this._mappedType = mappedType; }
  get immediateValue() { return this._immediateValue; }
  set immediateValue(value: ParticleSpec) { this._immediateValue = value; }
  get ttl() { return this._ttl; }
  set ttl(ttl: Ttl) { this._ttl = ttl; }
  get isSynthetic() { return this.fate === 'join'; } // Join handles are the first type of synthetic handles, other may come.

  static effectiveType(handleType: Type, connections: {type?: Type, direction?: Direction, relaxed?: boolean}[]) {
    const variableMap = new Map<TypeVariableInfo|Schema, TypeVariableInfo|Schema>();
    // It's OK to use _cloneWithResolutions here as for the purpose of this test, the handle set + handleType
    // contain the full set of type variable information that needs to be maintained across the clone.
    const typeSet = connections.filter(connection => connection.type != null).map(connection => ({type: connection.type._cloneWithResolutions(variableMap), direction: connection.direction, relaxed: connection.relaxed}));
    return TypeChecker.processTypeList(handleType ? handleType._cloneWithResolutions(variableMap) : null, typeSet);
  }

  static resolveEffectiveType(handleType: Type, connections: HandleConnection[], options: IsValidOptions): Type {
    const typeSet: TypeListInfo[] = connections
      .filter(connection => connection.type != null)
      .map(connection => ({type: connection.type, direction: connection.direction, relaxed: connection.relaxed}));
    return TypeChecker.processTypeList(handleType, typeSet, options);
  }

  _isValid(options: IsValidOptions): boolean {
    const tags = new Set<string>();
    for (const connection of this._connections) {
      // A remote handle cannot be connected to an output param.
      if (this.fate === 'map' && ['writes', 'reads writes'].includes(connection.direction)) {
        if (options && options.errors) {
          options.errors.set(this, `Invalid fate '${this.fate}' for handle '${this}'; it is used for '${connection.direction}' ${connection.getQualifiedName()} connection`);
        }
        return false;
      }
      connection.tags.forEach(tag => tags.add(tag));
    }
    if (!this.mappedType && this.fate === '`slot') {
      this._mappedType = TypeVariable.make(this.id);
    }
    if (options && options.errors) {
      options.typeErrors = [];
    }
    const type = Handle.resolveEffectiveType(this._mappedType, this._connections, options);
    if (!type) {
      if (options && options.errors) {
        const errs = options.typeErrors;
        if (errs && errs.length > 0) {
          options.errors.set(this, `Type validations failed for handle '${this}': ${errs.join(', ')}`);
        } else {
          options.errors.set(this, `Type validations failed for handle '${this}' with type ${this._mappedType} and fate ${this.fate}`);
        }
      }
      return false;
    }

    this._type = type;
    this._tags.forEach(tag => tags.add(tag));
    this._tags = [...tags];
    return true;
  }

  isResolved(options?: IsResolvedOptions): boolean {
    assert(Object.isFrozen(this));
    let resolved = true;
    if (this.type) {
      let mustBeResolved = true;
      if (this.fate === 'create' || this.fate === '`slot') {
        mustBeResolved = false;
      }
      if (!this.type.canEnsureResolved()) {
        if (options) {
          options.details.push('unresolved type (cannot ensure resolved)');
        }
        resolved = false;
      }
      if (mustBeResolved && !this.type.isResolved()) {
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

  toString(options: ToStringOptions = {}, nameMap?: Map<RecipeComponent, string>): string {
    if (this._immediateValue) {
      // Immediate Value handles are only rendered inline with particle connections.
      // E.g. hostedParticle = ShowProduct
      return undefined;
    }
    const getName = (h:Handle) => ((nameMap && nameMap.get(h)) || h.localName);
    // TODO: type? maybe output in a comment
    const result: string[] = [];
    const name = getName(this);
    if (name) {
      result.push(`${name}:`);
    }
    result.push(this.fate);
    if (this.associatedHandles.length) {
      result.push(`(${this.associatedHandles.map(h => getName(h)).join(', ')})`);
    }
    if (this.capabilities && !this.capabilities.isEmpty()) {
      result.push(this.capabilities.toString());
    }
    if (this.id) {
      result.push(`'${this.id}'`);
    }
    result.push(...this.tags.map(a => `#${a}`));

    // Debug information etc.
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

  findConnectionByDirection(dir: Direction): HandleConnection|undefined {
    return this._connections.find(conn => conn.direction === dir);
  }

  associateHandle(handle: Handle) {
    assert(this.fate === 'join');
    this._associatedHandles.push(handle);
  }
}
