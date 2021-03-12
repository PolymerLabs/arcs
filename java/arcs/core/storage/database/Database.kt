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

import arcs.core.common.ReferenceId
import arcs.core.crdt.VersionMap
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.storage.RawReference
import arcs.core.storage.StorageKey
import arcs.flags.BuildFlagDisabledError
import arcs.flags.BuildFlags
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

  /**
   * Updates the data at [storageKey] in the database by applying the given op.
   */
  suspend fun applyOp(storageKey: StorageKey, op: DatabaseOp, originatingClientId: Int? = null)

  /** Fetches the data at [storageKey] from the database. */
  suspend fun get(
    storageKey: StorageKey,
    dataType: KClass<out DatabaseData>,
    schema: Schema
  ): DatabaseData?

  /** Removes everything associated with the given [storageKey] from the database. */
  suspend fun delete(storageKey: StorageKey, originatingClientId: Int? = null)

  /** Clears all expired entities, leaving only a tombstone with the version map. */
  suspend fun removeExpiredEntities()

  /** Clears all entities, leaving only a tombstone with the version map. */
  suspend fun removeAllEntities()

  /** Clears all entities created in between the two times, leaving only a tombstone with the
   * version map.
   */
  suspend fun removeEntitiesCreatedBetween(startTimeMillis: Long, endTimeMillis: Long)

  /** Returns count of entities. */
  suspend fun getEntitiesCount(): Long

  /** Returns the current database size, in bytes. */
  suspend fun getSize(): Long

  /** Garbage collection run: will remove unused entities. */
  suspend fun runGarbageCollection()

  /*
   * Removes all entities that have a hard reference (in one of its fields) to the given
   * [backingStorageKey]/[entityId]. If an inline entity references it, the top level entity will
   * also be removed (as well as all its inline children).
   *
   * @return the number of top level entities removed.
   */
  suspend fun removeEntitiesHardReferencing(backingStorageKey: StorageKey, entityId: String): Long

  /**
   * Extracts all IDs of any hard reference that points to the given [backingStorageKey].
   */
  suspend fun getAllHardReferenceIds(backingStorageKey: StorageKey): Set<String>

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

  /** Deletes everything from the database. */
  fun reset()
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
    val value: ReferenceWithVersion?,
    override val schema: Schema,
    override val databaseVersion: Int,
    override val versionMap: VersionMap
  ) : DatabaseData(schema, databaseVersion, versionMap)

  data class Collection(
    val values: Set<ReferenceWithVersion>,
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

/**
 * Operations that can be applied by the database. They can only be used if the
 * write_only_storage_stack flag is enabled.
 */
sealed class DatabaseOp(open val schema: Schema) {
  init {
    if (!BuildFlags.WRITE_ONLY_STORAGE_STACK) {
      throw BuildFlagDisabledError("WRITE_ONLY_STORAGE_STACK")
    }
  }

  // Add the given element to the collection. If it is already in the collection, this is a no-op.
  data class AddToCollection(
    val value: RawReference,
    override val schema: Schema
  ) : DatabaseOp(schema)

  // Remove any element with the given id from the collection, no-op if the collection does not
  // exist or does not contain that id. Also clears the entity corresponding to the id.
  data class RemoveFromCollection(
    val id: ReferenceId,
    override val schema: Schema
  ) : DatabaseOp(schema)

  // Clear the collection, no-op if the collection does not exist or is empty.  Also clears all the
  // entities that were in the collection.
  data class ClearCollection(override val schema: Schema) : DatabaseOp(schema)
}

data class ReferenceWithVersion(
  val rawReference: RawReference,
  val versionMap: VersionMap
)
