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

package arcs.core.storage

/**
 * Parses storage key string representations back into real StorageKey
 * instances.
 *
 * If you modify the default set of storage keys in a test (using [addParser]), remember to call
 * [reset] in the tear-down method.
 */
interface StorageKeyManager {
  /**
   * Return a structured [StorageKey] instance for the provided raw key string. Implementations
   * may throw an exception if:
   *   * The key string has invalid structure.
   *   * The key string uses a protocol that doesn't have a registered parser.
   *   * The key doesn't match the parser's structural expectations.
   */
  fun parse(rawKeyString: String): StorageKey

  /**
   * Add a new [StorageKeyParser] to the internal list of parsers. Adding a [parser] for a
   * protocol which already exists should replace the existing implementation.
   */
  fun addParser(parser: StorageKeyParser<*>)

  /**
   * Remove all currently registered parsers, and replace them with the values provided.
   */
  fun reset(vararg initialSet: StorageKeyParser<*>)
}

/**
 * The interface for a parser of a specific protocol type.
 *
 * By convention, when implementing [StorageKey], you should also include in the companion object
 * a [protocol] field that defines the protocol for the name, and a [parser] that implements this
 * interface.
 *
 * The companion object for this interface implements a thread-safe global instance of
 * [StorageKeyManager], and that's currently what we use throughout the Arcs codebase for storage
 * key management.
 */
interface StorageKeyParser<T : StorageKey> {
  /** The protocol that this [StorageKeyParser] supports. */
  val protocol: String

  /** Returns a structured key of type [T] give the [rawKeyString]. May throw an exception if:
   *   * The [rawKeyString] has invalid structure.
   *   * The structure of the key doesn't meet the specific requirements for this [protocol].
   *
   *   Note that implementations are not guaranteed to check the protocol of the [rawKeyString]
   *   provided, so callers should verify this themselves before using the parser.
   */
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
        "Invalid key pattern"
      }

    val protocol = match.groupValues[1]
    val contents = match.groupValues[2]
    val parser = synchronized(this) {
      requireNotNull(parsers[protocol]) {
        "No registered parsers for protocol \"$protocol\""
      }
    }

    return parser.parse(contents)
  }

  /** Registers a new [StorageKey] parser for the given [protocol]. */
  override fun addParser(parser: StorageKeyParser<*>) = synchronized(this) {
    parsers[parser.protocol] = parser
  }

  /** Resets the registered parsers to the defaults. */
  override fun reset(vararg initialSet: StorageKeyParser<*>) = synchronized(this) {
    parsers = initialSet.associateBy { it.protocol }.toMutableMap()
  }
}
