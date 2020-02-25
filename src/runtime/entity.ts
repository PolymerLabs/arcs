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
import {Schema} from './schema.js';
import {Type, EntityType} from './type.js';
import {Id, IdGenerator} from './id.js';
import {Dictionary, Consumer} from './hot.js';
import {SYMBOL_INTERNALS} from './symbols.js';
import {Refinement} from './refiner.js';
import {Flags} from './flags.js';
import {ChannelConstructor} from './channel-constructor.js';
import {Ttl} from './recipe/ttl.js';
import {Storable} from './storable.js';

export type EntityRawData = {};

export type SerializedEntity = {id: string, expirationTimestamp?: string, rawData: EntityRawData};

/**
 * Represents mutable entity data. Instances will have mutable properties defined on them for all
 * of the fields defined in the schema for the entity. This type permits indexing by all strings,
 * because we do not know what those fields are at compile time (since they're dynamic).
 */
// tslint:disable-next-line: no-any
export type MutableEntityData = Dictionary<any>;

/**
 * A set of static methods used by Entity implementations. These are defined dynamically in Schema.
 * Required because Typescript does not support abstract statics.
 *
 * @see https://github.com/Microsoft/TypeScript/issues/14600
 * @see https://stackoverflow.com/a/13955591
 */
export interface EntityStaticInterface {
  readonly type: Type;
  readonly key: {tag: string, schema: Schema};
  readonly schema: Schema;
}

export type EntityClass = (new (data, userIDComponent?: string) => Entity) & EntityStaticInterface;

// This class holds extra entity-related fields used by the runtime. Instances of this are stored
// in their parent Entity via a Symbol-based key. This allows Entities to hold whatever field names
// their Schemas describe without any possibility of names clashing. For example, an Entity can have
// an 'id' field that is distinct (in both value and type) from the id field here. Access to this
// class should be via the static helpers in Entity.
class EntityInternals {
  private readonly entity: Entity;
  private readonly entityClass: EntityClass;
  private readonly schema: Schema;
  private readonly context: ChannelConstructor;

  private id?: string;
  private storageKey?: string;
  private userIDComponent?: string;
  private expirationTimestamp: string;

  // TODO: Only the Arc that "owns" this Entity should be allowed to mutate it.
  private mutable = true;

  constructor(entity: Entity, entityClass: EntityClass, schema: Schema,
              context: ChannelConstructor, userIDComponent?: string) {
    this.entity = entity;
    this.entityClass = entityClass;
    this.schema = schema;
    this.context = context;
    this.userIDComponent = userIDComponent;
  }

  getId(): string {
    if (this.id === undefined) {
      throw new Error('no id');
    }
    return this.id;
  }

  getStorageKey(): string {
    if (this.id === undefined) {
      throw new Error('entity has not yet been stored!');
    }
    if (this.storageKey === undefined) {
      throw new Error('entity has been stored but storage key was not recorded against entity');
    }
    return this.storageKey;
  }

  getEntityClass(): EntityClass {
    return this.entityClass;
  }

  isIdentified(): boolean {
    return this.id !== undefined;
  }

  hasExpirationTimestamp(): boolean {
    return this.expirationTimestamp !== undefined;
  }

  identify(identifier: string, storageKey: string) {
    assert(!this.isIdentified(), 'identify() called on already identified entity');
    this.id = identifier;
    this.storageKey = storageKey;
    const components = identifier.split(':');
    const uid = components.lastIndexOf('uid');
    this.userIDComponent = uid > 0 ? components.slice(uid+1).join(':') : '';
  }

  createIdentity(parentId: Id, idGenerator: IdGenerator, storageKey: string, ttl: Ttl) {
    assert(!this.isIdentified(), 'createIdentity() called on already identified entity');
    assert(!this.hasExpirationTimestamp(), 'createIdentity() called on entity with expirationTimestamp');
    let id: string;
    if (this.userIDComponent) {
      // TODO: Stop creating IDs by manually concatenating strings.
      id = `${parentId.toString()}:uid:${this.userIDComponent}`;
    } else {
      id = idGenerator.newChildId(parentId).toString();
    }
    this.storageKey = storageKey;
    this.id = id;
    assert(ttl, `ttl cannot be null`);
    if (!ttl.isInfinite) {
      this.expirationTimestamp = ttl.calculateExpiration().getTime().toString();
    }
  }

  isMutable(): boolean {
    return this.mutable;
  }

  /**
   * Prevents further mutation of this Entity instance. Note that calling this method only affects
   * this particular Entity instance; the entity it represents (in a data store somewhere) can
   * still be mutated by others. Also note that this doesn't necessarily offer any security against
   * malicious developers.
   */
  makeImmutable() {
    this.mutable = false;
  }

  /**
   * Mutates the entity. Supply either the new data for the entity, which replaces the existing
   * entity's data entirely, or a mutation function. The supplied mutation function will be called
   * with a mutable copy of the entity's data. The mutations performed by that function will be
   * reflected in the original entity instance (i.e. mutations applied in place).
   */
  mutate(mutation: Consumer<MutableEntityData> | {}) {
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

    // Note that this does *not* trigger the error in the Entity's Proxy 'set' trap, because we're
    // applying the field updates directly to the original Entity instance (this.entity), not the
    // Proxied version returned by the Entity constructor. Not confusing at all!
    sanitizeAndApply(this.entity, newData, this.schema, this.context);

    // TODO: Send mutations to data store.
  }

  toLiteral(): EntityRawData {
    return JSON.parse(JSON.stringify(this.entity));
  }

  dataClone(): EntityRawData {
    const clone = {};
    const fieldTypes = this.schema.fields;
    for (const name of Object.keys(fieldTypes)) {
      if (this.entity[name] !== undefined) {
        if (fieldTypes[name] && fieldTypes[name].kind === 'schema-reference') {
          if (this.entity[name]) {
            clone[name] = this.entity[name].dataClone();
          }
        } else if (fieldTypes[name] && fieldTypes[name].kind === 'schema-collection') {
          if (this.entity[name]) {
            clone[name] = [...this.entity[name]].map(a => a.dataClone());
          }
        } else {
          clone[name] = this.entity[name];
        }
      }
    }
    return clone;
  }

  serialize(): SerializedEntity {
    const serializedEntity: SerializedEntity = {id: this.id, rawData: this.dataClone()};
    if (this.hasExpirationTimestamp()) {
      serializedEntity.expirationTimestamp = this.expirationTimestamp;
    }
    return serializedEntity;
  }

  debugLog() {
    // Here be dragons! Create a copy of the entity class but with an enumerable version of this
    // internals object so it will appear in the log output, with a few tweaks for better display.
    const original = this.entity;

    // The 'any' type is required to modify some readonly fields below.
    // tslint:disable-next-line: no-any
    const copy: any = new EntityInternals(null, this.entityClass, this.schema, null, this.userIDComponent);
    copy.id = this.id;

    // Force '.entity' to show as '[Circular]'.
    copy.entity = copy;

    // We don't want to log the ChannelConstructor object but showing '.context' as null
    // could be confusing, so omit it altogether.
    delete copy.context;

    // Set up a class that looks the same as the real entity, copy the schema fields in, add an
    // enumerable version of the copied internals, and use console.dir to show the full object.
    // Node displays the name set up with defineProperty below, but Chrome uses the name of the
    // class variable defined here, so we'll call that entity.
    const entity = class extends Entity {
      constructor() {
        super();
        Object.assign(this, original);
        this[SYMBOL_INTERNALS] = copy;
      }
    };
    if (original.constructor.name) {
      Object.defineProperty(entity, 'name', {value: original.constructor.name});
    }
    console.dir(new entity(), {depth: null});
  }
}

// tslint:disable-next-line: no-any
type EntrySanitizer = (type: Type, value: any, name: string, context: ChannelConstructor) => any;
// tslint:disable-next-line: no-any
type Validator = (name: string, value: any, schema: Schema, fieldType?: any) => void;

export abstract class Entity implements Storable {
  // Field names are schema-dependent so no static checking is possible.
  // tslint:disable-next-line: no-any
  [index: string]: any;

  // Runtime-specific entity fields are held in a separate object accessed by a Symbol-based key
  // to avoid name clashes with the Entity's Schema-based fields.
  [SYMBOL_INTERNALS]: EntityInternals;

  toString() {
    const fields = Object.entries(this).map(([name, value]) => `${name}: ${JSON.stringify(value)}`);
    return `${this.constructor.name} { ${fields.join(', ')} }`;
  }

  // Dynamically constructs a new JS class for the entity type represented by the given schema.
  // This creates a new class which extends the Entity base class and implements the required
  // static properties, then returns a Proxy wrapping that to guard against incorrect field writes.
  static createEntityClass(schema: Schema, context: ChannelConstructor): EntityClass {
    const clazz = class extends Entity {
      constructor(data: EntityRawData, userIDComponent?: string) {
        super();
        assert(data, `can't construct entity with null data`);
        assert(!userIDComponent || userIDComponent.indexOf(':') === -1, `user IDs must not contain the ':' character`);

        // We want the SYMBOL_INTERNALS property to be non-enumerable so any copies made of this
        // entity (e.g. via Object.assign) pick up only the plain data fields from the schema, and
        // not the EntityInternals object (which should be unique to this instance).
        Object.defineProperty(this, SYMBOL_INTERNALS, {
          value: new EntityInternals(this, clazz, schema, context, userIDComponent),
          enumerable: false
        });

        sanitizeAndApply(this, data, schema, context);

        // We don't want a 'get' trap here because JS accesses various fields as part of routine
        // system behaviour, and making sure we special case all of them is going to be brittle.
        // For example: when returning an object from an async function, JS needs to check if the
        // object is a 'thenable' (so it knows whether to wrap it in a Promise or not), and it does
        // this by checking for the existence of a 'then' method. Not trapping 'get' is ok because
        // callers who try to read fields that aren't in the schema will just get 'undefined', which
        // is idiomatic for JS anyway.
        return new Proxy(this, {
          set: (target, name: string, value) => {
            throw new Error(`Tried to modify entity field '${name}'. Use the mutate method instead.`);
          }
        });
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
    return clazz;
  }

  static id(entity: Entity): string {
    return getInternals(entity).getId();
  }

  static storageKey(entity: Entity): string {
    return getInternals(entity).getStorageKey();
  }

  static entityClass(entity: Entity): EntityClass {
    return getInternals(entity).getEntityClass();
  }

  static isIdentified(entity: Entity): boolean {
    return getInternals(entity).isIdentified();
  }

  static identify(entity: Entity, identifier: string, storageKey: string) {
    getInternals(entity).identify(identifier, storageKey);
    return entity;
  }

  static createIdentity(entity: Entity, parentId: Id, idGenerator: IdGenerator, storageKey: string, ttl: Ttl) {
    getInternals(entity).createIdentity(parentId, idGenerator, storageKey, ttl);
  }

  static isMutable(entity: Entity): boolean {
    return getInternals(entity).isMutable();
  }

  static makeImmutable(entity: Entity) {
    getInternals(entity).makeImmutable();
  }

  static mutate(entity: Entity, mutation: Consumer<MutableEntityData> | {}) {
    getInternals(entity).mutate(mutation);
  }

  static toLiteral(entity: Entity): EntityRawData {
    return getInternals(entity).toLiteral();
  }

  static dataClone(entity: Entity): EntityRawData {
    return getInternals(entity).dataClone();
  }

  static serialize(entity: Entity): SerializedEntity {
    return getInternals(entity).serialize();
  }

  // Because the internals object is non-enumerable, console.log(entity) in Node only shows the
  // schema-based fields; use this function to log a more complete record of the entity in tests.
  // Chrome's console.log already shows the internals object so that's usually sufficient for
  // debugging, but this function can still be useful for logging a snapshot of an entity that
  // is later modified.
  static debugLog(entity: Entity | Storable) {
    getInternals(entity).debugLog();
  }

  static sanitizeEntry: EntrySanitizer = null;

  static validateFieldAndTypes: Validator = null;
}

function getInternals(entity): EntityInternals {
  const internals = entity[SYMBOL_INTERNALS];
  assert(internals !== undefined, 'SYMBOL_INTERNALS lookup on non-entity');
  return internals;
}

function sanitizeAndApply(target: Entity, data: EntityRawData, schema: Schema, context: ChannelConstructor) {
  const temp = {...target};
  for (const [name, value] of Object.entries(data)) {
    const sanitizedValue = Entity.sanitizeEntry(schema.fields[name], value, name, context);
    Entity.validateFieldAndTypes(name, sanitizedValue, schema);
    temp[name] = sanitizedValue;
  }
  if (Flags.enforceRefinements) {
    const exception = Refinement.refineData(temp, schema);
    if (exception) {
      context.reportExceptionInHost(exception);
      return;
    }
  }
  // update target after ensuring that the data conforms to the refinements (if enforced)
  for (const [name, value] of Object.entries(temp)) {
    target[name] = value;
  }
}
