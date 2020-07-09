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
import arcs.core.data.expression.Expression
import arcs.core.data.expression.asScope
import arcs.core.data.expression.evalExpression
import arcs.core.type.Type

/** Returns true if the RawEntity data matches the refinement predicate */
typealias Refinement = (data: RawEntity) -> Boolean

/** Returns true if the RawEntity data matches the query predicate (given a query argument) */
typealias Query = (data: RawEntity, queryArgs: Any) -> Boolean

data class Schema(
    val names: Set<SchemaName>,
    val fields: SchemaFields,
    /**
     * The hash code for the schema (note that this is not the same as this object's [hashCode]
     * method.
     */
    val hash: String,
    val refinementExpression: Expression<Boolean> = Expression.BooleanLiteralExpression(true),
    val queryExpression: Expression<Boolean> = Expression.BooleanLiteralExpression(true),
    val refinement: Refinement = { rawEntity ->
        evalExpression(refinementExpression, rawEntity.asScope())
    },
    val query: Query? = { data, args ->
        evalExpression(queryExpression, data.asScope(), "1" to args)
    }
) {
    val name: SchemaName?
        get() = names.firstOrNull()

    private val emptyRawEntity: RawEntity
        get() = RawEntity(
            singletonFields = fields.singletons.keys,
            collectionFields = fields.collections.keys
        )

    fun toLiteral(): Literal = Literal(names, fields, hash)

    fun createCrdtEntityModel(): CrdtEntity = CrdtEntity(VersionMap(), emptyRawEntity)

    override fun toString() = toString(Type.ToStringOptions())

    /**
     * @param options granular options, e.g. whether to list Schema fields.
     */
    fun toString(options: Type.ToStringOptions) =
        names.map { it.name }.plusElement(fields.toString(options)).joinToString(" ")

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

        val EMPTY = Schema(
            setOf(),
            SchemaFields(emptyMap(), emptyMap()),
            // Calculated from TypeScript's Schema.hash() function for an empty schema.
            "42099b4af021e53fd8fd4e056c2568d7c2e3ffa8"
        )
    }
}

/** Defines a [Type] that's capable of providing a schema for its entities. */
interface EntitySchemaProviderType : Type {
    /** [Schema] for the entity/entities managed by this [Type]. */
    val entitySchema: Schema?
}
