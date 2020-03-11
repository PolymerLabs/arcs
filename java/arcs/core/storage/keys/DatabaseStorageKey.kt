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
import arcs.core.storage.CapabilitiesResolver
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyParser

/** Protocol to be used with the database driver for persistent databases. */
const val DATABASE_DRIVER_PROTOCOL = "db"

/** Protocol to be used with the database driver for in-memory databases. */
const val MEMORY_DATABASE_DRIVER_PROTOCOL = "memdb"

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
    ) : DatabaseStorageKey(unique, entitySchemaHash, dbName, DATABASE_DRIVER_PROTOCOL) {
        init { checkValidity() }

        override fun toString() = super.toString()
    }

    /** [DatabaseStorageKey] for values to be stored in-memory. */
    data class Memory(
        override val unique: String,
        override val entitySchemaHash: String,
        override val dbName: String = DATABASE_NAME_DEFAULT
    ) : DatabaseStorageKey(unique, entitySchemaHash, dbName, MEMORY_DATABASE_DRIVER_PROTOCOL) {
        init { checkValidity() }

        override fun toString() = super.toString()
    }

    companion object {
        private val DATABASE_NAME_PATTERN = "[a-zA-Z][a-zA-Z0-1_-]*".toRegex()
        private val ENTITY_SCHEMA_HASH_PATTERN = "[a-fA-F0-9]+".toRegex()
        private val DB_STORAGE_KEY_PATTERN =
            "^($ENTITY_SCHEMA_HASH_PATTERN)@($DATABASE_NAME_PATTERN)/(.+)\$".toRegex()

        init {
            // When DatabaseStorageKey is imported, this will register its parser with the storage
            // key parsers.
            registerParser()
        }

        /** Registers the [DatabaseStorageKey] for parsing with the [StorageKeyParser]. */
        /* internal */
        fun registerParser() {
            StorageKeyParser.addParser(DATABASE_DRIVER_PROTOCOL, ::persistentFromString)
            StorageKeyParser.addParser(MEMORY_DATABASE_DRIVER_PROTOCOL, ::memoryFromString)
        }

        fun registerKeyCreator() {
            CapabilitiesResolver.registerKeyCreator(
                DATABASE_DRIVER_PROTOCOL,
                Capabilities.Persistent
            ) { storageKeyOptions ->
                DatabaseStorageKey.Persistent(
                    storageKeyOptions.location,
                    storageKeyOptions.entitySchema.hash
                )
            }
        }
        /* internal */
        fun persistentFromString(rawKeyString: String): Persistent = fromString(rawKeyString)

        /* internal */
        fun memoryFromString(rawKeyString: String): Memory = fromString(rawKeyString)

        private inline fun <reified T : DatabaseStorageKey> fromString(rawKeyString: String): T {
            val match = requireNotNull(DB_STORAGE_KEY_PATTERN.matchEntire(rawKeyString)) {
                "Not a valid DatabaseStorageKey: $rawKeyString"
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
