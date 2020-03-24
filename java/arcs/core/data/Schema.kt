/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.data

import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.VersionMap
import arcs.core.data.Schema.Companion.hashCode
import arcs.core.type.Type

/** Returns true if the RawEntity data matches the refinement predicate */
typealias Refinement = (data: RawEntity) -> Boolean

/** Returns true if the RawEntity data matches the query predicate (given a query argument)*/
typealias Query = (data: RawEntity, queryArgs: Any) -> Boolean

data class Schema(
    val names: Set<SchemaName>,
    val fields: SchemaFields,
    /**
     * The hash code for the schema (note that this is not the same as this object's [hashCode]
     * method.
     */
    val hash: String,
    val refinement: Refinement = { _ -> true },
    val query: Query? = null
) {
    val name: SchemaName?
        get() = names.firstOrNull()

    @Deprecated("Use the primary constructor")
    constructor(
        names: List<SchemaName>,
        fields: SchemaFields,
        hash: String,
        refinement: Refinement = { _ -> true },
        query: Query? = null
    ) : this(names.toSet(), fields, hash, refinement, query)

    private val emptyRawEntity: RawEntity
        get() = RawEntity(
            singletonFields = fields.singletons.keys,
            collectionFields = fields.collections.keys
        )

    fun toLiteral(): Literal = Literal(names, fields, hash)

    fun createCrdtEntityModel(): CrdtEntity = CrdtEntity(VersionMap(), emptyRawEntity)

    data class Literal(
        val names: Set<SchemaName>,
        val fields: SchemaFields,
        val hash: String
    ) : arcs.core.common.Literal {
        fun toJson(): String {
            // TODO: Actually use a json serializer when we're ready for it.
            return "{\"names\":[\"${names.joinToString { "\"$it\"" }}\"]}"
        }
    }

    companion object {
        fun fromLiteral(@Suppress("UNUSED_PARAMETER") literal: arcs.core.common.Literal): Schema {
            TODO("Implement me.")
        }
    }
}

/** Defines a [Type] that's capable of providing a schema for its entities. */
interface EntitySchemaProviderType : Type {
    /** [Schema] for the entity/entities managed by this [Type]. */
    val entitySchema: Schema?
}
