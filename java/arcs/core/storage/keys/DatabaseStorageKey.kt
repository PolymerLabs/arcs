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

import arcs.core.data.Capabilities
import arcs.core.data.Capability
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyFactory
import arcs.core.storage.StorageKeyProtocol
import arcs.core.storage.StorageKeySpec
import arcs.flags.BuildFlags

/**
 * Default database name for DatabaseDriver usage, and referencing using [DatabaseStorageKey]s.
 */
const val DATABASE_NAME_DEFAULT = "arcs"

/** [StorageKey] implementation for a piece of data managed by the DatabaseDriver. */
sealed class DatabaseStorageKey(protocol: StorageKeyProtocol) : StorageKey(protocol) {
  abstract val unique: String
  abstract val dbName: String

  protected fun checkValidity() {
    require(DATABASE_NAME_PATTERN.matches(dbName)) {
      "$dbName is an invalid database name, must match the pattern: $DATABASE_NAME_PATTERN"
    }
  }

  /** [DatabaseStorageKey] for values to be stored on-disk. */
  data class Persistent(
    override val unique: String,
    override val dbName: String = DATABASE_NAME_DEFAULT
  ) : DatabaseStorageKey(StorageKeyProtocol.Database) {
    /** Short persistent storage key, without an entity schema hash. */
    init {
      checkValidity()
    }

    override fun newKeyWithComponent(component: String): StorageKey {
      return Persistent(component, dbName)
    }

    override fun toKeyString() = "$dbName/$unique"

    override fun toString() = super.toString()

    class Factory : StorageKeyFactory(
      protocol,
      Capabilities(
        listOf(
          Capability.Persistence.ON_DISK,
          Capability.Ttl.ANY,
          Capability.Queryable.ANY,
          Capability.Shareable.ANY
        )
      )
    ) {
      override fun create(options: StorageKeyOptions): StorageKey {
        return Persistent(options.location)
      }
    }

    companion object : StorageKeySpec<Persistent> {
      /** Protocol to be used with the database driver for persistent databases. */
      override val protocol = StorageKeyProtocol.Database

      override fun parse(rawKeyString: String) = parseInternal(rawKeyString, ::Persistent)
    }
  }

  /** [DatabaseStorageKey] for values to be stored in-memory. */
  data class Memory(
    override val unique: String,
    override val dbName: String = DATABASE_NAME_DEFAULT
  ) : DatabaseStorageKey(StorageKeyProtocol.InMemoryDatabase) {

    class Factory : StorageKeyFactory(
      protocol,
      Capabilities(
        listOf(
          Capability.Persistence.IN_MEMORY,
          Capability.Ttl.ANY,
          Capability.Queryable.ANY,
          Capability.Shareable.ANY
        )
      )
    ) {
      override fun create(options: StorageKeyOptions): StorageKey {
        return Memory(options.location)
      }
    }

    init {
      checkValidity()
    }

    override fun newKeyWithComponent(component: String): StorageKey {
      return Memory(component, dbName)
    }

    override fun toKeyString() = "$dbName/$unique"

    override fun toString() = super.toString()

    companion object : StorageKeySpec<Memory> {
      /** Protocol to be used with the database driver for in-memory databases. */
      override val protocol = StorageKeyProtocol.InMemoryDatabase

      override fun parse(rawKeyString: String) = parseInternal(rawKeyString, ::Memory)
    }
  }

  companion object {
    private val DATABASE_NAME_PATTERN = "[a-zA-Z][a-zA-Z0-1_-]*".toRegex()
    private val ENTITY_SCHEMA_HASH_PATTERN = "[a-fA-F0-9]+".toRegex()

    /** Regex for the legacy storage key format, which includes the entity schema hash. */
    private val LEGACY_DB_STORAGE_KEY_PATTERN =
      "^($ENTITY_SCHEMA_HASH_PATTERN)@($DATABASE_NAME_PATTERN)/(.+)\$".toRegex()

    /** Regex for the shortened storage key format, which does not include the schema hash. */
    private val SHORT_DB_STORAGE_KEY_PATTERN =
      "^($DATABASE_NAME_PATTERN)/(.+)\$".toRegex()

    /**
     * Special constant to use when [BuildFlags.STORAGE_KEY_REDUCTION] is enabled and no hashes are
     * required.
     */
    private const val SCHEMA_HASH_NOT_REQUIRED = "SCHEMA_HASH_NOT_REQUIRED"

    /**
     * Parses a [DatabaseStorageKey] from [rawKeyString], invoking [builder] with the arguments
     * `unique` and `dbName`
     */
    private fun <T : DatabaseStorageKey> parseInternal(
      rawKeyString: String,
      builder: (String, String) -> T
    ): T {
      // Try parsing the legacy format first.
      var match = LEGACY_DB_STORAGE_KEY_PATTERN.matchEntire(rawKeyString)
      if (match != null) {
        val dbName = match.groupValues[2]
        val unique = match.groupValues[3]
        return builder(unique, dbName)
      }

      // Try parsing the shortened format.
      match = requireNotNull(SHORT_DB_STORAGE_KEY_PATTERN.matchEntire(rawKeyString)) {
        "Not a valid DatabaseStorageKey: $rawKeyString"
      }
      val dbName = match.groupValues[1]
      val unique = match.groupValues[2]
      return builder(unique, dbName)
    }
  }
}
