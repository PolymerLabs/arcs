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
import {InterfaceInfo, Type, EntityType} from './type.js';
import {SchemaPrimitiveTypeValue} from './manifest-ast-nodes.js';

export type FieldPathType = Type | SchemaPrimitiveTypeValue;

/**
 * Evaluates a field path against the given Type. Returns the Type referenced by
 * the field path if valid. Throws an exception if the field path is invalid.
 */
export function evaluateFieldPath(fieldPath: string[], type: Type): FieldPathType {
  if (fieldPath.length === 0) {
    return type;
  }
  if (type.isTypeContainer()) {
    return evaluateFieldPath(fieldPath, type.getContainedType());
  }

  const schema = type.getEntitySchema();
  if (!schema) {
    if (InterfaceInfo.isTypeVar(type)) {
      if (type.canWriteSuperset == null) {
        throw new FieldPathError(`Type variable ${type} does not contain field '${fieldPath[0]}'.`);
      }
      return evaluateFieldPath(fieldPath, type.canWriteSuperset);
    } else {
      throw new FieldPathError(`Expected type to contain an entity schema: ${type}.`);
    }
  }

  return evaluateAgainstSchema(fieldPath, schema);
}

/** Checks a field path for a particular field definition. */
function evaluateAgainstField(fieldPath: string[], field): FieldPathType {
  switch (field.kind) {
    case 'schema-primitive': {
      // Field path must end here.
      if (fieldPath.length === 1) {
        return field.type;
      } else {
        throw new FieldPathError(`Field path '${fieldPath.join('.')}' could not be resolved because '${fieldPath[1]}' is a primitive.`);
      }
    }
    case 'schema-collection': {
      // Check inner type.
      return evaluateAgainstField(fieldPath, field.schema);
    }
    case 'schema-reference': {
      // Check rest of field path against inner type.
      return evaluateAgainstSchema(fieldPath.slice(1), field.schema.model.entitySchema);
    }
    default:
      throw new FieldPathError(`Unsupported field type: ${JSON.stringify(field)}`);
  }
}

/** Checks a field path against the given Schema. */
function evaluateAgainstSchema(fieldPath: string[], schema: Schema): FieldPathType {
  if (fieldPath.length === 0) {
    return new EntityType(schema);
  }
  const fieldName = fieldPath[0];
  if (!(fieldName in schema.fields)) {
    throw new FieldPathError(`Schema '${schema.toInlineSchemaString()}' does not contain field '${fieldName}'.`);
  }
  const field = schema.fields[fieldName];
  return evaluateAgainstField(fieldPath, field);
}

class FieldPathError extends Error {}
