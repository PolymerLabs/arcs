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
@Suppress("GoodTime") // use Instant
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
    /** Entity creation time (in milliseconds). */
    override val creationTimestamp: Long = UNINITIALIZED_TIMESTAMP,
    /** Entity expiration time (in milliseconds). */
    override val expirationTimestamp: Long = UNINITIALIZED_TIMESTAMP
) : Referencable {
    override fun unwrap(): Referencable =
        RawEntity(
            id = id,
            creationTimestamp = creationTimestamp,
            expirationTimestamp = expirationTimestamp,
            singletons = singletons.mapValues { it.value?.unwrap() },
            collections = collections.mapValues {
                it.value.map { item -> item.unwrap() }.toSet()
            }
        )

    /** Iterates over of all field data (both singletons and collections). */
    val allData: Sequence<Map.Entry<FieldName, Any?>>
        get() = sequence {
            yieldAll(singletons.asIterable())
            yieldAll(collections.asIterable())
        }

    /** Constructor for a [RawEntity] when only the field names are known. */
    constructor(
        id: ReferenceId = NO_REFERENCE_ID,
        singletonFields: Set<FieldName>,
        collectionFields: Set<FieldName> = emptySet(),
        creationTimestamp: Long = UNINITIALIZED_TIMESTAMP,
        expirationTimestamp: Long = UNINITIALIZED_TIMESTAMP
    ) : this(
        id,
        singletonFields.associateWith { null },
        collectionFields.associateWith { emptySet<Referencable>() },
        creationTimestamp,
        expirationTimestamp
    )

    companion object {
        const val NO_REFERENCE_ID = "NO REFERENCE ID"
        const val UNINITIALIZED_TIMESTAMP: Long = -1
    }
}
