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

package arcs.jvm.storage.database.testutil

import arcs.core.data.Schema
import arcs.core.storage.StorageKey
import arcs.core.storage.database.Database
import arcs.core.storage.database.DatabaseClient
import arcs.core.storage.database.DatabaseData
import arcs.core.storage.database.DatabaseIdentifier
import arcs.core.storage.database.DatabaseManager
import arcs.core.storage.database.DatabasePerformanceStatistics
import arcs.core.storage.database.DatabaseRegistration
import arcs.core.storage.database.MutableDatabaseRegistry
import arcs.core.storage.database.runOnAllDatabases
import arcs.core.util.ArcsInstant
import arcs.core.util.guardedBy
import arcs.core.util.performance.PerformanceStatistics
import arcs.core.util.performance.Timer
import arcs.jvm.util.JvmTime
import kotlin.coroutines.coroutineContext
import kotlin.reflect.KClass
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** [DatabaseManager] which generates fake [Database] objects. */
open class FakeDatabaseManager : DatabaseManager {
  private val mutex = Mutex()
  private val cache: MutableMap<DatabaseIdentifier, Database>
  by guardedBy(mutex, mutableMapOf())

  private val _manifest = FakeDatabaseRegistry()
  private val clients = arrayListOf<DatabaseClient>()
  override val registry: FakeDatabaseRegistry = _manifest

  fun addClients(vararg clients: DatabaseClient) = this.clients.addAll(clients)

  override suspend fun getDatabase(name: String, persistent: Boolean): Database = mutex.withLock {
    _manifest.register(name, persistent)
    cache[name to persistent]
      ?: FakeDatabase().also {
        clients.forEach { client -> it.addClient(client) }
        cache[name to persistent] = it
      }
  }

  override suspend fun snapshotStatistics():
    Map<DatabaseIdentifier, DatabasePerformanceStatistics.Snapshot> =
      mutex.withLock { cache.mapValues { it.value.snapshotStatistics() } }

  override suspend fun removeExpiredEntities() {
    throw UnsupportedOperationException("Fake database manager cannot remove entities.")
  }

  override suspend fun removeAllEntities() {
    throw UnsupportedOperationException("Fake database manager cannot remove entities.")
  }

  override suspend fun removeEntitiesCreatedBetween(startTimeMillis: Long, endTimeMillis: Long) {
    throw UnsupportedOperationException("Fake database manager cannot remove entities.")
  }

  override suspend fun runGarbageCollection() {
    throw UnsupportedOperationException("Fake database does not garbage collect.")
  }

  override suspend fun getEntitiesCount(persistent: Boolean): Long = 0L

  override suspend fun getStorageSize(persistent: Boolean): Long {
    throw UnsupportedOperationException("Fake database does not know storage size.")
  }

  override suspend fun isStorageTooLarge(): Boolean {
    throw UnsupportedOperationException("Fake database does not know if storage is too large.")
  }

  override suspend fun resetAll() {
    throw UnsupportedOperationException("Fake database manager cannot resetAll.")
  }

  suspend fun totalInsertUpdates() = snapshotStatistics().map {
    it.value.insertUpdate.runtimeStatistics.measurements
  }.sum()

  override suspend fun removeEntitiesHardReferencing(
    backingStorageKey: StorageKey,
    entityId: String
  ) = runOnAllDatabases { _, db ->
    db.removeEntitiesHardReferencing(backingStorageKey, entityId)
  }

  override suspend fun getAllHardReferenceIds(backingStorageKey: StorageKey): Set<String> {
    return registry
      .fetchAll()
      .flatMap { getDatabase(it.name, it.isPersistent).getAllHardReferenceIds(backingStorageKey) }
      .toSet()
  }
}

@Suppress("EXPERIMENTAL_API_USAGE")
open class FakeDatabase : Database {
  private val stats = DatabasePerformanceStatistics(
    insertUpdate = PerformanceStatistics(Timer(JvmTime)),
    get = PerformanceStatistics(Timer(JvmTime)),
    delete = PerformanceStatistics(Timer(JvmTime))
  )

  private val clientMutex = Mutex()
  private var nextClientId = 1
  open val clients = mutableMapOf<Int, Pair<StorageKey, DatabaseClient>>()

  private val clientFlow: Flow<DatabaseClient> =
    flow { clientMutex.withLock { clients.values.toList() }.forEach { emit(it.second) } }

  private val dataMutex = Mutex()
  open val data = mutableMapOf<StorageKey, DatabaseData>()
  val hardReferenceDeletes: MutableList<Pair<StorageKey, String>> = mutableListOf()
  // Can be set from users of this class.
  val allHardReferenceIds = mutableSetOf<String>()

  override suspend fun insertOrUpdate(
    storageKey: StorageKey,
    data: DatabaseData,
    originatingClientId: Int?
  ): Boolean = stats.insertUpdate.timeSuspending {
    val (version, isNew) = dataMutex.withLock {
      val oldData = this.data[storageKey]
      // Must be exactly old version + 1, or have no previous version.
      if (oldData == null || data.databaseVersion == oldData.databaseVersion + 1) {
        this.data[storageKey] = data
        data.databaseVersion to true
      } else {
        oldData.databaseVersion to false
      }
    }

    if (isNew) {
      clientFlow.filter { it.storageKey == storageKey }
        .onEach { it.onDatabaseUpdate(data, version, originatingClientId) }
        .launchIn(CoroutineScope(coroutineContext + Job())).join()
    }

    isNew
  }

  @Suppress("UNCHECKED_CAST")
  override suspend fun get(
    storageKey: StorageKey,
    dataType: KClass<out DatabaseData>,
    schema: Schema
  ): DatabaseData? = stats.get.timeSuspending {
    dataMutex.withLock { data[storageKey] }
  }

  override suspend fun delete(storageKey: StorageKey, originatingClientId: Int?) =
    stats.delete.timeSuspending {
      dataMutex.withLock { data.remove(storageKey) }
      clientFlow.onEach { it.onDatabaseDelete(originatingClientId) }
        .launchIn(CoroutineScope(coroutineContext + Job())).join()
      Unit
    }

  override suspend fun snapshotStatistics() = stats.snapshot()

  override suspend fun addClient(client: DatabaseClient): Int = clientMutex.withLock {
    val clientId = nextClientId++
    clients[clientId] = client.storageKey to client
    clientId
  }

  override suspend fun removeClient(identifier: Int) = clientMutex.withLock {
    clients.remove(identifier)
    Unit
  }

  override fun reset() {
    data.clear()
  }

  override suspend fun removeExpiredEntities() {
    throw UnsupportedOperationException("Fake database cannot remove expired entities.")
  }

  override suspend fun removeAllEntities() {
    dataMutex.withLock { data.clear() }
  }

  override suspend fun removeEntitiesCreatedBetween(startTimeMillis: Long, endTimeMillis: Long) {
    throw UnsupportedOperationException("Fake db cannot remove entities by creation time.")
  }

  override suspend fun getEntitiesCount(): Long {
    throw UnsupportedOperationException("Fake db doesn't have entity count.")
  }

  override suspend fun runGarbageCollection() {
    throw UnsupportedOperationException("Fake database does not gargbage collect.")
  }

  override suspend fun getSize(): Long {
    throw UnsupportedOperationException("Fake database does not have size.")
  }

  override suspend fun removeEntitiesHardReferencing(
    backingStorageKey: StorageKey,
    entityId: String
  ) {
    hardReferenceDeletes.add(backingStorageKey to entityId)
  }

  override suspend fun getAllHardReferenceIds(backingStorageKey: StorageKey) = allHardReferenceIds
}

class FakeDatabaseRegistry : MutableDatabaseRegistry {
  private val entries = mutableSetOf<DatabaseRegistration>()

  @Synchronized
  override fun register(databaseName: String, isPersistent: Boolean): DatabaseRegistration {
    val now = ArcsInstant.now().toEpochMilli()
    entries.find { it.name == databaseName && it.isPersistent == isPersistent }?.let {
      entries.remove(it)
      return it.copy(lastAccessed = now).also { entry -> entries.add(entry) }
    }
    return DatabaseRegistration(databaseName, isPersistent, now, now).also {
      entries.add(it)
    }
  }

  @Synchronized
  override fun fetchAll(): List<DatabaseRegistration> = entries.toList()

  @Synchronized
  override fun fetchAllCreatedIn(timeRange: LongRange): List<DatabaseRegistration> =
    fetchAll().filter { it.created in timeRange }

  @Synchronized
  override fun fetchAllAccessedIn(timeRange: LongRange): List<DatabaseRegistration> =
    fetchAll().filter { it.lastAccessed in timeRange }
}
