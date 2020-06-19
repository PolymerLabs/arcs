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
import arcs.core.storage.Reference as StorageReference
import arcs.core.storage.StorageKey
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.Time

/** Converts instances of developer-facing type [T] into a raw storage instances of type [R]. */
sealed class StorageAdapter<T : Storable, R : Referencable> {
    /** Converts a [Storable] of type [T] into a [Referencable] of type [R]. */
    abstract fun storableToReferencable(value: T): R

    /** Converts a [Referencable] of type [R] into a [Storable] of type [T]. */
    abstract fun referencableToStorable(referencable: R): T

    /** Checks if the [Storable] is expired (its expiration time is in the past). */
    abstract fun isExpired(value: T): Boolean

    fun checkStorageKey(handleKey: StorageKey, referencedKey: StorageKey) {
        // References always point to backing stores (this is also enforced at reference creation).
        check(referencedKey !is ReferenceModeStorageKey) {
            "Reference points to ReferenceModeStorageKey $referencedKey, this is invalid."
        }
        var entitiesKey = handleKey
        if (handleKey is ReferenceModeStorageKey) {
            // For reference mode keys, check that the container and backing stores are compatible.
            checkStorageKey(handleKey.backingKey, handleKey.storageKey)
            entitiesKey = handleKey.backingKey
        }
        // If we are pointing to an entity in the database, we should also be using a storage key in
        // the same database. Otherwise the entity may be garbage collected from the database and
        // the reference become invalid.
        if (referencedKey is DatabaseStorageKey) {
            check(entitiesKey is DatabaseStorageKey && entitiesKey.dbName == referencedKey.dbName) {
                "References to database entity should only be stored in the same database. " +
                    "You are using $handleKey to store a reference that lives in the " +
                    "${referencedKey.dbName} database."
            }
        }
    }
}

/** [StorageAdapter] for converting [Entity] to/from [RawEntity]. */
@Suppress("GoodTime") // use Instant
class EntityStorageAdapter<T : Entity>(
    val handleName: String,
    val idGenerator: Id.Generator,
    val entitySpec: EntitySpec<T>,
    private val ttl: Ttl,
    private val time: Time,
    private val dereferencerFactory: EntityDereferencerFactory,
    private val storageKey: StorageKey
) : StorageAdapter<T, RawEntity>() {
    override fun storableToReferencable(value: T): RawEntity {
        value.ensureEntityFields(idGenerator, handleName, time, ttl)

        val rawEntity = value.serialize()
        // Check storage key for all reference fields.
        rawEntity.allData.forEach { (_, value) ->
            if (value is StorageReference) { checkStorageKey(storageKey, value.storageKey) }
        }

        require(entitySpec.SCHEMA.refinement(rawEntity)) {
            "Invalid entity stored to handle $handleName(failed refinement)"
        }
        return rawEntity
    }

    override fun referencableToStorable(referencable: RawEntity): T {
        dereferencerFactory.injectDereferencers(entitySpec.SCHEMA, referencable)
        return entitySpec.deserialize(referencable)
    }

    override fun isExpired(value: T): Boolean {
        return value.expirationTimestamp != RawEntity.UNINITIALIZED_TIMESTAMP &&
            value.expirationTimestamp < time.currentTimeMillis
    }
}

/** [StorageAdapter] for converting [Reference] to/from [StorageReference]. */
class ReferenceStorageAdapter<E : Entity>(
    private val entitySpec: EntitySpec<E>,
    private val dereferencerFactory: EntityDereferencerFactory,
    private val ttl: Ttl,
    private val time: Time,
    private val storageKey: StorageKey
) : StorageAdapter<Reference<E>, StorageReference>() {
    override fun storableToReferencable(value: Reference<E>): StorageReference {
        value.ensureTimestampsAreSet(time, ttl)
        val referencable = value.toReferencable()
        checkStorageKey(storageKey, referencable.storageKey)
        return referencable
    }

    override fun referencableToStorable(referencable: StorageReference): Reference<E> {
        dereferencerFactory.injectDereferencers(entitySpec.SCHEMA, referencable)
        return Reference(entitySpec, referencable)
    }

    override fun isExpired(value: Reference<E>): Boolean {
        return value.expirationTimestamp != RawEntity.UNINITIALIZED_TIMESTAMP &&
            value.expirationTimestamp < time.currentTimeMillis
    }
}
