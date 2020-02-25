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
    override fun toKeyString() =
        "$nameFromManifest$CAPABILITY_ARG_SEPARATOR${capabilitiesToString()}"

    fun capabilitiesToString() = capabilities.capabilities.map { it -> it.name }.joinToString(",")

    override fun childKeyWithComponent(component: String): StorageKey {
        throw UnsupportedOperationException("CreateableStorageKey is used as a placeholder only.")
    }

    override fun toString(): String = super.toString()

    companion object {
        const val CREATEABLE_KEY_PROTOCOL = "create"
        const val CAPABILITY_ARG_SEPARATOR = "?"

        private val CREATEABLE_STORAGE_KEY_PATTERN =
            ("^([^:]*)\\$CAPABILITY_ARG_SEPARATOR(.*)\$").toRegex()

        init {
            StorageKeyParser.addParser(
                CREATEABLE_KEY_PROTOCOL, Companion::parse
            )
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
            val capabilityStrings =
                if (capabilities == "") emptyList<String>()
                else capabilities.split(',')
            return Capabilities(
                capabilityStrings.map { name -> Capabilities.Capability.valueOf(name) }.toSet()
            )
        }
    }
}
