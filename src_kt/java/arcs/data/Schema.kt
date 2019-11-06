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

package arcs.data

import arcs.crdt.CrdtEntity
import arcs.crdt.internal.VersionMap
import arcs.type.Type

class Schema(
  val names: List<SchemaName>,
  val fields: SchemaFields,
  val description: SchemaDescription
) {
  val name: SchemaName?
    get() = names.firstOrNull()

  val emptyRawEntity: RawEntity
    get() = RawEntity(singletonFields = fields.singletons, collectionFields = fields.collections)

  fun toLiteral(): Literal = Literal(names, fields, description)

  fun createCrdtEntityModel(): CrdtEntity = CrdtEntity(VersionMap(), emptyRawEntity)

  data class Literal(
    val names: List<SchemaName>,
    val fields: SchemaFields,
    val description: SchemaDescription
  ) : arcs.common.Literal {
    fun toJson(): String {
      // TODO: Actually use a json serializer when we're ready for it.
      return "{\"names\":[\"${names.joinToString { "\"$it\"" }}\"]}"
    }
  }

  companion object {
    fun fromLiteral(literal: arcs.common.Literal): Schema {
      TODO("Implement me.")
    }
  }
}

/** Defines a [Type] that's capable of providing a schema for its entities. */
interface EntitySchemaProviderType : Type {
  /** [Schema] for the entity/entities managed by this [Type]. */
  val entitySchema: Schema?
}

