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

import arcs.core.common.Referencable
import arcs.core.data.Capability.Ttl
import arcs.core.storage.RawReference
import arcs.core.util.Time

/**
 * A user-level reference to an [Entity].
 *
 * Instances of this class carry both a [RawReference] (which provides information about where
 * the underlying entity is stored) and an [EntitySpec] (which provides information about the
 * structure of the underlying entity).
 */
data class Reference<T : Entity>(
  val entitySpec: EntitySpec<T>,
  private val rawReference: RawReference
) : Storable {
  /** The schema hash for the [Reference]'s associated schema. */
  val schemaHash = entitySpec.SCHEMA.hash

  /** The entity ID for the referenced entity. */
  val entityId = rawReference.id

  val creationTimestamp
    get() = rawReference.creationTimestamp
  val expirationTimestamp
    get() = rawReference.expirationTimestamp

  /**
   * Hard references are used for deletion propagation. If an entity contains an hard reference,
   * it is only valid as long as the reference is alive (dereferences).
   */
  val isHardReference
    get() = rawReference.isHardReference

  fun setHardReference() {
    rawReference.isHardReference = true
  }

  /** Returns the [Entity] pointed to by this reference. */
  suspend fun dereference() = rawReference.dereference()?.let { entitySpec.deserialize(it) }

  /** Returns a [Referencable] for this reference. */
  /* internal */ fun toReferencable(): RawReference = rawReference

  fun ensureTimestampsAreSet(time: Time, ttl: Ttl) =
    rawReference.ensureTimestampsAreSet(time, ttl)
}
