package arcs.core.storage

/** A util class providing common method implementations for [StorageKey]s. */
class StorageKeyUtils {
    companion object {
        /** A util method to extract keys in a given raw string*/
        fun extractKeysFromString(rawValue: String): List<StorageKey> {
            val storageKeys = mutableListOf<StorageKey>()
            val invalidFormatMessage: () -> String =
                { "Invalid format for extracting keys: $rawValue" }
            var openCount = 0
            var openIndex = -1
            rawValue.forEachIndexed { i, char ->
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
                            storageKeys.add(childComponent)
                            // Reset to negative, so we mark openIndex when we see the next '{'
                            openIndex = -1
                        }
                    }
                }
            }
            return storageKeys
        }
    }
}

/* internal */ fun String.unEmbed(): StorageKey =
    StorageKeyParser.parse(replace("\\{\\{".toRegex(), "{").replace("\\}\\}".toRegex(), "}"))

/* internal */ fun StorageKey.embed() =
    toString().replace("\\{".toRegex(), "{{").replace("\\}".toRegex(), "}}")
