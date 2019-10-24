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

import arcs.type.Tag
import arcs.type.Type
import arcs.type.TypeFactory
import arcs.type.TypeLiteral

/** Extension function to wrap any [Type] with a [BigCollectionType]. */
fun <T : Type> T?.bigCollectionOf(): BigCollectionType<T>? = this?.let { BigCollectionType(it) }

/** [Type] representation of a big collection. */
class BigCollectionType<T : Type>(
  val collectionType: T
) : Type,
  Type.TypeContainer<T>,
  Type.TypeVariableMerger,
  Type.CanReadWriteHolder,
  EntitySchemaProviderType {

  override val tag: Tag = Tag.BigCollection
  override val containedType: T
    get() = collectionType
  override val entitySchema: Schema?
    get() = (collectionType as? EntitySchemaProviderType)?.entitySchema
  override val canReadSubset: Type?
    get() = InterfaceType(tag.name, emptyList(), emptyList())
  override val canWriteSuperset: Type?
    get() = InterfaceType(tag.name, emptyList(), emptyList())
  override val canEnsureResolved: Boolean
    get() = collectionType.canEnsureResolved
  override val resolvedType: BigCollectionType<*>?
    get() {
      val resolvedCollectionType = collectionType.resolvedType
      return if (resolvedCollectionType !== collectionType) {
        resolvedCollectionType.bigCollectionOf()
      } else this
    }

  override fun maybeEnsureResolved(): Boolean = collectionType.maybeEnsureResolved()

  override fun mergeTypeVariablesByName(variableMap: MutableMap<Any, Any>): BigCollectionType<*> {
    val result = (collectionType as? Type.TypeVariableMerger)?.mergeTypeVariablesByName(variableMap)

    return if (result !== collectionType && result != null) {
      requireNotNull(result.bigCollectionOf())
    } else this
  }

  override fun copy(variableMap: MutableMap<Any, Any>): Type =
    TypeFactory.getType(Literal(tag, collectionType.copy(variableMap).toLiteral()))

  override fun copyWithResolutions(variableMap: MutableMap<Any, Any>): Type =
    BigCollectionType(collectionType.copyWithResolutions(variableMap))

  override fun toLiteral(): TypeLiteral = Literal(tag, collectionType.toLiteral())

  override fun toString(options: Type.ToStringOptions): String {
    return if (options.pretty) {
      entitySchema?.description?.plural ?: "Collection of ${collectionType.toString(options)}"
    } else {
      "BigCollection<${collectionType.toString(options)}>"
    }
  }

  /** [Literal] representation of a [BigCollectionType]. */
  data class Literal(override val tag: Tag, override val data: TypeLiteral) : TypeLiteral

  companion object {
    init {
      TypeFactory.registerBuilder(Tag.BigCollection) { literal ->
        BigCollectionType(TypeFactory.getType(literal.data))
      }
    }
  }
}
