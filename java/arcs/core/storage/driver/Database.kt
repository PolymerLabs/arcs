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

import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.data.Schema
import arcs.core.storage.Driver
import arcs.core.storage.DriverFactory
import arcs.core.storage.DriverProvider
import arcs.core.storage.ExistenceCriteria
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyParser
import arcs.core.storage.database.Database
import arcs.core.storage.database.DatabaseFactory
import kotlin.reflect.KClass

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
    private var _factory: DatabaseFactory? = null
    private val factory: DatabaseFactory
        get() = requireNotNull(_factory) { ERROR_MESSAGE_CONFIGURE_NOT_CALLED }

    /**
     * Function which will be used to determine, at runtime, which [Schema] to associate with its
     * hash value embedded in a [DatabaseStorageKey].
     */
    private var schemaLookup: (String) -> Schema? = {
        throw IllegalStateException(ERROR_MESSAGE_CONFIGURE_NOT_CALLED)
    }

    override fun willSupport(storageKey: StorageKey): Boolean =
        storageKey is DatabaseStorageKey && schemaLookup(storageKey.entitySchemaHash) != null

    override suspend fun <Data : Any> getDriver(
        storageKey: StorageKey,
        existenceCriteria: ExistenceCriteria,
        dataClass: KClass<Data>
    ): Driver<Data> {
        val databaseKey = requireNotNull(storageKey as? DatabaseStorageKey) {
            "Unsupported StorageKey: $storageKey for DatabaseDriverProvider"
        }
        requireNotNull(schemaLookup(databaseKey.entitySchemaHash)) {
            "Unsupported DatabaseStorageKey: No Schema found with hash: " +
                databaseKey.entitySchemaHash
        }
        require(
            dataClass == CrdtEntity.Data::class ||
                dataClass == CrdtSet.DataImpl::class ||
                dataClass == CrdtSingleton.DataImpl::class
        ) {
            "Unsupported data type: $dataClass, must be one of: CrdtEntity.Data, " +
                "CrdtSet.DataImpl, or CrdtSingleton.DataImpl"
        }
        return DatabaseDriver(
            databaseKey,
            existenceCriteria,
            dataClass,
            schemaLookup,
            factory.getDatabase(databaseKey.dbName, databaseKey.persistent)
        )
    }

    /**
     * Configures the [DatabaseDriverProvider] with the given [schemaLookup] and registers it
     * with the [DriverFactory].
     */
    fun configure(databaseFactory: DatabaseFactory, schemaLookup: (String) -> Schema?) = apply {
        this._factory = databaseFactory
        this.schemaLookup = schemaLookup
        DriverFactory.register(this)
    }

    private const val ERROR_MESSAGE_CONFIGURE_NOT_CALLED =
        "DatabaseDriverProvider.configure(databaseFactory, schemaLookup) has not been called"
}

/** [Driver] implementation capable of managing data stored in a SQL database. */
@Suppress("unused")
class DatabaseDriver<Data : Any>(
    override val storageKey: DatabaseStorageKey,
    override val existenceCriteria: ExistenceCriteria,
    private val dataClass: KClass<Data>,
    private val schemaLookup: (String) -> Schema?,
    private val database: Database
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

    override fun toString(): String = "DatabaseDriver($storageKey)"
}
