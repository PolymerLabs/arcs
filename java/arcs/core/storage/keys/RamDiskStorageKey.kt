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
import arcs.core.storage.CapabilitiesResolver
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyParser

/** Protocol to be used with the ramdisk driver. */
const val RAMDISK_DRIVER_PROTOCOL = Protocols.RAMDISK_DRIVER

/** Storage key for a piece of data managed by the ramdisk driver. */
data class RamDiskStorageKey(private val unique: String) : StorageKey(RAMDISK_DRIVER_PROTOCOL) {
    override fun toKeyString(): String = unique

    override fun childKeyWithComponent(component: String): StorageKey =
        RamDiskStorageKey("$unique/$component")

    override fun toString(): String = super.toString()

    companion object {
        private val RAMDISK_STORAGE_KEY_PATTERN = "^(.*)\$".toRegex()

        init {
            // When RamDiskStorageKey is used for the first time, this will register its key parser.
            // If you want to use the parser in other cases (e.g., tests), you will have to call
            // RamDiskStorageKey.registerParser(). Alternatively, to register the parsers for all
            // the supported protocols use [DriverAndKeyConfigurator.configureKeyParsers].
            StorageKeyParser.addParser(RAMDISK_DRIVER_PROTOCOL, ::fromString)
        }

        fun registerParser() {
            StorageKeyParser.addParser(RAMDISK_DRIVER_PROTOCOL, ::fromString)
        }

        fun registerKeyCreator() {
            CapabilitiesResolver.registerKeyCreator(
                RAMDISK_DRIVER_PROTOCOL,
                Capabilities.TiedToRuntime
            ) { storageKeyOptions -> RamDiskStorageKey(storageKeyOptions.location) }
        }

        private fun fromString(rawKeyString: String): RamDiskStorageKey {
            val match =
                requireNotNull(RAMDISK_STORAGE_KEY_PATTERN.matchEntire(rawKeyString)) {
                    "Not a valid VolatileStorageKey: $rawKeyString"
                }

            return RamDiskStorageKey(match.groupValues[1])
        }
    }
}
