/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs.core.data.builder

import arcs.core.data.FieldName
import arcs.core.data.FieldType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.expression.Expression
import arcs.core.data.expression.asExpr

/**
 * Builds a [Schema] object according to the configuration provided by the [block].
 *
 * Example:
 *
 * ```kotlin
 * val mySchema = schema("abcdefg12345") {
 *   addName("MySchema")
 *
 *   singletons {
 *     "firstName" to FieldType.Text
 *     "lastName" to FieldType.Text
 *     "age" to FieldType.Int
 *   }
 *
 *   collections {
 *     "parents" to FieldType.ListOf(FieldType.InlineEntity("abcdefg12345"))
 *   }
 * }
 * ```
 */
fun schema(hash: String, block: SchemaBuilder.() -> Unit = {}): Schema =
  SchemaBuilder(hash).apply(block).build()

/** Builder of [Schema] objects using a Kotlin DSL. See [schema]. */
@DataDsl
class SchemaBuilder(var hash: String) {
  private val names = mutableSetOf<SchemaName>()
  private val singletons = mutableMapOf<FieldName, FieldType>()
  private val collections = mutableMapOf<FieldName, FieldType>()

  /** The expression to use when defining the schema as a refined-type. */
  var refinement: Expression<Boolean> = true.asExpr()

  /** The expression to use when defining the schema as a query-result type. */
  var query: Expression<Boolean> = true.asExpr()

  /** Adds a [name] as a [SchemaName] to the [Schema] being built. */
  fun addName(name: String): SchemaBuilder {
    names.add(SchemaName(name))
    return this
  }

  /** Defines fields for the [Schema] which are single-values (singletons). */
  fun singletons(block: SchemaFieldMapBuilder.() -> Unit): SchemaBuilder {
    singletons.clear()
    singletons.putAll(SchemaFieldMapBuilder().apply(block).build())
    return this
  }

  /** Defines fields for the [Schema] which are sets of values (collections). */
  fun collections(block: SchemaFieldMapBuilder.() -> Unit): SchemaBuilder {
    collections.clear()
    collections.putAll(SchemaFieldMapBuilder().apply(block).build())
    return this
  }

  /** Builds a [Schema] object from the configured components. */
  fun build(): Schema {
    return Schema(
      names = names,
      fields = SchemaFields(singletons, collections),
      hash = hash,
      refinementExpression = refinement,
      queryExpression = query
    )
  }

  /** Allows the construction of a [SchemaFields] map. */
  @DataDsl
  class SchemaFieldMapBuilder internal constructor() {
    private val map = mutableMapOf<FieldName, FieldType>()

    /** Adds a mapping from name to [FieldType]. */
    infix fun String.to(type: FieldType) {
      map[this] = type
    }

    /** Buidls a [Map] of [FieldName], [FieldType] pairs. */
    fun build(): Map<FieldName, FieldType> = map
  }
}
