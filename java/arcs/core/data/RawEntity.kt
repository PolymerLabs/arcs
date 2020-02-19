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
    /** Entity expiration time (in millis). */
    @Suppress("GoodTime") // use Instant
    var expirationTimestamp: Long = NO_EXPIRATION
) : Referencable {
    override fun unwrap(): Referencable {
        return RawEntity(
            id = id,
            expirationTimestamp = expirationTimestamp,
            singletons = singletons.mapValues { it.value?.unwrap() },
            collections = collections.mapValues {
                it.value.map { item -> item.unwrap() }.toSet()
            }
        )
    }

    override fun setExpiration(expirationTimestamp: Long) {
        require(this.expirationTimestamp == NO_EXPIRATION) {
            "cannot override expirationTimestamp $expirationTimestamp"
        }
        @Suppress("GoodTime") // use Instant
        this.expirationTimestamp = expirationTimestamp
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
