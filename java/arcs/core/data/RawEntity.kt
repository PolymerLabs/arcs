/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.data

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId

/** Minimal representation of an unresolved [Entity]. */
data class RawEntity(
    /** Identifier for the raw entity. */
    override val id: ReferenceId = NO_REFERENCE_ID,
    /** Singleton fields and the [Referencable] values. */
    val singletons: Map<FieldName, Referencable?> = emptyMap(),
    /**
     * Collection ([Set]) fields and the set of [ReferenceId]s referencing the values in those
     * collections.
     */
    val collections: Map<FieldName, Set<Referencable>> = emptyMap(),
    /** Indication of the timestamp when this entity expires. */
    @Suppress("GoodTime") // use Instant
    val expirationTimestamp: Long = NO_EXPIRATION
) : Referencable {
    override fun tryDereference(): Referencable {
        return RawEntity(
            id = id,
            expirationTimestamp = expirationTimestamp,
            singletons = singletons.mapValues { it.value?.tryDereference() },
            collections = collections.mapValues {
                it.value.map { item -> item.tryDereference() }.toSet()
            }
        )
    }

    /** Constructor for a [RawEntity] when only the field names are known. */
    constructor(
        id: ReferenceId = NO_REFERENCE_ID,
        singletonFields: Set<FieldName> = emptySet(),
        collectionFields: Set<FieldName> = emptySet(),
        expirationTimestamp: Long = NO_EXPIRATION
    ) : this(
        id,
        singletonFields.associateWith { null },
        collectionFields.associateWith { emptySet<Referencable>() },
        expirationTimestamp
    )

    companion object {
        const val NO_REFERENCE_ID = "NO REFERENCE ID"
        const val NO_EXPIRATION: Long = -1
    }
}
