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
    val persistent: Boolean = true,
    val dbName: String = DATABASE_NAME_DEFAULT
) : StorageKey(DATABASE_DRIVER_PROTOCOL) {
    init {
        require(DATABASE_NAME_PATTERN.matches(dbName)) {
            "$dbName is an invalid database name, must match the pattern: $DATABASE_NAME_PATTERN"
        }
    }

    override fun toKeyString() =
        "$dbName:${if (persistent) VARIANT_PERSISTENT else VARIANT_IN_MEMORY}/$unique"

    override fun childKeyWithComponent(component: String): StorageKey =
        copy(unique = "$unique/$component")

    override fun toString() = super.toString()

    companion object {
        private val DATABASE_NAME_PATTERN = "[a-zA-Z][a-zA-Z0-1_-]*".toRegex()
        private const val VARIANT_PERSISTENT = "persistent"
        private const val VARIANT_IN_MEMORY = "in-memory"
        private val DB_STORAGE_KEY_PATTERN =
            "^($DATABASE_NAME_PATTERN):($VARIANT_PERSISTENT|$VARIANT_IN_MEMORY)/(.+)\$".toRegex()

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

            val persistent = match.groupValues[2] == "persistent"
            return DatabaseStorageKey(match.groupValues[3], persistent, match.groupValues[1])
        }
    }
}

/** [DriverProvider] which provides a [DatabaseDriver]. */
class DatabaseDriverProvider : DriverProvider {
    init {
        DriverFactory.register(this)
    }

    override fun willSupport(storageKey: StorageKey): Boolean =
        storageKey is DatabaseStorageKey

    override suspend fun <Data : Any> getDriver(
        storageKey: StorageKey,
        existenceCriteria: ExistenceCriteria
    ): Driver<Data> {
        require(storageKey is DatabaseStorageKey) {
            "Unsupported StorageKey: $storageKey for DatabaseDriverProvider"
        }
        return DatabaseDriver(storageKey, existenceCriteria)
    }
}

/** [Driver] implementation capable of managing data stored in a SQL database. */
class DatabaseDriver<Data : Any>(
    override val storageKey: StorageKey,
    override val existenceCriteria: ExistenceCriteria
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
