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
import arcs.core.data.Capability.Ttl
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.util.Time

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
  private var _creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP,
  /** Reference expiration time (in milliseconds). */
  private var _expirationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP,
  /**
   * Hard references are used for deletion propagation. If an entity contains an hard reference,
   * it is only valid as long as the reference is alive (dereferences). This need to be persisted
   * in storage to be able to clear storage when the reference becomes invalid.
   */
  var isHardReference: Boolean = false
) : Referencable, arcs.core.data.Reference<RawEntity> {
  /* internal */
  var dereferencer: Dereferencer<RawEntity>? = null

  override val creationTimestamp: Long get() = _creationTimestamp
  override val expirationTimestamp: Long get() = _expirationTimestamp

  fun ensureTimestampsAreSet(time: Time, ttl: Ttl) {
    if (_creationTimestamp == RawEntity.UNINITIALIZED_TIMESTAMP) {
      _creationTimestamp = time.currentTimeMillis
      if (ttl != Ttl.Infinite()) {
        _expirationTimestamp = ttl.calculateExpiration(time)
      }
    }
  }

  override suspend fun dereference(): RawEntity? =
    requireNotNull(dereferencer) {
      "No dereferencer installed on Reference object"
    }.dereference(this)

  fun referencedStorageKey() = storageKey.childKeyWithComponent(id)
}

/** Defines an object capable of de-referencing a [Reference]. */
interface Dereferencer<T> {
  suspend fun dereference(
    reference: Reference
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
