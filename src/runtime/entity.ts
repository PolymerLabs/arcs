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
import { ParticleExecutionContext } from './particle-execution-context.js';
import { Reference } from './reference.js';
import { TypeChecker } from './recipe/type-checker.js';

type EntityIdComponents = {
  base: string,
  component: () => number,
};

export type EntityRawData = {};

/**
 * Regular interface for Entities.
 */
export interface EntityInterface {
  isIdentified(): boolean;
  id: string;
  identify(identifier: string): void;
  createIdentity(components: EntityIdComponents): void;
  toLiteral(): EntityRawData;
  dataClone();

  // Used to access dynamic properties, but also may allow access to
  // rawData and other internal state for tests..
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
}

/**
 * The merged interfaces.  Replaces usages of typeof Entity.
 */
export type EntityClass = (new (data, userIDComponent?: string) => EntityInterface) & EntityStaticInterface;

export abstract class Entity implements EntityInterface {
  private userIDComponent?: string;

  protected rawData: EntityRawData;

  protected constructor(userIDComponent?: string) {
    assert(!userIDComponent || userIDComponent.indexOf(':') === -1, 'user IDs must not contain the \':\' character');
    this[Symbols.identifier] = undefined;
    this.userIDComponent = userIDComponent;
  }

  getUserID(): string {
    return this.userIDComponent;
  }

  isIdentified(): boolean {
    return this[Symbols.identifier] !== undefined;
  }

  // TODO: entity should not be exposing its IDs.
  get id() {
    assert(!!this.isIdentified());
    return this[Symbols.identifier];
  }

  identify(identifier: string) {
    assert(!this.isIdentified());
    this[Symbols.identifier] = identifier;
    const components = identifier.split(':');
    if (components[components.length - 2] === 'uid') {
      this.userIDComponent = components[components.length - 1];
    }
  }

  createIdentity(components: EntityIdComponents) {
    assert(!this.isIdentified());
    let id: string;
    if (this.userIDComponent) {
      id = `${components.base}:uid:${this.userIDComponent}`;
    } else {
      id = `${components.base}:${components.component()}`;
    }
    this[Symbols.identifier] = id;
  }

  toLiteral(): EntityRawData {
    return this.rawData;
  }

  abstract dataClone(): EntityRawData;
}

export function createEntityClass(schema: Schema, context: ParticleExecutionContext): EntityClass {
  const className = schema.name;
  const classJunk = ['toJSON', 'prototype', 'toString', 'inspect'];

  const convertToJsType = fieldType => {
    switch (fieldType) {
      case 'Text':
        return 'string';
      case 'URL':
        return 'string';
      case 'Number':
        return 'number';
      case 'Boolean':
        return 'boolean';
      case 'Object':
        return 'object';
      default:
        throw new Error(`Unknown field type ${fieldType} in schema ${className}`);
    }
  };

  const fieldTypes = schema.fields;
  const validateFieldAndTypes = (op, name, value) => _validateFieldAndTypes(op, name, fieldTypes[name], value);

  const _validateFieldAndTypes = (op, name, fieldType, value) => {
    if (fieldType === undefined) {
      throw new Error(`Can't ${op} field ${name}; not in schema ${className}`);
    }
    if (value === undefined || value === null) {
      return;
    }

    if (typeof(fieldType) !== 'object') {
      // Primitive fields.
      if (typeof(value) !== convertToJsType(fieldType)) {
        throw new TypeError(
            `Type mismatch ${op}ting field ${name} (type ${fieldType}); ` +
            `value '${value}' is type ${typeof(value)}`);
      }
      return;
    }

    switch (fieldType.kind) {
      case 'schema-union':
        // Value must be a primitive that matches one of the union types.
        for (const innerType of fieldType.types) {
          if (typeof(value) === convertToJsType(innerType)) {
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
              typeof(value[i]) !== convertToJsType(innerType)) {
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
          _validateFieldAndTypes(op, name, fieldType.schema, element);
        }
        break;
      default:
        throw new Error(`Unknown kind ${fieldType.kind} in schema ${className}`);
    }
  };

  const clazz = class extends Entity {
    constructor(data, userIDComponent?: string) {
      super(userIDComponent);
      this.rawData = new Proxy({}, {
        get: (target, name : string) => {
          if (classJunk.includes(name) || name.constructor === Symbol) {
            return undefined;
          }
          const value = target[name];
          validateFieldAndTypes('get', name, value);
          return value;
        },
        set: (target, name, value) => {
          validateFieldAndTypes('set', name, value);
          target[name] = value;
          return true;
        }
      });
      assert(data, `can't construct entity with null data`);

      // TODO: figure out how to do this only on wire-created entities.
      const sanitizedData = this.sanitizeData(data);
      for (const [name, value] of Object.entries(sanitizedData)) {
        this.rawData[name] = value;
      }
    }

    private sanitizeData(data) {
      const sanitizedData = {};
      for (const [name, value] of Object.entries(data)) {
        sanitizedData[name] = this.sanitizeEntry(fieldTypes[name], value, name);
      }
      return sanitizedData;
    }

    private sanitizeEntry(type, value, name) {
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
          return new Set(value.map(v => this.sanitizeEntry(type.schema, v, name)));
        } else {
          throw new TypeError(`Cannot set collection ${name} with non-collection '${value}'`);
        }
      } else {
        return value;
      }
    }

    dataClone() {
      const clone = {};
      for (const name of Object.keys(schema.fields)) {
        if (this.rawData[name] !== undefined) {
          if (fieldTypes[name] && fieldTypes[name].kind === 'schema-reference') {
            clone[name] = this.rawData[name].dataClone();
          } else if (fieldTypes[name] && fieldTypes[name].kind === 'schema-collection') {
            clone[name] = [...this.rawData[name]].map(a => a.dataClone());
          } else {
            clone[name] = this.rawData[name];
          }
        }
      }
      return clone;
    }

    static get type(): Type {
      // TODO: should the entity's key just be its type?
      // Should it just be called type in that case?
      return new EntityType(this.key.schema);
    }

    static get key() {
      return {tag: 'entity', schema};
    }
  };

  Object.defineProperty(clazz, 'type', {value: schema.type});
  Object.defineProperty(clazz, 'name', {value: schema.name});
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