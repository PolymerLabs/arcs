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
    val collections: Map<FieldName, Set<Referencable>> = emptyMap()
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
        entity.expirationTimestamp = expirationTimestamp
        return entity
    }

    /** Entity expiration time (in millis). */
    @Suppress("GoodTime") // use Instant
    override var expirationTimestamp: Long = NO_EXPIRATION
        set(value) {
            require(this.expirationTimestamp == NO_EXPIRATION) {
                "cannot override expirationTimestamp $value"
            }
            @Suppress("GoodTime") // use Instant
            field = value
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
        collectionFields.associateWith { emptySet<Referencable>() }
    ) {
        this.expirationTimestamp = expirationTimestamp
    }

    companion object {
        const val NO_REFERENCE_ID = "NO REFERENCE ID"
        const val NO_EXPIRATION: Long = -1
    }
}

fun RawEntity(
    id: String,
    singletons: Map<FieldName, Referencable?>,
    collections: Map<FieldName, Set<Referencable>>,
    expirationTimestamp: Long
) =
RawEntity(id, singletons, collections).also { it.expirationTimestamp = expirationTimestamp }
