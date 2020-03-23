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
        val entity = RawEntity(
            id = id,
            creationTimestamp = creationTimestamp,
            expirationTimestamp = expirationTimestamp,
            singletons = singletons.mapValues { it.value?.unwrap() },
            collections = collections.mapValues {
                it.value.map { item -> item.unwrap() }.toSet()
            }
        )
        entity.creationTimestamp = creationTimestamp
        entity.expirationTimestamp = expirationTimestamp
        return entity
    }

    /** Entity creation time (in millis). */
    @Suppress("GoodTime") // use Instant
    override var creationTimestamp: Long = UNINITIALIZED_TIMESTAMP
        set(value) {
            require(this.creationTimestamp == UNINITIALIZED_TIMESTAMP) {
                "cannot override creationTimestamp $value"
            }
            @Suppress("GoodTime") // use Instant
            field = value
        }

    /** Entity expiration time (in millis). */
    @Suppress("GoodTime") // use Instant
    override var expirationTimestamp: Long = UNINITIALIZED_TIMESTAMP
        set(value) {
            require(this.expirationTimestamp == UNINITIALIZED_TIMESTAMP) {
                "cannot override expirationTimestamp $value"
            }
            @Suppress("GoodTime") // use Instant
            field = value
        }

    /** Iterates over of all field data (both singletons and collections). */
    val allData: Sequence<Map.Entry<FieldName, Any?>>
        get() = sequence {
            yieldAll(singletons.asIterable())
            yieldAll(collections.asIterable())
        }

    /** Constructor for a [RawEntity] when only the field names are known. */
    constructor(
        id: ReferenceId = NO_REFERENCE_ID,
        singletonFields: Set<FieldName> = emptySet(),
        collectionFields: Set<FieldName> = emptySet(),
        creationTimestamp: Long = UNINITIALIZED_TIMESTAMP,
        expirationTimestamp: Long = UNINITIALIZED_TIMESTAMP
    ) : this(
        id,
        singletonFields.associateWith { null },
        collectionFields.associateWith { emptySet<Referencable>() }
    ) {
        this.expirationTimestamp = expirationTimestamp
        this.creationTimestamp = creationTimestamp
    }

    companion object {
        const val NO_REFERENCE_ID = "NO REFERENCE ID"
        const val UNINITIALIZED_TIMESTAMP: Long = -1
    }
}

fun RawEntity(
    id: String,
    singletons: Map<FieldName, Referencable?>,
    collections: Map<FieldName, Set<Referencable>>,
    creationTimestamp: Long,
    expirationTimestamp: Long
) = RawEntity(
    id,
    singletons,
    collections
).also {
    it.creationTimestamp = creationTimestamp
    it.expirationTimestamp = expirationTimestamp
}
