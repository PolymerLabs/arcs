/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.analysis

import arcs.core.data.EntityType
import arcs.core.data.FieldName
import arcs.core.data.FieldType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields

/** Returns the union of two [EntityType] instances. */
infix fun EntityType.union(other: EntityType) = EntityType(entitySchema union other.entitySchema)

/** Returns the intersection of two [EntityType] instances. */
infix fun EntityType.intersect(other: EntityType): EntityType {
  return EntityType(entitySchema intersect other.entitySchema)
}

/**
 * Computes the union of the two [Schema] instances. Returns [Outcome.Failure] if the union
 * is not possible as the inputs are incompatible.
 */
infix fun Schema.union(other: Schema): Schema {
  // TODO(b/154235149): hash, refinement, query
  return Schema(
    names = names union other.names,
    fields = fields union other.fields,
    hash = ""
  )
}

/** Computes the intersection of the two [Schema] instances. */
infix fun Schema.intersect(other: Schema): Schema {
  // TODO(b/154235149): hash, refinement, query
  return Schema(
    names = names intersect other.names,
    fields = fields intersect other.fields,
    hash = ""
  )
}

/**
 * Computes the union of [SchemaFields] instances. Returns [Outcome.Failure] if the union
 * results in any incompatibility. e.g., incompatible [FieldType] with the same name.
 */
private infix fun SchemaFields.union(other: SchemaFields): SchemaFields {
  return SchemaFields(
    singletons = singletons union other.singletons,
    collections = collections union other.collections
  )
}

/** Computes the intersection of [SchemaFields] instances. */
private infix fun SchemaFields.intersect(other: SchemaFields): SchemaFields {
  return SchemaFields(
    singletons = singletons intersect other.singletons,
    collections = collections intersect other.collections
  )
}

/**
 * Returns the result of combining two different field maps.
 *
 * If the maps have common [FieldName] entries, the union succeeds if and only if the corresponding
 * [FieldType] values are the same.
 */
private infix fun Map<FieldName, FieldType>.union(
  other: Map<FieldName, FieldType>
): Map<FieldName, FieldType> {
  val result = mutableMapOf<FieldName, FieldType>()
  result.putAll(this)
  other.forEach { (name, type) ->
    val existing = this[name]
    if (existing != null && type != existing) {
      throw TypeCheckException(
        "Incompatible types for field '$name': $type vs. $existing."
      )
    }
    result[name] = type
  }
  return result
}

/** Returns the intersection of two field maps. */
private infix fun Map<FieldName, FieldType>.intersect(
  other: Map<FieldName, FieldType>
): Map<FieldName, FieldType> {
  // TODO(b/156983624): Reference fields should not be compared with equality. Instead we should
  // descend into the nested schema and recursively intersect those too.
  return filter { (name, type) -> other[name] == type }
}
