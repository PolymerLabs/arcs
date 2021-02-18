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

package arcs.core.data

import arcs.core.crdt.CrdtEntity
import arcs.core.data.Schema.Companion.hashCode
import arcs.core.data.expression.Expression
import arcs.core.data.expression.asExpr
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
  val refinementExpression: Expression<Boolean> = true.asExpr(),
  val queryExpression: Expression<Boolean> = true.asExpr()
) {

  /** Ensure instance is registered on construction. */
  init {
    SchemaRegistry.register(this)
  }

  val name: SchemaName?
    get() = names.firstOrNull()

  private val emptyRawEntity: RawEntity
    get() = RawEntity(
      singletonFields = fields.singletons.keys,
      collectionFields = fields.collections.keys
    )

  val refinement: Refinement = { rawEntity ->
    evalExpression(refinementExpression, rawEntity.asScope())
  }

  val query: Query? = { data, args ->
    evalExpression(queryExpression, data.asScope(), "queryArgument" to args)
  }

  fun toLiteral(): Literal = Literal(names, fields, hash, refinementExpression, queryExpression)

  fun createCrdtEntityModel(): CrdtEntity = CrdtEntity.newWithEmptyEntity(emptyRawEntity)

  override fun toString() = toString(Type.ToStringOptions())

  /**
   * @param options granular options, e.g. whether to list Schema fields.
   */
  fun toString(options: Type.ToStringOptions) =
    names.map { it.name }.plusElement(fields.toString(options)).joinToString(" ")

  data class Literal(
    val names: Set<SchemaName>,
    val fields: SchemaFields,
    val hash: String,
    val refinementExpression: Expression<Boolean>,
    val queryExpression: Expression<Boolean>
  ) : arcs.core.common.Literal {
    fun toJson(): String {
      // TODO: Actually use a json serializer when we're ready for it.
      return "{\"names\":[\"${names.joinToString { "\"$it\"" }}\"]}"
    }
  }

  companion object {
    /** Hydrates a [Schema] instance from a [Literal]. */
    fun fromLiteral(literal: arcs.core.common.Literal): Schema {
      val schemaLiteral = requireNotNull(literal as? Literal) {
        "Cannot interpret Schema from a non-Schema Literal"
      }

      return Schema(
        schemaLiteral.names,
        schemaLiteral.fields,
        schemaLiteral.hash,
        schemaLiteral.refinementExpression,
        schemaLiteral.queryExpression
      )
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
