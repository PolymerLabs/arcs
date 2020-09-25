package arcs.core.data

import arcs.core.type.Type

/**
 * If this Type represents a [SingletonType], [CollectionType], or [EntityType], return the
 * [Schema] used by the underlying [Entity] that this type represents.
 */
fun Type.toSchema() = when {
  this is SingletonType<*> && containedType is EntityType -> containedType.entitySchema
  this is CollectionType<*> && collectionType is EntityType -> collectionType.entitySchema
  this is EntityType -> entitySchema
  else -> throw IllegalArgumentException("Can't get entitySchema of unknown type $this")
}
