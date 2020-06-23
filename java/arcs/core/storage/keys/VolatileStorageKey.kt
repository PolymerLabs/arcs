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
import arcs.core.data.CapabilitiesNew
import arcs.core.data.CapabilityNew
import arcs.core.storage.CapabilitiesResolverNew
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyFactory
import arcs.core.storage.StorageKeyParser

/** Protocol to be used with the volatile driver. */
const val VOLATILE_DRIVER_PROTOCOL = Protocols.VOLATILE_DRIVER

/** Storage key for a piece of data kept in the volatile driver. */
data class VolatileStorageKey(
    /** Id of the arc where this key was created. */
    val arcId: ArcId,
    /** Unique identifier for this particular key. */
    val unique: String
) : StorageKey(VOLATILE_DRIVER_PROTOCOL) {
    override fun toKeyString(): String = "$arcId/$unique"

    override fun childKeyWithComponent(component: String): StorageKey =
        VolatileStorageKey(arcId, "$unique/$component")

    override fun toString(): String = super.toString()

    class VolatileStorageKeyFactory : StorageKeyFactory(
        VOLATILE_DRIVER_PROTOCOL,
        CapabilitiesNew(
            listOf(
                CapabilityNew.Persistence.IN_MEMORY,
                CapabilityNew.Shareable(false)
            )
        )
    ) {
        override fun create(options: StorageKeyFactory.StorageKeyOptions): StorageKey {
            return VolatileStorageKey(options.arcId, options.unique)
        }
    }

    companion object {
        private val VOLATILE_STORAGE_KEY_PATTERN = "^([^/]+)/(.*)\$".toRegex()

        init {
            // When VolatileStorageKey is instantiated, this will register its parser with the
            // storage key parsers.
            registerParser()
        }

        fun registerParser() {
            StorageKeyParser.addParser(VOLATILE_DRIVER_PROTOCOL, ::fromString)
        }

        fun registerKeyCreator() {
            CapabilitiesResolverNew.registerStorageKeyFactory(VolatileStorageKeyFactory())
        }

        private fun fromString(rawKeyString: String): VolatileStorageKey {
            val match =
                requireNotNull(VOLATILE_STORAGE_KEY_PATTERN.matchEntire(rawKeyString)) {
                    "Not a valid VolatileStorageKey: $rawKeyString"
                }

            return VolatileStorageKey(match.groupValues[1].toArcId(), match.groupValues[2])
        }
    }
}
