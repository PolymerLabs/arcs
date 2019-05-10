// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../platform/assert-web.js';

import {Schema} from './schema.js';
import {Symbols} from './symbols.js';
import {Type, ReferenceType, EntityType} from './type.js';
import {ParticleExecutionContext} from './particle-execution-context.js';
import {Reference} from './reference.js';
import {TypeChecker} from './recipe/type-checker.js';
import {Storable} from './handle.js';
import {SerializedEntity} from './storage-proxy.js';
import {Id, IdGenerator} from './id.js';

export type EntityRawData = {};

/**
 * Regular interface for Entities.
 */
export interface EntityInterface extends Storable {
  isIdentified(): boolean;
  identify(identifier: string): void;
  createIdentity(parentId: Id, idGenerator: IdGenerator): void;
  toLiteral(): EntityRawData;
  toJSON(): EntityRawData;
  dataClone(): EntityRawData;
  mutate(mutationFn: (data: MutableEntityData) => void): void;
  
  mutable: boolean;
  readonly id: string;
  readonly entityClass: EntityClass;

  // Used to access dynamic properties, but also may allow access to
  // rawData and other internal state for tests..
  // tslint:disable-next-line: no-any
  [index: string]: any;
}

/** 
 * Represents mutable entity data. Instances will have mutable properties defined on them for all of the fields defined in the schema for the
 * entity. This type permits indexing by all strings, because we do not know what those fields are at compile time (since they're dynamic).
 */
export interface MutableEntityData {
  // tslint:disable-next-line: no-any
  [index: string]: any;
}

/**
 * A set of static methods used by Entity implementations.  These are
 * defined dynamically in Schema.  Required because Typescript does
 * not support abstract statics.
 *
 * @see https://github.com/Microsoft/TypeScript/issues/14600
 * @see https://stackoverflow.com/a/13955591
 */
export interface EntityStaticInterface {
  readonly type: Type;
  readonly key: {tag: string, schema: Schema};
  readonly schema: Schema;
}

/**
 * The merged interfaces.  Replaces usages of typeof Entity.
 */
export type EntityClass = (new (data, userIDComponent?: string) => EntityInterface) & EntityStaticInterface;

export abstract class Entity implements EntityInterface {
  protected rawData: EntityRawData;
  
  private userIDComponent?: string;
  private schema: Schema;
  private context: ParticleExecutionContext;
  private _mutable = true;

  // Currently we need a ParticleExecutionContext to be injected here in order to construct entity References (done in the sanitizeEntry
  // function below).
  // TODO(shans): Remove this dependency on ParticleExecutionContext, so that you can construct entities without one.
  protected constructor(data: EntityRawData, schema: Schema, context: ParticleExecutionContext, userIDComponent?: string) {
    assert(!userIDComponent || userIDComponent.indexOf(':') === -1, 'user IDs must not contain the \':\' character');
    setEntityId(this, undefined);
    this.userIDComponent = userIDComponent;
    this.schema = schema;
    this.context = context;

    assert(data, `can't construct entity with null data`);

    this.rawData = createRawDataProxy(data, schema, context);
  }

  /** Returns true if this Entity instance can have its fields mutated. */
  get mutable(): boolean {
    // TODO: Only the Arc that "owns" this Entity should be allowed to mutate it.
    return this._mutable;
  }

  /**
   * Prevents further mutation of this Entity instance. Note that calling this method only affects this particular Entity instance; the entity
   * it represents (in a data store somewhere) can still be mutated by others. Also note that this field offers no security at all against
   * malicious developers; they can reach in and modify the "private" backing field directly.
   */
  set mutable(mutable: boolean) {
    if (!this.mutable && mutable) {
      throw new Error('You cannot make an immutable entity mutable again.');
    }
    this._mutable = mutable;
  }

  /**
   * Mutates the entity. Supply either the new data for the entity, which replaces the existing entity's data entirely, or a mutation function.
   * The supplied mutation function will be called with a mutable copy of the entity's data. The mutations performed by that function will be
   * reflected in the original entity instance (i.e. mutations applied in place).
   */
  mutate(mutation: ((data: MutableEntityData) => void) | {}) {
    if (!this.mutable) {
      throw new Error('Entity is immutable.');
    }
    let newData: {};
    // Using typeof instead of instanceof here, because apparently sometimes lambdas aren't an instance of Function... :-/
    if (typeof mutation === 'function') {
      newData = this.dataClone();
      mutation(newData);
    } else {
      newData = mutation;
    }
    this.rawData = createRawDataProxy(newData, this.schema, this.context);
    // TODO: Send mutations to data store.
  }

  getUserID(): string {
    return this.userIDComponent;
  }

  isIdentified(): boolean {
    return getEntityId(this) !== undefined;
  }

  // TODO: entity should not be exposing its IDs.
  get id() {
    assert(!!this.isIdentified());
    return getEntityId(this);
  }

  identify(identifier: string) {
    assert(!this.isIdentified());
    setEntityId(this, identifier);
    const components = identifier.split(':');
    const uid = components.lastIndexOf('uid');
    this.userIDComponent = uid > 0 ? components.slice(uid+1).join(':') : '';
  }

  createIdentity(parentId: Id, idGenerator: IdGenerator) {
    assert(!this.isIdentified());
    let id: string;
    if (this.userIDComponent) {
      // TODO: Stop creating IDs by manually concatenating strings.
      id = `${parentId.toString()}:uid:${this.userIDComponent}`;
    } else {
      id = idGenerator.newChildId(parentId).toString();
    }
    setEntityId(this, id);
  }

  toLiteral(): EntityRawData {
    return this.rawData;
  }

  toJSON() {
    return this.rawData;
  }

  dataClone(): EntityRawData {
    const clone = {};
    const fieldTypes = this.schema.fields;
    for (const name of Object.keys(fieldTypes)) {
      if (this.rawData[name] !== undefined) {
        if (fieldTypes[name] && fieldTypes[name].kind === 'schema-reference') {
          if (this.rawData[name]) {
            clone[name] = this.rawData[name].dataClone();
          }
        } else if (fieldTypes[name] && fieldTypes[name].kind === 'schema-collection') {
          if (this.rawData[name]) {
            clone[name] = [...this.rawData[name]].map(a => a.dataClone());
          }
        } else {
          clone[name] = this.rawData[name];
        }
      }
    }
    return clone;
  }

  serialize(): SerializedEntity {
    const id = getEntityId(this);
    const rawData = this.dataClone();
    return {id, rawData};
  }

  abstract entityClass: EntityClass;

  /** Dynamically constructs a new JS class for the entity type represented by the given schema. */
  static createEntityClass(schema: Schema, context: ParticleExecutionContext): EntityClass {
    // Create a new class which extends the Entity base class, and implement all of the required static methods/properties.
    const clazz = class extends Entity {
      constructor(data: EntityRawData, userIDComponent?: string) {
        super(data, schema, context, userIDComponent);
      }

      get entityClass(): EntityClass {
        return clazz;
      }

      static get type(): Type {
        // TODO: should the entity's key just be its type?
        // Should it just be called type in that case?
        return new EntityType(schema);
      }

      static get key() {
        return {tag: 'entity', schema};
      }

      static get schema() {
        return schema;
      }
    };

    // Override the name property to use the name of the entity given in the schema.
    Object.defineProperty(clazz, 'name', {value: schema.name});

    // Add convenience properties for all of the entity's fields. These just proxy everything to the rawData proxy, but offer a nice API for
    // getting/setting fields.
    // TODO: add query / getter functions for user properties
    for (const name of Object.keys(schema.fields)) {
      Object.defineProperty(clazz.prototype, name, {
        get() {
          return this.rawData[name];
        },
        set(v) {
          this.rawData[name] = v;
        }
      });
    }
    return clazz;
  }
}

function convertToJsType(primitiveType, schemaName: string) {
  switch (primitiveType.type) {
    case 'Text':
      return 'string';
    case 'URL':
      return 'string';
    case 'Number':
      return 'number';
    case 'Boolean':
      return 'boolean';
    case 'Bytes':
      return 'Uint8Array';
    case 'Object':
      return 'object';
    default:
      throw new Error(`Unknown field type ${primitiveType.type} in schema ${schemaName}`);
  }
}

// tslint:disable-next-line: no-any
function validateFieldAndTypes({op, name, value, schema, fieldType}: {op: string, name: string, value: any, schema: Schema, fieldType?: any}) {
  fieldType = fieldType || schema.fields[name];
  if (fieldType === undefined) {
    throw new Error(`Can't ${op} field ${name}; not in schema ${schema.name}`);
  }
  if (value === undefined || value === null) {
    return;
  }

  switch (fieldType.kind) {
    case 'schema-primitive':
      const valueType = value.constructor.name === 'Uint8Array' ? 'Uint8Array' : typeof(value);
      if (valueType !== convertToJsType(fieldType, schema.name)) {
        throw new TypeError(
            `Type mismatch ${op}ting field ${name} (type ${fieldType.type}); ` +
            `value '${value}' is type ${typeof(value)}`);
      }
      break;

    case 'schema-union':
      // Value must be a primitive that matches one of the union types.
      for (const innerType of fieldType.types) {
        if (typeof(value) === convertToJsType(innerType, schema.name)) {
          return;
        }
      }
      throw new TypeError(
          `Type mismatch ${op}ting field ${name} (union [${fieldType.types}]); ` +
          `value '${value}' is type ${typeof(value)}`);

    case 'schema-tuple':
      // Value must be an array whose contents match each of the tuple types.
      if (!Array.isArray(value)) {
        throw new TypeError(`Cannot ${op} tuple ${name} with non-array value '${value}'`);
      }
      if (value.length !== fieldType.types.length) {
        throw new TypeError(`Length mismatch ${op}ting tuple ${name} ` +
                            `[${fieldType.types}] with value '${value}'`);
      }
      fieldType.types.map((innerType, i) => {
        if (value[i] !== undefined && value[i] !== null &&
            typeof(value[i]) !== convertToJsType(innerType, schema.name)) {
          throw new TypeError(
              `Type mismatch ${op}ting field ${name} (tuple [${fieldType.types}]); ` +
              `value '${value}' has type ${typeof(value[i])} at index ${i}`);
        }
      });
      break;
    case 'schema-reference':
      if (!(value instanceof Reference)) {
        throw new TypeError(`Cannot ${op} reference ${name} with non-reference '${value}'`);
      }
      if (!TypeChecker.compareTypes({type: value.type}, {type: new ReferenceType(fieldType.schema.model)})) {
        throw new TypeError(`Cannot ${op} reference ${name} with value '${value}' of mismatched type`);
      }
      break;
    case 'schema-collection':
      // WTF?! value instanceof Set is returning false sometimes here because the Set in
      // this environment (a native code constructor) isn't equal to the Set that the value
      // has been constructed with (another native code constructor)...
      if (value.constructor.name !== 'Set') {
        throw new TypeError(`Cannot ${op} collection ${name} with non-Set '${value}'`);
      }
      for (const element of value) {
        validateFieldAndTypes({op, name, value: element, schema, fieldType: fieldType.schema});
      }
      break;
    default:
      throw new Error(`Unknown kind ${fieldType.kind} in schema ${schema.name}`);
  }
}

function sanitizeData(data: EntityRawData, schema: Schema, context: ParticleExecutionContext) {
  const sanitizedData = {};
  for (const [name, value] of Object.entries(data)) {
    const sanitizedValue = sanitizeEntry(schema.fields[name], value, name, context);
    validateFieldAndTypes({op: 'set', name, value: sanitizedValue, schema});
    sanitizedData[name] = sanitizedValue;
  }
  return sanitizedData;
}

function sanitizeEntry(type, value, name, context: ParticleExecutionContext) {
  if (!type) {
    // If there isn't a field type for this, the proxy will pick up
    // that fact and report a meaningful error.
    return value;
  }
  if (type.kind === 'schema-reference' && value) {
    if (value instanceof Reference) {
      // Setting value as Reference (Particle side). This will enforce that the type provided for
      // the handle matches the type of the reference.
      return value;
    } else if ((value as {id}).id && (value as {storageKey}).storageKey) {
      // Setting value from raw data (Channel side).
      // TODO(shans): This can't enforce type safety here as there isn't any type data available.
      // Maybe this is OK because there's type checking on the other side of the channel?
      return new Reference(value as {id, storageKey}, new ReferenceType(type.schema.model), context);
    } else {
      throw new TypeError(`Cannot set reference ${name} with non-reference '${value}'`);
    }
  } else if (type.kind === 'schema-collection' && value) {
    // WTF?! value instanceof Set is returning false sometimes here because the Set in
    // this environment (a native code constructor) isn't equal to the Set that the value
    // has been constructed with (another native code constructor)...
    if (value.constructor.name === 'Set') {
      return value;
    } else if (value.length && value instanceof Object) {
      return new Set(value.map(v => sanitizeEntry(type.schema, v, name, context)));
    } else {
      throw new TypeError(`Cannot set collection ${name} with non-collection '${value}'`);
    }
  } else {
    return value;
  }
}

/** Constructs a Proxy object to use for entities' rawData objects. This proxy will perform type-checking when getting/setting fields. */
function createRawDataProxy(data: {}, schema: Schema, context: ParticleExecutionContext) {
  const classJunk = ['toJSON', 'prototype', 'toString', 'inspect'];

  // TODO: figure out how to do this only on wire-created entities.
  const sanitizedData = sanitizeData(data, schema, context);

  return new Proxy(sanitizedData, {
    get: (target, name: string) => {
      if (classJunk.includes(name) || name.constructor === Symbol) {
        return undefined;
      }
      const value = target[name];
      validateFieldAndTypes({op: 'get', name, value, schema});
      return value;
    },
    set: (target, name: string, value) => {
      throw new Error(`Tried to modify entity field '${name}'. Use the mutate method instead.`);
    }
  });
}

/**
 * Returns the ID of the given entity. This is a function private to this file instead of a method on the Entity class, so that developers can't
 * get access to it.
 */
function getEntityId(entity: Entity): string {
  // Typescript doesn't let us use symbols as indexes, so cast to any first.
  // tslint:disable-next-line: no-any
  return entity[Symbols.identifier as any];
}

/**
 * Sets the ID of the given entity. This is a function private to this file instead of a method on the Entity class, so that developers can't
 * get access to it.
 */
function setEntityId(entity: Entity, id: string) {
  // Typescript doesn't let us use symbols as indexes, so cast to any first.
  // tslint:disable-next-line: no-any
  entity[Symbols.identifier as any] = id;
}
