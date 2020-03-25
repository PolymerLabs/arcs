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

package arcs.android.storage.database

import android.content.Context
import arcs.core.storage.StorageKey
import arcs.core.storage.database.Database
import arcs.core.storage.database.DatabaseIdentifier
import arcs.core.storage.database.DatabaseManager
import arcs.core.storage.database.DatabasePerformanceStatistics.Snapshot
import arcs.core.type.Type
import arcs.core.util.guardedBy
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * [DatabaseManager] implementation which constructs [DatabaseImpl] instances for use on Android
 * with SQLite.
 */
class AndroidSqliteDatabaseManager(context: Context) : DatabaseManager {
    private val context = context.applicationContext
    private val mutex = Mutex()
    private val dbCache by guardedBy(mutex, mutableMapOf<DatabaseIdentifier, DatabaseImpl>())
    override val registry = AndroidSqliteDatabaseRegistry(context)

    override suspend fun getDatabase(name: String, persistent: Boolean): Database {
        val entry = registry.register(name, persistent)
        return mutex.withLock {
            dbCache[entry.name to entry.isPersistent]
                ?: DatabaseImpl(context, name, persistent).also {
                    dbCache[entry.name to entry.isPersistent] = it
                }
        }
    }

    override suspend fun snapshotStatistics(): Map<DatabaseIdentifier, Snapshot> = mutex.withLock {
        dbCache.mapValues { it.value.snapshotStatistics() }
    }

    suspend fun resetAll() {
        registry.fetchAll()
            .map { getDatabase(it.name, it.isPersistent) as DatabaseImpl }
            .forEach { it.reset() }
    }

    override suspend fun getAllStorageKeys(): Map<StorageKey, Type> {
        val all = mutableMapOf<StorageKey, Type>()
        registry.fetchAll().map { getDatabase(it.name, it.isPersistent) }
            .forEach { all.putAll(it.getAllStorageKeys()) }
        return all
    }

    override suspend fun removeExpiredEntities() {
        registry.fetchAll()
            .map { getDatabase(it.name, it.isPersistent) as DatabaseImpl }
            .forEach { it.removeExpiredEntities() }
    }
}
