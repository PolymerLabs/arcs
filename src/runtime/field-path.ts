/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Schema} from './schema.js';
import {InterfaceInfo, Type} from './type.js';

/**
 * Validates a field path against the given Type. Throws an exception if the
 * field path is invalid.
 */
export function validateFieldPath(fieldPath: string[], type: Type) {
  if (fieldPath.length === 0) {
    return;
  }
  if (type.isTypeContainer()) {
    validateFieldPath(fieldPath, type.getContainedType());
    return;
  }

  const schema = type.getEntitySchema();
  if (!schema) {
    if (InterfaceInfo.isTypeVar(type)) {
      if (type.canWriteSuperset == null) {
        throw new Error(`Type variable ${type} does not contain field '${fieldPath[0]}'.`);
      }
      validateFieldPath(fieldPath, type.canWriteSuperset);
      return;
    } else {
      throw new Error(`Expected type to contain an entity schema: ${type}.`);
    }
  }

  if (!checkSchema(fieldPath, schema)) {
    throw new Error(`Field '${fieldPath.join('.')}' does not exist in: ${schema.toManifestString()}`);
  }
}

/** Checks a field path for a particular field definition. */
function checkField(fieldPath: string[], field): boolean {
  switch (field.kind) {
    case 'schema-primitive': {
      // Field path must end here.
      return fieldPath.length === 1;
    }
    case 'schema-collection': {
      // Check inner type.
      return checkField(fieldPath, field.schema);
    }
    case 'schema-reference': {
      // Check rest of field path against inner type.
      return checkSchema(fieldPath.slice(1), field.schema.model.entitySchema);
    }
    default:
      throw new Error(`Unsupported field type: ${JSON.stringify(field)}`);
  }
}

/** Checks a field path against the given Schema. */
function checkSchema(fieldPath: string[], schema: Schema): boolean {
  if (fieldPath.length === 0) {
    return true;
  }
  const fieldName = fieldPath[0];
  if (!(fieldName in schema.fields)) {
    return false;
  }
  const field = schema.fields[fieldName];
  return checkField(fieldPath, field);
}
