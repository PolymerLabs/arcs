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

import arcs.core.util.guardWith
import com.nhaarman.mockitokotlin2.mock
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.Job
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlin.coroutines.CoroutineContext

/** [DatabaseFactory] which generates mockito mocks of [Database] objects. */
class MockDatabaseFactory(coroutineContext: CoroutineContext) : DatabaseFactory {
    @Suppress("unused")
    private val job = Job() + coroutineContext + CoroutineName("Mock Database Factory")
    private val mutex = Mutex()
    private val cache: MutableMap<Pair<String, Boolean>, Database>
        by guardWith(mutex, mutableMapOf())

    override suspend fun getDatabase(name: String, persistent: Boolean): Database = mutex.withLock {
        cache[name to persistent]
            ?: createMockDatabase().also { cache[name to persistent] = it }
    }

    private fun createMockDatabase(): Database {
        return mock()
        /*
        TODO: Delete this, or figure out how to make it work internally.
        val clientMutex = Mutex()
        var nextClientId = 1
        val clients = mutableMapOf<Int, Pair<StorageKey, DatabaseClient<DatabaseData>>>()

        val dataMutex = Mutex()
        val data = mutableMapOf<StorageKey, DatabaseData>()

        return mock {
            // Handle client registration.
            val clientCaptor = argumentCaptor<DatabaseClient<DatabaseData>>()
            on { addClient(clientCaptor.capture()) }.then {
                val key = clientCaptor.lastValue.storageKey
                val client = clientCaptor.lastValue
                runBlocking {
                    clientMutex.withLock {
                        val clientId = nextClientId++
                        clients[clientId] = key to client
                        clientId
                    }
                }
            }

            // Handle data fetching.
            val getStorageKeyCaptor = argumentCaptor<StorageKey>()
            val getTypeCaptor = argumentCaptor<KClass<out DatabaseData>>()
            onBlocking { get(getStorageKeyCaptor.capture(), getTypeCaptor.capture()) }.then {
                val key = getStorageKeyCaptor.lastValue
                val dataVal = runBlocking { dataMutex.withLock { data[key] } }

                if (dataVal != null) return@then dataVal

                when (getTypeCaptor.lastValue) {
                    DatabaseData.Singleton::class ->
                        DatabaseData.Singleton(null, -1, VersionMap())
                    DatabaseData.Collection::class ->
                        DatabaseData.Collection(emptySet(), -1, VersionMap())
                    DatabaseData.Entity::class -> null
                    else -> throw IllegalArgumentException("Illegal type.")
                }
            }

            // Handle insert/update calls
            val insertStorageKeyCaptor = argumentCaptor<StorageKey>()
            val insertDataCaptor = argumentCaptor<DatabaseData>()
            val insertIdCaptor = nullableArgumentCaptor<Int>()
            onBlocking {
                insertOrUpdate(
                    insertStorageKeyCaptor.capture(),
                    insertDataCaptor.capture(),
                    insertIdCaptor.capture()
                )
            }.then {
                val key = insertStorageKeyCaptor.lastValue
                val newData = insertDataCaptor.lastValue
                val clientId = insertIdCaptor.lastValue
                val version = runBlocking {
                    dataMutex.withLock {
                        val oldData = data[key]
                        if (oldData?.databaseVersion != newData.databaseVersion) {
                            data[key] = newData
                        }
                        data[key]!!.databaseVersion
                    }
                }
                val interestedClients = runBlocking {
                    clientMutex.withLock { clients.values.filter { value -> value.first == key } }
                        .map { (_, client) -> client }
                }
                interestedClients.forEach {
                    CoroutineScope(job).launch { it.onDatabaseUpdate(newData, version, clientId) }
                }
                version
            }

            // Handle delete calls.
            val deleteKeyCaptor = argumentCaptor<StorageKey>()
            val deleteIdCaptor = nullableArgumentCaptor<Int>()
            onBlocking { delete(deleteKeyCaptor.capture(), deleteIdCaptor.capture()) }.then {
                val key = deleteKeyCaptor.lastValue
                runBlocking { dataMutex.withLock { data.remove(key) } }

                val interestedClients: List<DatabaseClient<DatabaseData>> = runBlocking {
                    clientMutex.withLock { clients.values.filter { value -> value.first == key } }
                        .map { (_, client) -> client }
                }

                interestedClients.forEach {
                    CoroutineScope(job).launch { it.onDatabaseDelete(deleteIdCaptor.lastValue) }
                }
            }

            // Handle client de-registration.
            val removeClientIdCaptor = argumentCaptor<Int>()
            on { removeClient(removeClientIdCaptor.capture()) }.then {
                val clientId = removeClientIdCaptor.lastValue
                runBlocking { clientMutex.withLock { clients.remove(clientId) } }
            }
        }
         */
    }
}

