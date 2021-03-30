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
import arcs.core.data.Capability.Ttl
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.storage.RawReference
import arcs.core.storage.StorageKey
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.Time

/** Converts between developer-facing types [E] and [I] and raw storage instances of type [R]. */
sealed class StorageAdapter<E : Storable, I : Storable, R : Referencable> {
  /** Converts a [Storable] of type [I] into a [Referencable] of type [R]. */
  abstract fun storableToReferencable(value: I): R

  /** Converts a [Referencable] of type [R] into a [Storable] of type [E]. */
  abstract fun referencableToStorable(referencable: R): E

  /** Checks if the [Referencable] is expired (its expiration time is in the past). */
  abstract fun isExpired(value: R): Boolean

  protected fun checkStorageKey(handleKey: StorageKey, referencedKey: StorageKey) {
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

  /** Returns the ID of the given [Storable]. */
  abstract fun getId(value: I): String?
}

/** [StorageAdapter] for converting [Entity] to/from [RawEntity]. */
class EntityStorageAdapter<E : I, I : Entity>(
  private val handleName: String,
  private val idGenerator: Id.Generator,
  private val entitySpec: EntitySpec<E>,
  private val ttl: Ttl,
  private val time: Time,
  private val dereferencerFactory: EntityDereferencerFactory,
  private val storageKey: StorageKey,
  private val storeSchema: Schema? = null
) : StorageAdapter<E, I, RawEntity>() {
  override fun storableToReferencable(value: I): RawEntity {
    value.ensureEntityFields(idGenerator, handleName, time, ttl)

    val rawEntity = value.serialize(storeSchema)
    // Check storage key for all reference fields.
    rawEntity.allData.forEach { (_, value) ->
      if (value is RawReference) {
        checkStorageKey(storageKey, value.storageKey)
      }
    }

    require(entitySpec.SCHEMA.refinement(rawEntity)) {
      "Invalid entity stored to handle (failed refinement)\n" +
        "Handle name: $handleName\nSchema: ${entitySpec.SCHEMA}"
    }
    return rawEntity
  }

  override fun referencableToStorable(referencable: RawEntity): E {
    dereferencerFactory.injectDereferencers(entitySpec.SCHEMA, referencable)
    return entitySpec.deserialize(referencable)
  }

  override fun isExpired(value: RawEntity): Boolean {
    return value.expirationTimestamp != RawEntity.UNINITIALIZED_TIMESTAMP &&
      value.expirationTimestamp < time.currentTimeMillis
  }

  override fun getId(value: I) = value.entityId
}

/** [StorageAdapter] for converting [Reference] to/from [StorageReference]. */
class ReferenceStorageAdapter<E : Entity>(
  private val entitySpec: EntitySpec<E>,
  private val dereferencerFactory: EntityDereferencerFactory,
  private val ttl: Ttl,
  private val time: Time,
  private val storageKey: StorageKey
) : StorageAdapter<Reference<E>, Reference<E>, RawReference>() {
  override fun storableToReferencable(value: Reference<E>): RawReference {
    value.ensureTimestampsAreSet(time, ttl)
    val referencable = value.toReferencable()
    checkStorageKey(storageKey, referencable.storageKey)
    return referencable
  }

  override fun referencableToStorable(referencable: RawReference): Reference<E> {
    dereferencerFactory.injectDereferencers(entitySpec.SCHEMA, referencable)
    return Reference(entitySpec, referencable)
  }

  override fun isExpired(value: RawReference): Boolean {
    return value.expirationTimestamp != RawEntity.UNINITIALIZED_TIMESTAMP &&
      value.expirationTimestamp < time.currentTimeMillis
  }

  override fun getId(value: Reference<E>) = value.entityId
}
