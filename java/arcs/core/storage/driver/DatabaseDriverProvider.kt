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
import arcs.core.data.toSchema
import arcs.core.storage.Driver
import arcs.core.storage.DriverProvider
import arcs.core.storage.StorageKey
import arcs.core.storage.database.DatabaseManager
import arcs.core.storage.driver.DatabaseDriverProvider.getDatabaseInfo
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.type.Type
import arcs.flags.BuildFlags
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

  private val DEFAULT_SCHEMA_LOOKUP: (String) -> Schema? = {
    throw IllegalStateException(ERROR_MESSAGE_CONFIGURE_NOT_CALLED)
  }

  /**
   * Function which will be used to determine, at runtime, which [Schema] to associate with its
   * hash value.
   */
  private var schemaLookup = DEFAULT_SCHEMA_LOOKUP

  override fun willSupport(storageKey: StorageKey): Boolean {
    val databaseInfo = storageKey.getDatabaseInfo() ?: return false
    if (!BuildFlags.STORAGE_KEY_REDUCTION) {
      val entitySchemaHash = requireNotNull(databaseInfo.entitySchemaHash) {
        "Entity schema hash missing"
      }
      return schemaLookup(entitySchemaHash) != null
    }
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
    val schema = if (BuildFlags.STORAGE_KEY_REDUCTION) {
      // Use schema from the provided type.
      type.toSchema()
    } else {
      // Pull the schema hash out of the storage key.
      val hash = requireNotNull(storageKey.getDatabaseInfo()?.entitySchemaHash) {
        "Schema hash missing from storage key."
      }
      requireNotNull(schemaLookup(hash)) {
        "Unsupported DatabaseStorageKey: No Schema found with hash: $hash"
      }
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
   * Configures the [DatabaseDriverProvider] with the given [schemaLookup].
   */
  fun configure(databaseManager: DatabaseManager, schemaLookup: (String) -> Schema?) = apply {
    this._manager = databaseManager
    this.schemaLookup = schemaLookup
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
    if (!BuildFlags.STORAGE_KEY_REDUCTION) {
      check(backingKey.entitySchemaHash == storageKey.entitySchemaHash) {
        "Database can support ReferenceModeStorageKey only with a single entitySchemaHash."
      }
    }
    check(
      backingKey is DatabaseStorageKey.Persistent == storageKey is DatabaseStorageKey.Persistent
    ) {
      "Database can support ReferenceModeStorageKey only if both or neither keys are persistent."
    }
    return DatabaseInfo(
      if (BuildFlags.STORAGE_KEY_REDUCTION) null else backingKey.entitySchemaHash,
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
      if (BuildFlags.STORAGE_KEY_REDUCTION) null else entitySchemaHash,
      dbName,
      this is DatabaseStorageKey.Persistent
    )
    is ReferenceModeStorageKey -> getDatabaseInfo()
    else -> null
  }

  data class DatabaseInfo(
    // TODO(b/179216769): Delete this field from this file entirely.
    val entitySchemaHash: String?,
    val dbName: String,
    val persistent: Boolean
  )

  private const val ERROR_MESSAGE_CONFIGURE_NOT_CALLED =
    "DatabaseDriverProvider.configure(databaseFactory, schemaLookup) has not been called"

  /* internal */ fun resetForTests() {
    this._manager = null
    this.schemaLookup = DEFAULT_SCHEMA_LOOKUP
  }
}
