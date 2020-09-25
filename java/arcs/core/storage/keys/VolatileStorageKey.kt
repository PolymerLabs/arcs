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
package arcs.core.storage.keys

import arcs.core.common.ArcId
import arcs.core.common.toArcId
import arcs.core.data.Capabilities
import arcs.core.data.Capability
import arcs.core.storage.CapabilitiesResolver
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyFactory
import arcs.core.storage.StorageKeySpec

/** Protocol to be used with the volatile driver. */
/** Storage key for a piece of data kept in the volatile driver. */
data class VolatileStorageKey(
  /** Id of the arc where this key was created. */
  val arcId: ArcId,
  /** Unique identifier for this particular key. */
  val unique: String
) : StorageKey(protocol) {
  override fun toKeyString(): String = "$arcId/$unique"

  override fun childKeyWithComponent(component: String): StorageKey =
    VolatileStorageKey(arcId, "$unique/$component")

  override fun toString(): String = super.toString()

  class VolatileStorageKeyFactory : StorageKeyFactory(
    protocol,
    Capabilities(
      listOf(
        Capability.Persistence.IN_MEMORY,
        Capability.Shareable(false)
      )
    )
  ) {
    override fun create(options: StorageKeyOptions): StorageKey {
      return VolatileStorageKey(options.arcId, options.unique)
    }
  }

  companion object : StorageKeySpec<VolatileStorageKey> {
    private val VOLATILE_STORAGE_KEY_PATTERN = "^([^/]+)/(.*)\$".toRegex()
    override val protocol = Protocols.VOLATILE_DRIVER

    override fun parse(rawKeyString: String): VolatileStorageKey {
      val match =
        requireNotNull(VOLATILE_STORAGE_KEY_PATTERN.matchEntire(rawKeyString)) {
          "Not a valid VolatileStorageKey"
        }

      return VolatileStorageKey(match.groupValues[1].toArcId(), match.groupValues[2])
    }

    fun registerKeyCreator() {
      CapabilitiesResolver.registerStorageKeyFactory(VolatileStorageKeyFactory())
    }
  }
}
