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

package arcs.core.storage.database

import arcs.core.common.collectExceptions
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.supervisorScope

/**
 * Defines an abstract factory capable of instantiating (or re-using, when necessary) a [Database].
 */
// TODO: In the future it may be important for there to be an additional parameter on getDatabase
//  which hints the factory as to where the database should be found (e.g. a remote server, a local
//  service like postgres, android sqlite database, non-android sqlite database, WebDatabase, etc..)
interface DatabaseManager {
  /** Manifest of [Database]s managed by this [DatabaseManager]. */
  val registry: DatabaseRegistry

  /**
   * Gets a [Database] for the given [name].  If [persistent] is `false`, the [Database] should
   * only exist in-memory (if possible for the current platform).
   */
  suspend fun getDatabase(name: String, persistent: Boolean): Database

  /** Gets a [Database] for the given [DatabaseIdentifier]. */
  suspend fun getDatabase(databaseIdentifier: DatabaseIdentifier): Database =
    getDatabase(databaseIdentifier.name, databaseIdentifier.persistent)

  /**
   * Gets [DatabasePerformanceStatistics.Snapshot]s for all databases the [DatabaseManager] is
   * aware of.
   */
  suspend fun snapshotStatistics():
    Map<DatabaseIdentifier, DatabasePerformanceStatistics.Snapshot>

  /** Clears all expired entities, in all known databases.  */
  suspend fun removeExpiredEntities()

  /** Clears all entities, in all known databases.  */
  suspend fun removeAllEntities()

  /** Clears all entities created in the given time range, in all known databases.  */
  suspend fun removeEntitiesCreatedBetween(startTimeMillis: Long, endTimeMillis: Long)

  /**
   * Reset all the databases: this is a full db wipe and all data is lost, including all
   * metadata. The results of this operation do NOT propagate to handles, therefore it is safe to
   * invoke only during a full system shutdown.
   */
  suspend fun resetAll()

  /** Garbage collection run: removes unused entities. */
  suspend fun runGarbageCollection()

  /** Gets the sum of the number of entities stored across all databases. */
  suspend fun getEntitiesCount(persistent: Boolean): Long

  /** Gets the size of the total storage used in bytes. */
  suspend fun getStorageSize(persistent: Boolean): Long

  /**
   * Returns if the current storage is too large (defined as any of the databases being
   * larger than a threshold).
   */
  suspend fun isStorageTooLarge(): Boolean
}

/**
 * A helper to use on a DatabaseManager that will run the provided block on all currently
 * registered databases.
 *
 * The method will suspend until all operations have run until they complete or throw an exception.
 * The operations will be run in parallel, and will run to termination regardless of any other
 * job throwing an exception. Any exceptions that occurred will be wrapped in a
 * [CompositeException] which will be thrown to the caller.
 */
@ExperimentalCoroutinesApi
suspend fun DatabaseManager.runOnAllDatabases(
  block: suspend (name: String, db: Database) -> Unit
) {
  supervisorScope {
    registry.fetchAll()
      .map { it.name to getDatabase(it.name, it.isPersistent) }
      .collectExceptions { block(it.first, it.second) }
  }
}

/** Identifier for an individual [Database] instance. */
typealias DatabaseIdentifier = Pair<String, Boolean>

/** Name of the [Database]. */
val DatabaseIdentifier.name: String
  get() = first

/** Whether or not the [Database] should be persisted to disk. */
val DatabaseIdentifier.persistent: Boolean
  get() = second
