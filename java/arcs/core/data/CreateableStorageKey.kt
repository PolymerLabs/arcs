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

import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyParser

/**
 * This class represents a storage key in a compiled [Plan] with 'create' fate.
 */
data class CreateableStorageKey(
    val nameFromManifest: String,
    val capabilities: Capabilities = Capabilities.TiedToRuntime
) : StorageKey(CREATEABLE_KEY_PROTOCOL) {

    override fun toKeyString() = capabilities.capabilities.joinToString(
        prefix = "$nameFromManifest${if (capabilities.isEmpty()) "" else CAPABILITY_ARG_SEPARATOR}",
        separator = ","
    ) { it.name }

    override fun childKeyWithComponent(component: String): StorageKey {
        throw UnsupportedOperationException("CreateableStorageKey is used as a placeholder only.")
    }

    override fun toString(): String = super.toString()

    companion object {
        const val CREATEABLE_KEY_PROTOCOL = "create"
        const val CAPABILITY_ARG_SEPARATOR = "?"

        private val CREATEABLE_STORAGE_KEY_PATTERN =
            ("^([^:^?]*)(\\$CAPABILITY_ARG_SEPARATOR.*)?\$").toRegex()

        fun registerParser() {
            StorageKeyParser.addParser(CREATEABLE_KEY_PROTOCOL, ::parse)
        }

        private fun parse(rawKeyString: String): CreateableStorageKey {
            val match =
                requireNotNull(CREATEABLE_STORAGE_KEY_PATTERN.matchEntire(rawKeyString)) {
                    "Not a valid CreateableStorageKey: $rawKeyString"
                }

            return CreateableStorageKey(
                match.groupValues[1],
                parseCapabilities(match.groupValues[2])
            )
        }

        private fun parseCapabilities(capabilities: String): Capabilities {
            val capabilityStrings = when (capabilities) {
                "", CAPABILITY_ARG_SEPARATOR -> emptyList()
                else -> capabilities.substring(1).split(',')
            }
            return Capabilities(
                capabilityStrings.map { name -> Capabilities.Capability.valueOf(name) }.toSet()
            )
        }
    }
}
