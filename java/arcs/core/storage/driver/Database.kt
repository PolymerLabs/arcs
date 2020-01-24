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

package arcs.core.storage.driver

import arcs.core.data.Schema
import arcs.core.storage.Driver
import arcs.core.storage.DriverFactory
import arcs.core.storage.DriverProvider
import arcs.core.storage.ExistenceCriteria
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyParser

/** Protocol to be used with the database driver. */
const val DATABASE_DRIVER_PROTOCOL = "db"

/**
 * Default database name for [DatabaseDriver] usage, and referencing using [DatabaseStorageKey]s.
 */
const val DATABASE_NAME_DEFAULT = "arcs"

/** [StorageKey] implementation for a piece of data managed by the [DatabaseDriver]. */
data class DatabaseStorageKey(
    val unique: String,
    val entitySchemaHash: String,
    val persistent: Boolean = true,
    val dbName: String = DATABASE_NAME_DEFAULT
) : StorageKey(DATABASE_DRIVER_PROTOCOL) {
    init {
        require(DATABASE_NAME_PATTERN.matches(dbName)) {
            "$dbName is an invalid database name, must match the pattern: $DATABASE_NAME_PATTERN"
        }
        require(ENTITY_SCHEMA_HASH_PATTERN.matches(entitySchemaHash)) {
            "$entitySchemaHash is an invalid entity schema hash, must match the pattern: " +
                ENTITY_SCHEMA_HASH_PATTERN
        }
    }

    override fun toKeyString(): String {
        val persistenceVariant = if (persistent) VARIANT_PERSISTENT else VARIANT_IN_MEMORY
        return "$entitySchemaHash@$dbName:$persistenceVariant/$unique"
    }

    override fun childKeyWithComponent(component: String): StorageKey =
        copy(unique = "$unique/$component")

    override fun toString() = super.toString()

    companion object {
        private val DATABASE_NAME_PATTERN = "[a-zA-Z][a-zA-Z0-1_-]*".toRegex()
        private val ENTITY_SCHEMA_HASH_PATTERN = "[a-fA-F0-9]+".toRegex()
        private const val VARIANT_PERSISTENT = "persistent"
        private const val VARIANT_IN_MEMORY = "in-memory"
        /* ktlint-disable max-line-length */
        private val DB_STORAGE_KEY_PATTERN =
            "^($ENTITY_SCHEMA_HASH_PATTERN)@($DATABASE_NAME_PATTERN):($VARIANT_PERSISTENT|$VARIANT_IN_MEMORY)/(.+)\$".toRegex()
        /* ktlint-enable max-line-length */

        init {
            // When DatabaseStorageKey is imported, this will register its parser with the storage
            // key parsers.
            StorageKeyParser.addParser(DATABASE_DRIVER_PROTOCOL, ::fromString)
        }

        /** Registers a parser with the [StorageKeyParser] for the [DatabaseStorageKey]. */
        fun registerParser() {
            StorageKeyParser.addParser(DATABASE_DRIVER_PROTOCOL, ::fromString)
        }

        /* internal */ fun fromString(rawKeyString: String): DatabaseStorageKey {
            val match = requireNotNull(DB_STORAGE_KEY_PATTERN.matchEntire(rawKeyString)) {
                "Not a valid DatabaseStorageKey: $rawKeyString"
            }

            val entitySchemaHash = match.groupValues[1]
            val dbName = match.groupValues[2]
            val persistent = match.groupValues[3] == "persistent"
            val unique = match.groupValues[4]
            return DatabaseStorageKey(unique, entitySchemaHash, persistent, dbName)
        }
    }
}

/** [DriverProvider] which provides a [DatabaseDriver]. */
object DatabaseDriverProvider : DriverProvider {
    /**
     * Function which will be used to determine, at runtime, which [Schema] to associate with its
     * hash value embedded in a [DatabaseStorageKey].
     */
    private var schemaLookup: (String) -> Schema? = {
        throw IllegalStateException(
            "DatabaseDriverProvider.configure(schemaLookup) has not been called"
        )
    }

    override fun willSupport(storageKey: StorageKey): Boolean =
        storageKey is DatabaseStorageKey && schemaLookup(storageKey.entitySchemaHash) != null

    override suspend fun <Data : Any> getDriver(
        storageKey: StorageKey,
        existenceCriteria: ExistenceCriteria
    ): Driver<Data> {
        val databaseKey = requireNotNull(storageKey as? DatabaseStorageKey) {
            "Unsupported StorageKey: $storageKey for DatabaseDriverProvider"
        }
        requireNotNull(schemaLookup(databaseKey.entitySchemaHash)) {
            "Unsupported DatabaseStorageKey: No Schema found with hash: " +
                databaseKey.entitySchemaHash
        }
        return DatabaseDriver(storageKey, existenceCriteria, schemaLookup)
    }

    /**
     * Configures the [DatabaseDriverProvider] with the given [schemaLookup] and registers it
     * with the [DriverFactory].
     */
    fun configure(schemaLookup: (String) -> Schema?) = apply {
        // The `init` block will register the driver provider with the driver factory.
        this.schemaLookup = schemaLookup
        DriverFactory.register(this)
    }
}

/** [Driver] implementation capable of managing data stored in a SQL database. */
class DatabaseDriver<Data : Any>(
    override val storageKey: StorageKey,
    override val existenceCriteria: ExistenceCriteria,
    private val schemaLookup: (String) -> Schema?
) : Driver<Data> {
    override suspend fun registerReceiver(
        token: String?,
        receiver: suspend (data: Data, version: Int) -> Unit
    ) {
        TODO("not implemented")
    }

    override suspend fun send(data: Data, version: Int): Boolean {
        TODO("not implemented")
    }

    override val token: String? = null
}
