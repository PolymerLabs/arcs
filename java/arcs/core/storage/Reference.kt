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

package arcs.core.storage

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.crdt.VersionMap
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.Dispatchers

/**
 * [arcs.core.storage.ReferenceModeStore] uses an expanded notion of Reference that also includes a
 * [version] and a [storageKey].
 *
 * This allows stores to block on receiving an update to contained Entities, which keeps remote
 * versions of the store in sync with each other.
 */
data class Reference(
    override val id: ReferenceId,
    val storageKey: StorageKey,
    val version: VersionMap?,
    /** Reference creation time (in milliseconds). */
    override val creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP,
    /** Reference expiration time (in milliseconds). */
    override val expirationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP
) : Referencable, arcs.core.data.Reference<RawEntity> {
    /* internal */
    var dereferencer: Dereferencer<RawEntity>? = null

    override suspend fun dereference(coroutineContext: CoroutineContext): RawEntity? =
        requireNotNull(dereferencer).dereference(this, coroutineContext)

    fun referencedStorageKey() = storageKey.childKeyWithComponent(id)
}

/** Defines an object capable of de-referencing a [Reference]. */
interface Dereferencer<T> {
    suspend fun dereference(
        reference: Reference,
        coroutineContext: CoroutineContext = Dispatchers.Default
    ): T?

    /**
     * Factory for constructing [Dereferencer] instances, and for injecting them into other
     * values.
     */
    interface Factory<T> {
        /** Constructs a [Dereferencer] for the given [Schema]. */
        fun create(schema: Schema): Dereferencer<T>

        /**
         * Recursively injects the given value with appropriate [Dereferencer] instances for it and
         * all of its nested fields.
         */
        fun injectDereferencers(schema: Schema, value: Any?)
    }
}

/** Converts any [Referencable] object into a reference-mode-friendly [Reference] object. */
fun Referencable.toReference(storageKey: StorageKey, version: VersionMap? = null) =
    Reference(id, storageKey, version, creationTimestamp, expirationTimestamp)
