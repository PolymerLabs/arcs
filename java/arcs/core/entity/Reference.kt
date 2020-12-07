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
import arcs.core.util.Time
import arcs.core.storage.Reference as StorageReference

/** A reference to an [Entity]. */
data class Reference<T : Entity>(
  val entitySpec: EntitySpec<T>,
  private val storageReference: StorageReference
) : Storable {
  /** The schema hash for the [Reference]'s associated schema. */
  val schemaHash = entitySpec.SCHEMA.hash

  /** The entity ID for the referenced entity. */
  val entityId = storageReference.id

  val creationTimestamp
    get() = storageReference.creationTimestamp
  val expirationTimestamp
    get() = storageReference.expirationTimestamp

  /**
   * Hard references are used for deletion propagation. If an entity contains an hard reference,
   * it is only valid as long as the reference is alive (dereferences).
   */
  val isHardReference
    get() = storageReference.isHardReference

  fun setHardReference() {
    storageReference.isHardReference = true
  }

  /** Returns the [Entity] pointed to by this reference. */
  suspend fun dereference() = storageReference.dereference()?.let { entitySpec.deserialize(it) }

  /** Returns a [Referencable] for this reference. */
  /* internal */ fun toReferencable(): StorageReference = storageReference

  fun ensureTimestampsAreSet(time: Time, ttl: Ttl) =
    storageReference.ensureTimestampsAreSet(time, ttl)
}
