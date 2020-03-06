/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Entity} from './entity.js';
import {Reference} from './reference.js';
import {ReferenceType} from './type.js';
import {Schema} from './schema.js';
import {TypeChecker} from './recipe/type-checker.js';
import {ChannelConstructor} from './channel-constructor.js';

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
    default:
      throw new Error(`Unknown field type ${primitiveType.type} in schema ${schemaName}`);
  }
}

// tslint:disable-next-line: no-any
function validateFieldAndTypes(name: string, value: any, schema: Schema, fieldType?: any) {
  fieldType = fieldType || schema.fields[name];
  if (fieldType === undefined) {
    throw new Error(`Can't set field ${name}; not in schema ${schema.name}`);
  }
  if (value === undefined || value === null) {
    return;
  }

  switch (fieldType.kind) {
    case 'schema-primitive': {
      const valueType = value.constructor.name === 'Uint8Array' ? 'Uint8Array' : typeof(value);
      if (valueType !== convertToJsType(fieldType, schema.name)) {
        throw new TypeError(`Type mismatch setting field ${name} (type ${fieldType.type}); ` +
                            `value '${value}' is type ${typeof(value)}`);
      }
      break;
    }
    case 'schema-union':
      // Value must be a primitive that matches one of the union types.
      for (const innerType of fieldType.types) {
        if (typeof(value) === convertToJsType(innerType, schema.name)) {
          return;
        }
      }
      throw new TypeError(`Type mismatch setting field ${name} (union [${fieldType.types}]); ` +
                          `value '${value}' is type ${typeof(value)}`);

    case 'schema-tuple':
      // Value must be an array whose contents match each of the tuple types.
      if (!Array.isArray(value)) {
        throw new TypeError(`Cannot set tuple ${name} with non-array value '${value}'`);
      }
      if (value.length !== fieldType.types.length) {
        throw new TypeError(`Length mismatch setting tuple ${name} ` +
                            `[${fieldType.types}] with value '${value}'`);
      }
      fieldType.types.map((innerType, i) => {
        if (value[i] !== undefined && value[i] !== null &&
            typeof(value[i]) !== convertToJsType(innerType, schema.name)) {
          throw new TypeError(`Type mismatch setting field ${name} (tuple [${fieldType.types}]); ` +
                              `value '${value}' has type ${typeof(value[i])} at index ${i}`);
        }
      });
      break;
    case 'schema-reference':
      if (!(value instanceof Reference)) {
        throw new TypeError(`Cannot set reference ${name} with non-reference '${value}'`);
      }
      if (!TypeChecker.compareTypes({type: value.type}, {type: new ReferenceType(fieldType.schema.model)})) {
        throw new TypeError(`Cannot set reference ${name} with value '${value}' of mismatched type`);
      }
      break;
    case 'schema-collection':
      // WTF?! value instanceof Set is returning false sometimes here because the Set in
      // this environment (a native code constructor) isn't equal to the Set that the value
      // has been constructed with (another native code constructor)...
      if (value.constructor.name !== 'Set') {
        throw new TypeError(`Cannot set collection ${name} with non-Set '${value}'`);
      }
      for (const element of value) {
        validateFieldAndTypes(name, element, schema, fieldType.schema);
      }
      break;
    default:
      throw new Error(`Unknown kind '${fieldType.kind}' for field ${name} in schema ${schema.name}`);
  }
}

function sanitizeEntry(type, value, name, context: ChannelConstructor) {
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
    } else if ((value as {id}).id && (value as {creationTimestamp}).creationTimestamp && (value as {entityStorageKey}).entityStorageKey) {
      // Setting value from raw data (Channel side).
      // TODO(shans): This can't enforce type safety here as there isn't any type data available.
      // Maybe this is OK because there's type checking on the other side of the channel?
      return new Reference(value as {id, creationTimestamp, entityStorageKey}, new ReferenceType(type.schema.model), context);
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

Entity.sanitizeEntry = sanitizeEntry;
Entity.validateFieldAndTypes = validateFieldAndTypes;
