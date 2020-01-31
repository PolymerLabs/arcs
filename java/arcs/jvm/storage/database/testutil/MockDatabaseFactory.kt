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

import arcs.core.crdt.internal.VersionMap
import arcs.core.storage.StorageKey
import arcs.core.storage.database.Database
import arcs.core.storage.database.DatabaseClient
import arcs.core.storage.database.DatabaseData
import arcs.core.storage.database.DatabaseFactory
import arcs.core.util.guardWith
import com.nhaarman.mockitokotlin2.spy
import kotlin.coroutines.coroutineContext
import kotlin.reflect.KClass
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** [DatabaseFactory] which generates mockito mocks of [Database] objects. */
class MockDatabaseFactory : DatabaseFactory {
    private val mutex = Mutex()
    private val cache: MutableMap<Pair<String, Boolean>, Database>
        by guardWith(mutex, mutableMapOf())

    override suspend fun getDatabase(name: String, persistent: Boolean): Database = mutex.withLock {
        cache[name to persistent]
            ?: spy(MockDatabase()).also { cache[name to persistent] = it }
    }
}

class MockDatabase : Database {
    private val clientMutex = Mutex()
    private var nextClientId = 1
    private val clients = mutableMapOf<Int, Pair<StorageKey, DatabaseClient>>()

    private val clientFlow: Flow<DatabaseClient> =
        flow { clientMutex.withLock { clients.values }.forEach { emit(it.second) } }

    val dataMutex = Mutex()
    val data = mutableMapOf<StorageKey, DatabaseData>()

    override suspend fun insertOrUpdate(
        storageKey: StorageKey,
        data: DatabaseData,
        originatingClientId: Int?
    ): Int {
        val version = dataMutex.withLock {
            val oldData = this.data[storageKey]
            if (oldData?.databaseVersion != data.databaseVersion) {
                this.data[storageKey] = data
                data.databaseVersion
            } else {
                oldData.databaseVersion
            }
        }

        clientFlow.onEach { it.onDatabaseUpdate(data, version, originatingClientId) }
            .launchIn(CoroutineScope(coroutineContext))

        return version
    }

    @Suppress("UNCHECKED_CAST")
    override suspend fun get(
        storageKey: StorageKey,
        dataType: KClass<out DatabaseData>
    ): DatabaseData? {
        val dataVal = dataMutex.withLock { data[storageKey] }

        if (dataVal != null) return dataVal

        return when (dataType) {
            DatabaseData.Singleton::class ->
                DatabaseData.Singleton(null, -1, VersionMap())
            DatabaseData.Collection::class ->
                DatabaseData.Collection(emptySet(), -1, VersionMap())
            DatabaseData.Entity::class -> null
            else -> throw IllegalArgumentException("Illegal type.")
        }
    }

    override suspend fun delete(storageKey: StorageKey, originatingClientId: Int?) {
        dataMutex.withLock { data.remove(storageKey) }
        clientFlow.onEach { it.onDatabaseDelete(originatingClientId) }
            .launchIn(CoroutineScope(coroutineContext))
    }

    override fun addClient(client: DatabaseClient): Int = runBlocking {
        clientMutex.withLock {
            val clientId = nextClientId++
            clients[clientId] = client.storageKey to client
            clientId
        }
    }

    override fun removeClient(identifier: Int) = runBlocking {
        clientMutex.withLock {
            clients.remove(identifier)
            Unit
        }
    }
}
