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
import arcs.core.data.toSchema
import arcs.core.storage.Driver
import arcs.core.storage.DriverProvider
import arcs.core.storage.StorageKey
import arcs.core.storage.database.DatabaseManager
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.type.Type
import kotlin.reflect.KClass

/** [DriverProvider] which provides a [DatabaseDriver]. */
object DatabaseDriverProvider : DriverProvider {
  /**
   * Whether or not the [DatabaseDriverProvider] has been configured with a [DatabaseManager].
   */
  val isConfigured: Boolean
    get() = _manager != null

  private var _manager: DatabaseManager? = null

  /** The configured [DatabaseManager]. */
  val manager: DatabaseManager
    get() = requireNotNull(_manager) { ERROR_MESSAGE_CONFIGURE_NOT_CALLED }

  override fun willSupport(storageKey: StorageKey): Boolean {
    storageKey.getDatabaseInfo() ?: return false
    return true
  }

  override suspend fun <Data : Any> getDriver(
    storageKey: StorageKey,
    dataClass: KClass<Data>,
    type: Type
  ): Driver<Data> {
    val databaseInfo = requireNotNull(storageKey.getDatabaseInfo()) {
      "Unsupported StorageKey: $storageKey for DatabaseDriverProvider"
    }
    val schema = type.toSchema()

    require(
      dataClass == CrdtEntity.Data::class ||
        dataClass == CrdtSet.DataImpl::class ||
        dataClass == CrdtSingleton.DataImpl::class
    ) {
      "Unsupported data type: $dataClass, must be one of: CrdtEntity.Data, " +
        "CrdtSet.DataImpl, or CrdtSingleton.DataImpl"
    }
    return DatabaseDriver(
      storageKey,
      dataClass,
      schema,
      manager.getDatabase(databaseInfo.dbName, databaseInfo.persistent)
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
   * Configures the [DatabaseDriverProvider] with the provided [DatabaseManager].
   */
  fun configure(databaseManager: DatabaseManager) = apply {
    this._manager = databaseManager
  }

  /**
   * Extract DatabaseInfo from the ReferenceModeStorageKey. Returns null if the inner storage keys
   * are not database keys.
   */
  private fun ReferenceModeStorageKey.getDatabaseInfo(): DatabaseInfo? {
    val backingKey = backingKey as? DatabaseStorageKey
    val storageKey = storageKey as? DatabaseStorageKey
    if (backingKey == null || storageKey == null) {
      return null
    }

    check(backingKey.dbName == storageKey.dbName) {
      "Database can support ReferenceModeStorageKey only with a single dbName."
    }
    check(
      backingKey is DatabaseStorageKey.Persistent == storageKey is DatabaseStorageKey.Persistent
    ) {
      "Database can support ReferenceModeStorageKey only if both or neither keys are persistent."
    }
    return DatabaseInfo(
      backingKey.dbName,
      backingKey is DatabaseStorageKey.Persistent
    )
  }

  /**
   * Extract DatabaseInfo from the StorageKey. Returns null if the storageKey is not a database or
   * reference-mode key.
   */
  private fun StorageKey.getDatabaseInfo(): DatabaseInfo? = when (this) {
    is DatabaseStorageKey -> DatabaseInfo(
      dbName,
      this is DatabaseStorageKey.Persistent
    )
    is ReferenceModeStorageKey -> getDatabaseInfo()
    else -> null
  }

  data class DatabaseInfo(
    val dbName: String,
    val persistent: Boolean
  )

  private const val ERROR_MESSAGE_CONFIGURE_NOT_CALLED =
    "DatabaseDriverProvider.configure(databaseFactory) has not been called"

  /* internal */ fun resetForTests() {
    this._manager = null
  }
}
