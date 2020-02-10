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

package arcs.core.crdt.extension

import arcs.core.common.Referencable
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.VersionMap
import arcs.core.data.Entity
import arcs.core.data.FieldName
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.util.Base64

/** Converts the [CrdtEntity.Data] model into an [Entity] as defined by the given [schema]. */
fun CrdtEntity.Data.toEntity(schema: Schema): Entity = toRawEntity().toEntity(schema)

/** Converts the [Entity] into a [CrdtEntity.Data] model, at the given version. */
fun Entity.toCrdtEntityData(versionMap: VersionMap): CrdtEntity.Data =
    CrdtEntity.Data(versionMap.copy(), toRawEntity()) { CrdtEntity.ReferenceImpl(it.id) }

private fun Entity.toRawEntity(): RawEntity {
    return RawEntity(
        this.id,
        singletons = this.data.filterValues { it !is Set<*>? }.mapValues { entry ->
            entry.value?.toReferencable()
        },
        collections = this.data.filterValues { it is Set<*> }.mapValues { entry ->
            entry.value?.let {
                val set = requireNotNull(it as? Set<*>)
                if (set.isEmpty()) {
                    emptySet()
                } else {
                    set.map(Any?::toReferencable).toSet()
                }
            } ?: throw IllegalArgumentException(
                "Entity contains null collection at field: ${entry.key}"
            )
        }
    )
}

private fun Any?.toReferencable(): Referencable {
    requireNotNull(this) { "Cannot create a referencable from a null value." }
    return when {
        ReferencablePrimitive.isSupportedPrimitive(this::class) -> {
            if (this is ByteArray) {
                ReferencablePrimitive(
                    ByteArray::class,
                    this,
                    valueRepr = Base64.encode(this)
                )
            } else {
                ReferencablePrimitive(this::class, this)
            }
        }
        this is Referencable -> this
        else -> throw IllegalArgumentException(
            "Entity contains non-referencable non-primitive values."
        )
    }
}

/** Converts the [RawEntity] to an [Entity] as defined by the given [schema]. */
private fun RawEntity.toEntity(schema: Schema): Entity {
    val data = mutableMapOf<FieldName, Any?>()

    singletons.forEach { (fieldName, referencable) ->
        data[fieldName] = referencable?.tryDereference()?.let {
            (it as? ReferencablePrimitive<*>)?.value ?: it
        }
    }

    collections.forEach { (fieldName, referencableSet) ->
        data[fieldName] = referencableSet.map {
            (it.tryDereference() as? ReferencablePrimitive<*>)?.value ?: it
        }.toSet()
    }

    // TODO: Do we need to assert that all of the fields from the schema are represented?

    return Entity(id, schema, data)
}
