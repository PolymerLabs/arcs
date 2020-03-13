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

import arcs.core.crdt.VersionMap
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.storage.Reference
import arcs.core.storage.StorageKey
import arcs.core.type.Type
import kotlin.reflect.KClass

/**
 * Exposes an API for interacting with a database. Actual database implementations are platform
 * dependent (e.g. SQLite on Android).
 *
 * There will be only one instance of a [Database] for each actual database, but many
 * [arcs.core.storage.Driver]s may use that one instance.
 */
interface Database {
    /**
     * Inserts or updates the data at [storageKey] in the database, returns the new version [Int]
     * when successful, or the current version when the update could not be applied.
     */
    suspend fun insertOrUpdate(
        storageKey: StorageKey,
        data: DatabaseData,
        originatingClientId: Int? = null
    ): Boolean

    /** Fetches the data at [storageKey] from the database. */
    suspend fun get(
        storageKey: StorageKey,
        dataType: KClass<out DatabaseData>,
        schema: Schema
    ): DatabaseData?

    /** Removes everything associated with the given [storageKey] from the database. */
    suspend fun delete(storageKey: StorageKey, originatingClientId: Int? = null)

    /** Returns all storage keys stored in this database. */
    suspend fun getAllStorageKeys(): Map<StorageKey, Type>

    /** Takes a snapshot of the current [DatabasePerformanceStatistics] for the database. */
    suspend fun snapshotStatistics(): DatabasePerformanceStatistics.Snapshot

    /**
     * Registers a [client] which will be called when the data at its specified
     * [DatabaseClient.storageKey] is created, updated, or deleted. Returns a unique identifier for
     * the listener, which can be used to unregister it later, with [removeClient].
     */
    suspend fun addClient(client: DatabaseClient): Int

    /**
     * Unregisters a [DatabaseClient] by the unique [identifier] received via the return value of
     * [addClient]
     */
    suspend fun removeClient(identifier: Int)
}

/** A client interested in changes to a specific [StorageKey] in the database. */
interface DatabaseClient {
    /** The [StorageKey] this listener is interested in. */
    val storageKey: StorageKey

    /**
     * Notifies the listener of an update to the data in the [Database], when initially
     * registered - this method will be called by the [Database] with the latest current value in
     * the database, if there is one.
     */
    suspend fun onDatabaseUpdate(data: DatabaseData, version: Int, originatingClientId: Int?)

    /** Notifies the listener when the data identified by the [StorageKey] has been deleted. */
    suspend fun onDatabaseDelete(originatingClientId: Int?)
}

/** Data-exchange encapsulation to use when making requests to a [Database]. */
sealed class DatabaseData(
    open val schema: Schema,
    open val databaseVersion: Int,
    open val versionMap: VersionMap
) {
    data class Singleton(
        val reference: Reference?,
        override val schema: Schema,
        override val databaseVersion: Int,
        override val versionMap: VersionMap
    ) : DatabaseData(schema, databaseVersion, versionMap)

    data class Collection(
        val values: Set<Reference>,
        override val schema: Schema,
        override val databaseVersion: Int,
        override val versionMap: VersionMap
    ) : DatabaseData(schema, databaseVersion, versionMap)

    data class Entity(
        val rawEntity: RawEntity,
        override val schema: Schema,
        override val databaseVersion: Int,
        override val versionMap: VersionMap
    ) : DatabaseData(schema, databaseVersion, versionMap)
}
