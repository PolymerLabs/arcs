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

import kotlinx.coroutines.Job

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
    suspend fun removeExpiredEntities(): Job

    /** Clears all entities, in all known databases.  */
    suspend fun removeAllEntities()

    /** Clears all entities created in the given time range, in all known databases.  */
    suspend fun removeEntitiesCreatedBetween(startTimeMillis: Long, endTimeMillis: Long)

    /** Garbage collection run: removes unused entities. */
    suspend fun runGarbageCollection(): Job
}

/** Identifier for an individual [Database] instance. */
typealias DatabaseIdentifier = Pair<String, Boolean>

/** Name of the [Database]. */
val DatabaseIdentifier.name: String
    get() = first

/** Whether or not the [Database] should be persisted to disk. */
val DatabaseIdentifier.persistent: Boolean
    get() = second
