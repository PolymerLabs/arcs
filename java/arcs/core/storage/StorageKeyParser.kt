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

package arcs.core.storage

/**
 * Parses storage key string representations back into real StorageKey
 * instances.
 *
 * If you modify the default set of storage keys in a test (using [addParser]), remember to call
 * [reset] in the tear-down method.
 */
object StorageKeyParser {
    private var parsers = DEFAULT_PARSERS.toMutableMap()

    /** Parses a raw [key] into a [StorageKey]. */
    fun parse(key: String): StorageKey {
        val match = requireNotNull(VALID_KEY_PATTERN.matchEntire(key)) { "Illegal key: \"$key\"" }

        val protocol = match.groupValues[1]
        val contents = match.groupValues[2]
        val parser =
            requireNotNull(parsers[protocol]) { "Unknown protocol \"$protocol\" in \"$key\"" }

        return parser(contents)
    }

    /** Registers a new [StorageKey] parser for the given [protocol]. */
    fun addParser(protocol: String, parser: (contents: String) -> StorageKey) {
        parsers[protocol] = parser
    }

    /** Resets the registered parsers to the defaults. */
    fun reset() {
        parsers = DEFAULT_PARSERS.toMutableMap()
    }
}

private val VALID_KEY_PATTERN = "^([\\w-]+)://(.*)$".toRegex()
private val DEFAULT_PARSERS = mapOf<String, (contents: String) -> StorageKey>()
