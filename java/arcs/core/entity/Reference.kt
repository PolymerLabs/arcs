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
import arcs.core.data.Ttl
import arcs.core.storage.Reference as StorageReference
import arcs.core.util.Time

/** A reference to an [Entity]. */
class Reference<T : Entity>(
    val entitySpec: EntitySpec<T>,
    private val storageReference: StorageReference
) : Storable {
    /** The schema hash for the [Reference]'s associated schema. */
    val schemaHash = entitySpec.SCHEMA.hash

    /** The entity ID for the referenced entity. */
    val entityId = storageReference.id

    val creationTimestamp get() = storageReference.creationTimestamp
    val expirationTimestamp get() = storageReference.expirationTimestamp

    /** Returns the [Entity] pointed to by this reference. */
    suspend fun dereference() = storageReference.dereference()?.let { entitySpec.deserialize(it) }

    /** Returns a [Referencable] for this reference. */
    /* internal */ fun toReferencable(): StorageReference = storageReference

    fun ensureTimestamps(time: Time, ttl: Ttl) = storageReference.ensureTimestamps(time, ttl)

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is Reference<*>) return false
        if (entitySpec != other.entitySpec) return false
        if (storageReference != other.storageReference) return false
        return true
    }

    override fun hashCode(): Int {
        var result = entitySpec.hashCode()
        result = 31 * result + storageReference.hashCode()
        return result
    }
}
