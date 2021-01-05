/*
 * Copyright 2021 Google LLC.
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
import arcs.core.storage.DriverProvider
import arcs.core.storage.StorageKey
import arcs.core.storage.database.DatabaseManager
import arcs.core.storage.keys.DatabaseStorageKey
import kotlin.reflect.KClass

/** [DriverProvider] which provides a [DatabaseDriver]. */
object DatabaseDriverProvider : DriverProvider {
  /**
   * Whether or not the [DatabaseDriverProvider] has been configured with a [DatabaseManager] and
   * a schema lookup function.
   */
  val isConfigured: Boolean
    get() = _manager != null

  private var _manager: DatabaseManager? = null

  /** The configured [DatabaseManager]. */
  val manager: DatabaseManager
    get() = requireNotNull(_manager) { ERROR_MESSAGE_CONFIGURE_NOT_CALLED }

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
      dataClass,
      schemaLookup,
      manager.getDatabase(databaseKey.dbName, databaseKey is DatabaseStorageKey.Persistent)
    ).register()
  }

  override suspend fun removeAllEntities() {
    manager.removeAllEntities()
  }

  override suspend fun removeEntitiesCreatedBetween(startTimeMillis: Long, endTimeMillis: Long) {
    manager.removeEntitiesCreatedBetween(startTimeMillis, endTimeMillis)
  }

  override suspend fun getEntitiesCount(inMemory: Boolean): Long {
    return manager.getEntitiesCount(!inMemory)
  }

  override suspend fun getStorageSize(inMemory: Boolean): Long {
    return manager.getStorageSize(!inMemory)
  }

  override suspend fun isStorageTooLarge(): Boolean {
    return manager.isStorageTooLarge()
  }

  /**
   * Configures the [DatabaseDriverProvider] with the given [schemaLookup].
   */
  fun configure(databaseManager: DatabaseManager, schemaLookup: (String) -> Schema?) = apply {
    this._manager = databaseManager
    this.schemaLookup = schemaLookup
  }

  private const val ERROR_MESSAGE_CONFIGURE_NOT_CALLED =
    "DatabaseDriverProvider.configure(databaseFactory, schemaLookup) has not been called"
}
