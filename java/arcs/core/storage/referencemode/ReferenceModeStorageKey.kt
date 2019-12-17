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
            var backing: StorageKey? = null
            var direct: StorageKey? = null

            var openCount = 0
            var openIndex = -1
            rawValue.forEachIndexed { i, char ->
                require(direct == null, invalidFormatMessage)
                when (char) {
                    '{' -> {
                        openCount++
                        if (openIndex < 0) openIndex = i
                    }
                    '}' -> {
                        openCount--
                        if (openCount == 0) {
                            require(openIndex >= 0, invalidFormatMessage)
                            val childComponent = rawValue.substring(openIndex + 1, i).unEmbed()
                            if (backing == null) {
                                backing = childComponent
                            } else {
                                direct = childComponent
                            }
                            // Reset to negative, so we mark openIndex when we see the next '{'
                            openIndex = -1
                        }
                    }
                }
            }
            return ReferenceModeStorageKey(
                requireNotNull(backing, invalidFormatMessage),
                requireNotNull(direct, invalidFormatMessage)
            )
        }
    }
}

/* internal */ fun String.unEmbed(): StorageKey =
    StorageKeyParser.parse(replace("\\{\\{".toRegex(), "{").replace("\\}\\}".toRegex(), "}"))

/* internal */ fun StorageKey.embed() =
    toString().replace("\\{".toRegex(), "{{").replace("\\}".toRegex(), "}}")
