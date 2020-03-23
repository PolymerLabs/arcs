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
import arcs.core.data.SingletonType
import arcs.core.data.TypeVariable
import arcs.core.type.Type
import arcs.core.util.Result
import arcs.core.util.getOrThrow
import arcs.core.util.resultOf

/**
 * Computes the union of the two [Schema] instances. Returns [Result.Err] if the union
 * is not possible as the inputs are incompatible.
 */
fun Schema.union(other: Schema): Result<Schema> = resultOf {
    // TODO(bgogul): sort the schema names. We should probably do this in
    // the constructor of Schema itself.
    val newNames = names.union(other.names).toList()
    val newFields = fields.union(other.fields).getOrThrow()
    // TODO(bgogul): hash, refinement, query
    Schema(names = newNames, fields = newFields, hash = "")
}

fun EntityType.union(other: EntityType): Result<EntityType> = resultOf {
    val newSchema = entitySchema.union(other.entitySchema).getOrThrow()
    EntityType(newSchema)
}

/**
 * Returns the result of combining two different field maps.
 *
 * If the maps have common [FieldName] entries, the union succeeds if and only if the corresponding
 * [FieldType] values are the same.
 */
private fun Map<FieldName, FieldType>.unionFields(
    other: Map<FieldName, FieldType>
): Result<Map<FieldName, FieldType>> = resultOf {
    val result = mutableMapOf<FieldName, FieldType>()
    result.putAll(this)
    other.forEach { entry ->
        val existing = this.get(entry.key)
        require(existing == null || entry.value == existing) {
            "Incompatible field types."
        }
        result.put(entry.key, entry.value)
    }
    result
}

/**
 * Computes the union of [SchemaField] instances. Returns [Result.Err] if the union
 * results in any incompatibility. e.g., incompatible [FieldType] with the same name.
 */
private fun SchemaFields.union(other: SchemaFields): Result<SchemaFields> = resultOf {
    SchemaFields(
        singletons = singletons.unionFields(other.singletons).getOrThrow(),
        collections = collections.unionFields(other.collections).getOrThrow()
    )
}
