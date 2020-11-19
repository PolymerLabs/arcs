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

import arcs.core.type.Tag
import arcs.core.type.Type
import arcs.core.type.TypeFactory
import arcs.core.type.TypeLiteral

/**
 * [MuxType] is a wrapper around an [EntityType]
 *
 * The [MuxType] is used when a particle needs access to entities of the same [EntityType].
 * A particle can access several entities from a single storage stack if each entity is wrapped in
 * a [MuxType]. This ensures the storage stack manages data of the same type.
 */
data class MuxType<T : Type>(private val innerType: T) :
  Type, Type.TypeContainer<T>, EntitySchemaProviderType {
  override val tag = Tag.Mux
  override val containedType: T = innerType
  override val entitySchema: Schema?
    get() = (containedType as? EntitySchemaProviderType)?.entitySchema

  override fun copy(variableMap: MutableMap<Any, Any>): Type =
    TypeFactory.getType(Literal(tag, containedType.copy(variableMap).toLiteral()))

  override fun copyWithResolutions(variableMap: MutableMap<Any, Any>): Type =
    MuxType(containedType.copyWithResolutions(variableMap))

  override fun toLiteral() = Literal(tag, containedType.toLiteral())

  override fun toString() = "#$containedType"

  override fun toStringWithOptions(options: Type.ToStringOptions): String =
    "#${containedType.toStringWithOptions(options)}"

  data class Literal(override val tag: Tag, override val data: TypeLiteral) : TypeLiteral

  companion object {
    init {
      TypeFactory.registerBuilder(Tag.Mux) { literal ->
        MuxType(TypeFactory.getType(literal.data))
      }
    }
  }
}
