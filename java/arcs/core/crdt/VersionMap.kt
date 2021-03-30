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

package arcs.core.crdt

import arcs.core.util.ACTOR_VERSION_DELIMITER
import arcs.core.util.ENTRIES_SEPARATOR
import arcs.flags.BuildFlagDisabledError
import arcs.flags.BuildFlags
import kotlin.math.max

/** Denotes an individual actor responsible for modifications to a CRDT. */
typealias Actor = String

/** Type of the version used in a [VersionMap]. */
typealias Version = Int

/** Vector clock implementation. */
class VersionMap(initialData: Map<Actor, Version> = emptyMap()) {
  constructor(initialData: VersionMap) : this(initialData.backingMap)
  constructor(vararg initialData: Pair<Actor, Version>) : this(mapOf(*initialData))
  constructor(actor: Actor, version: Version) : this(mapOf(actor to version))

  val backingMap = HashMap(initialData)

  /** The number of entries in the [VersionMap]. */
  val size: Int
    get() = backingMap.size

  /** All distinct [Actor]s represented in the [VersionMap]. */
  val actors: Set<Actor>
    get() = backingMap.keys

  /** Returns whether or not this [VersionMap] is empty. */
  fun isEmpty(): Boolean = backingMap.isEmpty()

  /** Returns whether or not this [VersionMap] contains items. */
  fun isNotEmpty(): Boolean = !isEmpty()

  /** Creates a deep copy of this [VersionMap]. */
  // toMutableMap is documented to copy the data.
  fun copy(): VersionMap = VersionMap(this.backingMap.toMutableMap())

  /** Increment the version for the provided `name` */
  fun increment(name: String) = this.also { it[name]++ }

  /**
   * Gets a the current [Version] for a given [Actor], or [DEFAULT_VERSION] if no value has been
   * set.
   */
  operator fun get(key: Actor): Version = backingMap[key] ?: DEFAULT_VERSION

  /** Sets the current [Version] for a given [Actor]. */
  operator fun set(key: Actor, value: Version) {
    backingMap[key] = value
  }

  /** Returns whether or not this [VersionMap] contains a value for the given [Actor]. */
  operator fun contains(actor: Actor): Boolean = actor in backingMap

  /**
   * Determines whether or not this [VersionMap] 'dominates' another.
   *
   * A [VersionMap] is said to dominate another [VersionMap] if and only if, for all
   * `(a_O: [Actor], v_O: [Version])` entry in the other map, there exists a
   * `(a_T: [Actor], v_T: [Version])` entry in this [VersionMap] such that:
   *
   * `a_T == a_0 && v_T >= v_0`
   */
  infix fun dominates(other: VersionMap): Boolean =
    other.backingMap.all { this[it.key] >= it.value }

  infix fun doesNotDominate(other: VersionMap): Boolean = !(this dominates other)

  /**
   * Merges this [VersionMap] with another [VersionMap] by taking the maximum version values for
   * the union of all [Actor]s and returns the merged result.
   *
   * **Note:** Does not modify either object.
   */
  infix fun mergeWith(other: VersionMap): VersionMap {
    val result = VersionMap(backingMap)
    other.backingMap.forEach { (actor, version) -> result[actor] = max(version, result[actor]) }
    return result
  }

  /**
   * Subtracts the other [VersionMap] from the receiver and returns the actor-by-actor difference
   * in a new [VersionMap]. Only greater-than-zero differences will be returned.
   */
  operator fun minus(other: VersionMap): VersionMap {
    // Return an empty result if the other map is newer than this one.
    if (other dominates this) return VersionMap()

    return VersionMap(
      backingMap.mapValues { (actor, version) -> version - other[actor] }
        .filter { it.value > 0 }
    )
  }

  /**
   * Encode the version map for storage in as short a format as possible. The format is
   * "actorA|versionA;actorB|versionB". So if the version map holds a backing map of
   * `{foo: 1, bar:2, fooBar: 3}` this would be encoded as "foo|1;bar|2;fooBar|3".
   */
  fun encode(): String {
    if (!BuildFlags.STORAGE_STRING_REDUCTION) {
      throw BuildFlagDisabledError("STORAGE_STRING_REDUCTION")
    }
    return backingMap.asSequence().joinToString(ENTRIES_SEPARATOR.toString()) { (actor, version) ->
      "$actor$ACTOR_VERSION_DELIMITER$version"
    }
  }

  override fun equals(other: Any?): Boolean {
    if (this === other) return true
    return other is VersionMap && backingMap == other.backingMap
  }

  override fun hashCode(): Int = backingMap.hashCode()

  override fun toString(): String =
    backingMap.entries
      .sortedBy { it.key }.joinToString(
        prefix = "{", postfix = "}"
      ) { "${it.key}: ${it.value}" }

  companion object {
    /** Default starting version for any actor. */
    const val DEFAULT_VERSION: Version = 0

    /**
     * Create a new VersionMap by decoding an encoded version map. Version maps can be encoded by
     * calling [encode]. See [encode] for details about the encoding format.
     */
    fun decode(str: String): VersionMap {
      if (!BuildFlags.STORAGE_STRING_REDUCTION) {
        throw BuildFlagDisabledError("STORAGE_STRING_REDUCTION")
      }
      if (str.isEmpty()) return VersionMap()
      val versions = str.split(ENTRIES_SEPARATOR)
      val backingMap = versions.associate { version ->
        val pair = version.split(ACTOR_VERSION_DELIMITER)
        check(pair.size == 2) { "Tried to decode invalid VersionMap: $str" }
        pair[0] to pair[1].toInt()
      }
      return VersionMap(backingMap)
    }
  }
}
