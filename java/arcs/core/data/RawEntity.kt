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

  // Cached `hashCode` value.
  private var hashCode: Int = UNINITIALIZED_HASH

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

  override fun equals(other: Any?): Boolean {
    if (this === other) return true
    if (javaClass != other?.javaClass) return false

    other as RawEntity

    if (id != other.id) return false
    if (singletons != other.singletons) return false
    if (collections != other.collections) return false
    if (creationTimestamp != other.creationTimestamp) return false
    if (expirationTimestamp != other.expirationTimestamp) return false

    return true
  }

  /** Computes and caches `hashCode`. */
  override fun hashCode(): Int {
    if (UNINITIALIZED_HASH == hashCode) {
      var result = id.hashCode()
      result = 31 * result + singletons.hashCode()
      result = 31 * result + collections.hashCode()
      result = 31 * result + creationTimestamp.hashCode()
      result = 31 * result + expirationTimestamp.hashCode()

      // If the hash happens to be the sentinel value, choose a different value.
      if (UNINITIALIZED_HASH == result) {
        result = 1
      }
      hashCode = result
    }
    return hashCode
  }

  companion object {
    const val NO_REFERENCE_ID = "NO REFERENCE ID"
    const val UNINITIALIZED_TIMESTAMP: Long = -1
    const val UNINITIALIZED_HASH: Int = 0
  }
}
