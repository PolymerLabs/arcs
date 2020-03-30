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

import arcs.core.storage.referencemode.ReferenceModeStorageKey

/**
 * Creates and returns a [Reference] to the given entity.
 *
 * The entity must already be stored and present in the handle before calling this method.
 */
@Suppress("UNCHECKED_CAST")
suspend fun <T : Entity> CollectionHandle<T>.createReference(entity: T): Reference<T> {
    val entityId = requireNotNull(entity.entityId) {
        "Entity must have an ID before it can be referenced."
    }
    val storageKey = requireNotNull(storageProxy.storageKey as? ReferenceModeStorageKey) {
        "ReferenceModeStorageKey required in order to create references."
    }
    require(fetchAll().any { it.entityId == entityId }) {
        "Entity is not stored in the Collection."
    }

    return Reference(
        spec.entitySpec,
        arcs.core.storage.Reference(entity.serialize().id, storageKey.backingKey, null).also {
            it.dereferencer = dereferencerFactory.create(spec.entitySpec.SCHEMA)
        }
    ) as Reference<T>
}

/**
 * Creates and returns a [Reference] to the given entity.
 *
 * The entity must already be stored and present in the handle before calling this method.
 */
@Suppress("UNCHECKED_CAST")
suspend fun <T : Entity> SingletonHandle<T>.createReference(entity: T): Reference<T> {
    val entityId = requireNotNull(entity.entityId) {
        "Entity must have an ID before it can be referenced."
    }
    val storageKey = requireNotNull(storageProxy.storageKey as? ReferenceModeStorageKey) {
        "ReferenceModeStorageKey required in order to create references."
    }
    require(fetch()?.entityId == entityId) {
        "Entity is not stored in the Singleton."
    }

    return Reference(
        spec.entitySpec,
        arcs.core.storage.Reference(entity.serialize().id, storageKey.backingKey, null).also {
            it.dereferencer = dereferencerFactory.create(spec.entitySpec.SCHEMA)
        }
    ) as Reference<T>
}
