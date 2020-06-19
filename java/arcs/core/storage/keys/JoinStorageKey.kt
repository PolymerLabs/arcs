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

import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyParser
import arcs.core.storage.StorageKeyUtils
import arcs.core.storage.embed

/** Protocol to be used when the StorageKey is composed of multiple StorageKeys. */
const val COMPOSITE_PROTOCOL = "join"

/** Implementation for a composite [StorageKey] for joining entities. */
class JoinStorageKey(
    val components: List<StorageKey>
) : StorageKey(COMPOSITE_PROTOCOL) {
    override fun toKeyString(): String {
        val builder = StringBuilder()
        builder.append("${components.size}/")
        components.forEach { builder.append("{${it.embed()}}") }

        return builder.toString()
    }

    override fun childKeyWithComponent(component: String): StorageKey {
        TODO("Not yet implemented for JoinStorageKey")
    }

    companion object {
        init {
            StorageKeyParser.addParser(COMPOSITE_PROTOCOL, ::fromString)
        }

        /** Register [JoinStorageKey] with the [StorageKeyParser]. */
        fun registerParser() {
            StorageKeyParser.addParser(COMPOSITE_PROTOCOL, ::fromString)
        }

        private fun fromString(rawValue: String): JoinStorageKey {
            val invalidFormatMessage: () -> String =
                { "Invalid format for JoinStorageKey: $rawValue" }

            // We will support < 10 joins.
            val numberOfJoins: Int = rawValue[0] - '0'
            require(numberOfJoins in 1..9, invalidFormatMessage)
            require(rawValue[1] == '/', invalidFormatMessage)

            val storageKeys = StorageKeyUtils.extractKeysFromString(rawValue.substring(2))
            require(storageKeys.size == numberOfJoins, invalidFormatMessage)
            return JoinStorageKey(storageKeys)
        }
    }
}
