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
import {InterfaceInfo, Type, EntityType, TupleType} from './type.js';
import {SchemaPrimitiveTypeValue} from './manifest-ast-nodes.js';

export type FieldPathType = Type | SchemaPrimitiveTypeValue;

/**
 * Resolves a field path against the given Type. Returns the Type referenced by
 * the field path if valid. Throws an exception if the field path is invalid.
 */
export function resolveFieldPathType(fieldPath: string[], type: Type): FieldPathType {
  if (fieldPath.length === 0) {
    return type;
  }
  if (typeof type === 'string') {
    throw new FieldPathError(`Field path '${fieldPath.join('.')}' could not be resolved because the target type is a primitive: '${type}'.`);
  }
  if (type.isTupleType()) {
    return resolveForTuple(fieldPath, type);
  } else if (type.isTypeContainer()) {
    return resolveFieldPathType(fieldPath, type.getContainedType());
  }

  const schema = type.getEntitySchema();
  if (!schema) {
    if (InterfaceInfo.isTypeVar(type)) {
      if (type.canWriteSuperset == null) {
        throw new FieldPathError(`Type variable ${type} does not contain field '${fieldPath[0]}'.`);
      }
      return resolveFieldPathType(fieldPath, type.canWriteSuperset);
    } else {
      throw new FieldPathError(`Expected type to contain an entity schema: ${type}.`);
    }
  }

  return resolveForSchema(fieldPath, schema);
}

/** Checks a field path for a particular field definition. */
function resolveForField(fieldPath: string[], field): FieldPathType {
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
      return resolveForField(fieldPath, field.schema);
    }
    case 'schema-reference': {
      // Check rest of field path against inner type.
      return resolveForSchema(fieldPath.slice(1), field.schema.model.entitySchema);
    }
    default:
      throw new FieldPathError(`Unsupported field type: ${JSON.stringify(field)}`);
  }
}

/** Checks a field path against the given Schema. */
function resolveForSchema(fieldPath: string[], schema: Schema): FieldPathType {
  if (fieldPath.length === 0) {
    return new EntityType(schema);
  }
  const fieldName = fieldPath[0];
  if (!(fieldName in schema.fields)) {
    throw new FieldPathError(`Schema '${schema.toInlineSchemaString()}' does not contain field '${fieldName}'.`);
  }
  const field = schema.fields[fieldName];
  return resolveForField(fieldPath, field);
}

function resolveForTuple(fieldPath: string[], tupleType: TupleType): FieldPathType {
  if (fieldPath.length === 0) {
    return tupleType;
  }
  const first = fieldPath[0];
  const match = first.match(/component(\d+)/);
  if (match == null) {
    throw new FieldPathError(`Expected a tuple component accessor of the form 'componentN' but found '${first}'.`);
  }
  const component = +match[1];
  if (component >= tupleType.innerTypes.length) {
    throw new FieldPathError(`'${first}' requested but largest component in tuple is 'component${tupleType.innerTypes.length - 1}'.`);
  }
  return evaluateFieldPath(fieldPath.slice(1), tupleType.innerTypes[component]);
}

class FieldPathError extends Error {}
