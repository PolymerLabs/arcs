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
import arcs.core.storage.StorageKeySpec

/**
 * Default database name for DatabaseDriver usage, and referencing using [DatabaseStorageKey]s.
 */
const val DATABASE_NAME_DEFAULT = "arcs"

/** [StorageKey] implementation for a piece of data managed by the DatabaseDriver. */
sealed class DatabaseStorageKey(
  open val unique: String,
  open val entitySchemaHash: String,
  open val dbName: String,
  protocol: String
) : StorageKey(protocol) {
  override fun toKeyString(): String = "$entitySchemaHash@$dbName/$unique"

  override fun childKeyWithComponent(component: String): StorageKey = when (this) {
    is Persistent -> Persistent("$unique/$component", entitySchemaHash, dbName)
    is Memory -> Memory("$unique/$component", entitySchemaHash, dbName)
  }

  protected fun checkValidity() {
    require(DATABASE_NAME_PATTERN.matches(dbName)) {
      "$dbName is an invalid database name, must match the pattern: $DATABASE_NAME_PATTERN"
    }
    require(ENTITY_SCHEMA_HASH_PATTERN.matches(entitySchemaHash)) {
      "$entitySchemaHash is an invalid entity schema hash, must match the pattern: " +
        ENTITY_SCHEMA_HASH_PATTERN
    }
  }

  /** [DatabaseStorageKey] for values to be stored on-disk. */
  data class Persistent(
    override val unique: String,
    override val entitySchemaHash: String,
    override val dbName: String = DATABASE_NAME_DEFAULT
  ) : DatabaseStorageKey(unique, entitySchemaHash, dbName, protocol) {
    init {
      checkValidity()
    }

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
        return Persistent(options.location, options.entitySchema.hash)
      }
    }

    companion object : StorageKeySpec<Persistent> {
      /** Protocol to be used with the database driver for persistent databases. */
      override val protocol = Protocols.DATABASE_DRIVER

      override fun parse(rawKeyString: String) = fromString<Persistent>(rawKeyString)
    }
  }

  /** [DatabaseStorageKey] for values to be stored in-memory. */
  data class Memory(
    override val unique: String,
    override val entitySchemaHash: String,
    override val dbName: String = DATABASE_NAME_DEFAULT
  ) : DatabaseStorageKey(unique, entitySchemaHash, dbName, protocol) {
    init {
      checkValidity()
    }

    override fun toString() = super.toString()

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
        return Memory(options.location, options.entitySchema.hash)
      }
    }

    companion object : StorageKeySpec<Memory> {
      /** Protocol to be used with the database driver for in-memory databases. */
      override val protocol = Protocols.MEMORY_DATABASE_DRIVER

      override fun parse(rawKeyString: String) = fromString<Memory>(rawKeyString)
    }
  }

  companion object {
    private val DATABASE_NAME_PATTERN = "[a-zA-Z][a-zA-Z0-1_-]*".toRegex()
    private val ENTITY_SCHEMA_HASH_PATTERN = "[a-fA-F0-9]+".toRegex()
    private val DB_STORAGE_KEY_PATTERN =
      "^($ENTITY_SCHEMA_HASH_PATTERN)@($DATABASE_NAME_PATTERN)/(.+)\$".toRegex()

    private inline fun <reified T : DatabaseStorageKey> fromString(rawKeyString: String): T {
      val match = requireNotNull(DB_STORAGE_KEY_PATTERN.matchEntire(rawKeyString)) {
        "Not a valid DatabaseStorageKey"
      }

      val entitySchemaHash = match.groupValues[1]
      val dbName = match.groupValues[2]
      val unique = match.groupValues[3]

      return when (T::class) {
        Persistent::class -> Persistent(unique, entitySchemaHash, dbName)
        Memory::class -> Memory(unique, entitySchemaHash, dbName)
        else -> throw IllegalArgumentException(
          "Unsupported DatabaseStorageKey type: ${T::class}"
        )
      } as T
    }
  }
}
