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
interface StorageKeyManager {
    fun parse(rawKeyString: String): StorageKey
    fun addParser(parser: StorageKeyParser<*>)
    fun reset(vararg initialSet: StorageKeyParser<*>)
}

/**
 * The interface for a parser of a specific protocol type.
 *
 * By convention, when implementing [StorageKey], you should also include in the companion object
 * a [PROTOCOL] field that defines the protocol for the name, and a [PARSER] that implements this
 * interface.
 *
 * The companion object for this interface implements a thread-safe global instance of
 * [StorageKeyManager], and that's currently what we use throughout the Arcs codebase for storage
 * key management.
 */
interface StorageKeyParser<T : StorageKey> {
    val protocol: String
    fun parse(rawKeyString: String): T

    /**
     * Expose the [DefaultStorageKeyManager] via the [StorageKeyParser] type. We can later
     * change the usage points to refer to [DefaultStorageKeyManager] directly, and remove this.
     */
    companion object : StorageKeyManager by DefaultStorageKeyManager
}

/** A global default thread-safe implementation of [StorageKeyManager]. */
object DefaultStorageKeyManager : StorageKeyManager {
    private val VALID_KEY_PATTERN = "^([\\w-]+)://(.*)$".toRegex()
    private var parsers = mutableMapOf<String, StorageKeyParser<*>>()

    /** Parses a raw [key] into a [StorageKey]. */
    override fun parse(rawKeyString: String): StorageKey {
        val match =
            requireNotNull(VALID_KEY_PATTERN.matchEntire(rawKeyString)) {
                "Illegal key: \"$rawKeyString\""
            }

        val protocol = match.groupValues[1]
        val contents = match.groupValues[2]
        val parser = synchronized(this) {
            requireNotNull(parsers[protocol]) {
                "Unknown protocol \"$protocol\" in \"$rawKeyString\""
            }
        }

        return parser.parse(contents)
    }

    /** Registers a new [StorageKey] parser for the given [protocol]. */
    @Synchronized
    override fun addParser(parser: StorageKeyParser<*>) {
        parsers[parser.protocol] = parser
    }

    /** Resets the registered parsers to the defaults. */
    @Synchronized
    override fun reset(vararg initialSet: StorageKeyParser<*>) {
        parsers = initialSet.associateBy { it.protocol }.toMutableMap()
    }
}
