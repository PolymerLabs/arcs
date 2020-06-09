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

package arcs.core.storage.referencemode

import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyParser
import arcs.core.storage.StorageKeyUtils
import arcs.core.storage.embed

const val REFERENCE_MODE_PROTOCOL = "reference-mode"

/**
 * Special subclass of [StorageKey] used to identify data managed by a
 * [arcs.storage.ReferenceModeStore].
 */
data class ReferenceModeStorageKey(
    val backingKey: StorageKey,
    val storageKey: StorageKey
) : StorageKey(REFERENCE_MODE_PROTOCOL) {
    override fun childKeyWithComponent(component: String): StorageKey =
        ReferenceModeStorageKey(backingKey, storageKey.childKeyWithComponent(component))

    override fun toKeyString(): String = "{${backingKey.embed()}}{${storageKey.embed()}}"

    override fun toString(): String = super.toString()

    companion object {
        init {
            StorageKeyParser.addParser(REFERENCE_MODE_PROTOCOL, ::fromString)
        }

        fun registerParser() {
            StorageKeyParser.addParser(REFERENCE_MODE_PROTOCOL, ::fromString)
        }

        private fun fromString(rawValue: String): ReferenceModeStorageKey {
            val invalidFormatMessage: () -> String =
                { "Invalid format for ReferenceModeStorageKey: $rawValue" }
            val storageKeys = StorageKeyUtils.extractKeysFromString(rawValue)
            require(storageKeys.size == 2, invalidFormatMessage)

            return ReferenceModeStorageKey(
                storageKeys[0],
                storageKeys[1]
            )
        }
    }
}
