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
import androidx.lifecycle.LifecycleObserver
import arcs.core.storage.StorageKey
import arcs.core.storage.database.Database
import arcs.core.storage.database.DatabaseIdentifier
import arcs.core.storage.database.DatabaseManager
import arcs.core.storage.database.DatabasePerformanceStatistics.Snapshot
import arcs.core.storage.database.runOnAllDatabases
import arcs.core.util.guardedBy
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * [DatabaseManager] implementation which constructs [DatabaseImpl] instances for use on Android
 * with SQLite.
 */
@ExperimentalCoroutinesApi
class AndroidSqliteDatabaseManager(
  context: Context,
  // Maximum size of the database file, if it surpasses this size, the database gets reset.
  private val maxDbSizeBytes: Int = MAX_DB_SIZE_BYTES
) : DatabaseManager, LifecycleObserver {
  private val context = context.applicationContext
  private val mutex = Mutex()
  private val dbCache by guardedBy(mutex, mutableMapOf<DatabaseIdentifier, DatabaseImpl>())
  override val registry = AndroidSqliteDatabaseRegistry(context)

  suspend fun close() {
    mutex.withLock {
      dbCache.values.forEach { it.close() }
      dbCache.clear()
    }

    registry.close()
  }

  override suspend fun getDatabase(name: String, persistent: Boolean): Database {
    val entry = registry.register(name, persistent)
    return mutex.withLock {
      dbCache[entry.name to entry.isPersistent]
        ?: DatabaseImpl(context, name, persistent) {
          mutex.withLock {
            dbCache.remove(entry.name to entry.isPersistent)
          }
        }.also {
          dbCache[entry.name to entry.isPersistent] = it
        }
    }
  }

  override suspend fun snapshotStatistics(): Map<DatabaseIdentifier, Snapshot> = mutex.withLock {
    dbCache.mapValues { it.value.snapshotStatistics() }
  }

  override suspend fun resetAll() = runOnAllDatabases { _, db ->
    db.reset()
  }

  override suspend fun removeExpiredEntities() = runOnAllDatabases { _, db ->
    if (databaseSizeTooLarge(db)) {
      // If the database size is too large, we clear it entirely.
      db.removeAllEntities()
    } else {
      db.removeExpiredEntities()
    }
  }

  override suspend fun removeAllEntities() = runOnAllDatabases { _, db ->
    db.removeAllEntities()
  }

  override suspend fun removeEntitiesCreatedBetween(
    startTimeMillis: Long,
    endTimeMillis: Long
  ) = runOnAllDatabases { _, db ->
    db.removeEntitiesCreatedBetween(startTimeMillis, endTimeMillis)
  }

  override suspend fun removeEntitiesHardReferencing(
    backingStorageKey: StorageKey,
    entityId: String
  ) = runOnAllDatabases { _, db ->
    db.removeEntitiesHardReferencing(backingStorageKey, entityId)
  }

  override suspend fun runGarbageCollection() = runOnAllDatabases { _, db ->
    db.runGarbageCollection()
  }

  override suspend fun getEntitiesCount(persistent: Boolean): Long {
    return registry
      .fetchAll()
      .filter { it.isPersistent == persistent }
      .map { getDatabase(it.name, it.isPersistent).getEntitiesCount() }
      .sum()
  }

  override suspend fun getStorageSize(persistent: Boolean): Long {
    return registry
      .fetchAll()
      .filter { it.isPersistent == persistent }
      .map { getDatabase(it.name, it.isPersistent).getSize() }
      .sum()
  }

  override suspend fun isStorageTooLarge(): Boolean {
    return registry
      .fetchAll()
      .filter { databaseSizeTooLarge(getDatabase(it.name, it.isPersistent)) }
      .any()
  }

  private suspend fun databaseSizeTooLarge(db: Database): Boolean {
    return db.getSize() > maxDbSizeBytes
  }

  companion object {
    /** Maximum size of the database in bytes. */
    const val MAX_DB_SIZE_BYTES = 50 * 1024 * 1024 // 50 Megabytes.
  }
}
