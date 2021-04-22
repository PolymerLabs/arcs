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

import arcs.core.data.Capabilities
import arcs.core.data.Capability
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyFactory
import arcs.core.storage.StorageKeyProtocol
import arcs.core.storage.StorageKeySpec
import arcs.flags.BuildFlags

/** Storage key for a piece of data managed by the ramdisk driver. */
data class RamDiskStorageKey(private val unique: String) : StorageKey(protocol) {
  override fun toKeyString(): String = unique

  override fun newKeyWithComponent(component: String): StorageKey {
    val newComponent = if (BuildFlags.STORAGE_KEY_REDUCTION) component else "$unique/$component"
    return RamDiskStorageKey(newComponent)
  }

  override fun toString(): String = super.toString()

  class RamDiskStorageKeyFactory : StorageKeyFactory(
    protocol,
    Capabilities(
      listOf(
        Capability.Persistence.IN_MEMORY,
        Capability.Shareable.ANY
      )
    )
  ) {
    override fun create(options: StorageKeyOptions): StorageKey {
      return RamDiskStorageKey(options.location)
    }
  }

  companion object : StorageKeySpec<RamDiskStorageKey> {
    /** Protocol to be used with the ramdisk driver. */
    override val protocol = StorageKeyProtocol.RamDisk

    override fun parse(rawKeyString: String): RamDiskStorageKey {
      return RamDiskStorageKey(rawKeyString)
    }
  }
}
