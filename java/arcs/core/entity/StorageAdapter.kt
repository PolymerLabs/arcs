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
package arcs.core.entity

import arcs.core.common.Id
import arcs.core.common.Referencable
import arcs.core.data.RawEntity
import arcs.core.data.Ttl
import arcs.core.util.Time
import arcs.core.storage.Reference as StorageReference

sealed class StorageAdapter<T : HandleContent> {
    abstract fun toStorage(value: T): Referencable
    abstract fun fromStorage(referencable: Referencable): T
}

/** Prepares the provided entity and serializes it for storage. */
@Suppress("GoodTime") // use Instant
class EntityStorageAdapter<T : Entity>(
    val handleName: String,
    val idGenerator: Id.Generator,
    val entitySpec: EntitySpec<T>,
    val ttl: Ttl,
    val time: Time,
    private val dereferencerFactory: EntityDereferencerFactory
) : StorageAdapter<T>() {
    override fun toStorage(value: T): RawEntity {
        value.ensureIdentified(idGenerator, handleName)

        val rawEntity = value.serialize()

        rawEntity.creationTimestamp = time.currentTimeMillis
        require(entitySpec.SCHEMA.refinement(rawEntity)) {
            "Invalid entity stored to handle $handleName(failed refinement)"
        }
        if (ttl != Ttl.Infinite) {
            rawEntity.expirationTimestamp = ttl.calculateExpiration(time)
        }
        return rawEntity
    }

    override fun fromStorage(referencable: Referencable): T {
        require(referencable is RawEntity) {
            "EntityStorageAdapter expected RawEntity, got $referencable."
        }
        dereferencerFactory.injectDereferencers(entitySpec.SCHEMA, referencable)
        return entitySpec.deserialize(referencable)
    }
}

/** [StorageAdapter] for converting [Reference] to/from [StorageReference]. */
class ReferenceStorageAdapter<E : Entity>(
    private val entitySpec: EntitySpec<E>
) : StorageAdapter<Reference<E>>() {
    override fun toStorage(value: Reference<E>) = value.toReferencable()

    override fun fromStorage(referencable: Referencable): Reference<E> {
        require(referencable is StorageReference) {
            "EntityStorageAdapter expected arcs.core.storage.Reference, got $referencable."
        }
        return Reference(entitySpec, referencable)
    }
}
