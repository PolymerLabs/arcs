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

/**
 * Computes the union of the two [Schema] instances. Returns [Outcome.Failure] if the union
 * is not possible as the inputs are incompatible.
 */
infix fun Schema.union(other: Schema): Outcome<Schema> {
    val newNames = names union other.names
    val newFields = (fields union other.fields).getOrElse { return Outcome.Failure(it) }
    // TODO(bgogul): hash, refinement, query
    return Schema(names = newNames, fields = newFields, hash = "").toSuccess()
}

infix fun EntityType.union(other: EntityType): Outcome<EntityType> {
    val newSchema = (entitySchema union other.entitySchema)
        .getOrElse { return Outcome.Failure(it) }
    return EntityType(newSchema).toSuccess()
}

/**
 * Returns the result of combining two different field maps.
 *
 * If the maps have common [FieldName] entries, the union succeeds if and only if the corresponding
 * [FieldType] values are the same.
 */
private fun Map<FieldName, FieldType>.unionFields(
    other: Map<FieldName, FieldType>
): Outcome<Map<FieldName, FieldType>> {
    val result = mutableMapOf<FieldName, FieldType>()
    result.putAll(this)
    other.forEach { (name, type) ->
        val existing = this.get(name)
        if (existing != null && type != existing) {
            // TODO(bgogul): `type != exisiting` check is not sufficient for non-primitive types.
            return Outcome.Failure(
                "Incompatible types for field '$name': $type vs. $existing."
            )
        }
        result.put(name, type)
    }
    return result.toSuccess()
}

/**
 * Computes the union of [SchemaField] instances. Returns [Outcome.Failure] if the union
 * results in any incompatibility. e.g., incompatible [FieldType] with the same name.
 */
private infix fun SchemaFields.union(other: SchemaFields): Outcome<SchemaFields> {
    val newSingletons = singletons.unionFields(other.singletons)
        .getOrElse { return Outcome.Failure(it) }
    val newCollections = singletons.unionFields(other.singletons)
        .getOrElse { return Outcome.Failure(it) }
    return SchemaFields(singletons = newSingletons, collections = newCollections).toSuccess()
}
