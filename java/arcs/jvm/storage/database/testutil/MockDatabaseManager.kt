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

import arcs.core.crdt.VersionMap
import arcs.core.data.Schema
import arcs.core.storage.StorageKey
import arcs.core.storage.database.Database
import arcs.core.storage.database.DatabaseClient
import arcs.core.storage.database.DatabaseData
import arcs.core.storage.database.DatabaseIdentifier
import arcs.core.storage.database.DatabaseManager
import arcs.core.storage.database.DatabasePerformanceStatistics
import arcs.core.util.guardedBy
import arcs.core.util.performance.PerformanceStatistics
import arcs.jvm.util.performance.JvmTimer
import kotlin.coroutines.coroutineContext
import kotlin.reflect.KClass
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** [DatabaseManager] which generates mockito mocks of [Database] objects. */
class MockDatabaseManager : DatabaseManager {
    private val mutex = Mutex()
    private val cache: MutableMap<DatabaseIdentifier, Database>
        by guardedBy(mutex, mutableMapOf())

    override suspend fun getDatabase(name: String, persistent: Boolean): Database = mutex.withLock {
        cache[name to persistent]
            ?: MockDatabase().also { cache[name to persistent] = it }
    }

    override suspend fun snapshotStatistics():
        Map<DatabaseIdentifier, DatabasePerformanceStatistics.Snapshot> =
        mutex.withLock { cache.mapValues { it.value.snapshotStatistics() } }
}

@Suppress("EXPERIMENTAL_API_USAGE")
open class MockDatabase : Database {
    private val stats = DatabasePerformanceStatistics(
        insertUpdate = PerformanceStatistics(JvmTimer),
        get = PerformanceStatistics(JvmTimer),
        delete = PerformanceStatistics(JvmTimer)
    )

    private val clientMutex = Mutex()
    private var nextClientId = 1
    open val clients = mutableMapOf<Int, Pair<StorageKey, DatabaseClient>>()

    private val clientFlow: Flow<DatabaseClient> =
        flow { clientMutex.withLock { clients.values }.forEach { emit(it.second) } }

    private val dataMutex = Mutex()
    open val data = mutableMapOf<StorageKey, DatabaseData>()

    override suspend fun insertOrUpdate(
        storageKey: StorageKey,
        data: DatabaseData,
        originatingClientId: Int?
    ): Int = stats.insertUpdate.timeSuspending {
        val (version, isNew) = dataMutex.withLock {
            val oldData = this.data[storageKey]
            if (oldData?.databaseVersion != data.databaseVersion) {
                this.data[storageKey] = data
                data.databaseVersion to true
            } else {
                oldData.databaseVersion to false
            }
        }

        if (isNew) {
            clientFlow.filter { it.storageKey == storageKey }
                .onEach { it.onDatabaseUpdate(data, version, originatingClientId) }
                .launchIn(CoroutineScope(coroutineContext))
        }

        return@timeSuspending version
    }

    @Suppress("UNCHECKED_CAST")
    override suspend fun get(
        storageKey: StorageKey,
        dataType: KClass<out DatabaseData>,
        schema: Schema
    ): DatabaseData? = stats.get.timeSuspending {
        val dataVal = dataMutex.withLock { data[storageKey] }

        if (dataVal != null) return@timeSuspending dataVal

        return@timeSuspending when (dataType) {
            DatabaseData.Singleton::class ->
                DatabaseData.Singleton(null, schema, -1, VersionMap())
            DatabaseData.Collection::class ->
                DatabaseData.Collection(emptySet(), schema, -1, VersionMap())
            DatabaseData.Entity::class -> null
            else -> throw IllegalArgumentException("Illegal type.")
        }
    }

    override suspend fun delete(storageKey: StorageKey, originatingClientId: Int?) =
        stats.delete.timeSuspending {
            dataMutex.withLock { data.remove(storageKey) }
            clientFlow.onEach { it.onDatabaseDelete(originatingClientId) }
                .launchIn(CoroutineScope(coroutineContext))
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
}
