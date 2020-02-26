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
import arcs.core.storage.database.Database
import arcs.core.storage.database.DatabaseIdentifier
import arcs.core.storage.database.DatabaseManager
import arcs.core.storage.database.DatabasePerformanceStatistics.Snapshot
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

    override suspend fun getDatabase(name: String, persistent: Boolean): Database = mutex.withLock {
        dbCache[name to persistent]
            ?: DatabaseImpl(context, name, persistent).also { dbCache[name to persistent] = it }
    }

    override suspend fun snapshotStatistics(): Map<DatabaseIdentifier, Snapshot> =
        mutex.withLock { dbCache.mapValues { it.value.snapshotStatistics() } }

    suspend fun resetAll() = mutex.withLock {
        dbCache.forEach { (_, db) -> db.reset() }
    }
}
