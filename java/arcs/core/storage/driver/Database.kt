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

package arcs.core.storage.driver

import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.extension.toCrdtEntityData
import arcs.core.data.Capabilities
import arcs.core.data.Schema
import arcs.core.storage.CapabilitiesResolver
import arcs.core.storage.Driver
import arcs.core.storage.DriverFactory
import arcs.core.storage.DriverProvider
import arcs.core.storage.Reference
import arcs.core.storage.StorageKey
import arcs.core.storage.database.Database
import arcs.core.storage.database.DatabaseClient
import arcs.core.storage.database.DatabaseData
import arcs.core.storage.database.DatabaseManager
import arcs.core.storage.referencemode.toCrdtSetData
import arcs.core.storage.referencemode.toCrdtSingletonData
import arcs.core.storage.referencemode.toReferenceSet
import arcs.core.storage.referencemode.toReferenceSingleton
import arcs.core.util.Random
import arcs.core.util.TaggedLog
import arcs.core.util.guardedBy
import kotlin.reflect.KClass
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

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

    /**
     * Configures the [DatabaseDriverProvider] with the given [schemaLookup] and registers it
     * with the [DriverFactory].
     */
    fun configure(databaseManager: DatabaseManager, schemaLookup: (String) -> Schema?) = apply {
        this._manager = databaseManager
        this.schemaLookup = schemaLookup
        DatabaseStorageKey.registerParser()
        DriverFactory.register(this)
        CapabilitiesResolver.registerKeyCreator(
            DATABASE_DRIVER_PROTOCOL,
            Capabilities.Persistent
        ) { storageKeyOptions ->
            DatabaseStorageKey.Persistent(
                storageKeyOptions.location,
                storageKeyOptions.entitySchema.hash
            )
        }
    }

    private const val ERROR_MESSAGE_CONFIGURE_NOT_CALLED =
        "DatabaseDriverProvider.configure(databaseFactory, schemaLookup) has not been called"
}

/** [Driver] implementation capable of managing data stored in a SQL database. */
@Suppress("RemoveExplicitTypeArguments")
class DatabaseDriver<Data : Any>(
    override val storageKey: DatabaseStorageKey,
    private val dataClass: KClass<Data>,
    private val schemaLookup: (String) -> Schema?,
    /* internal */
    val database: Database
) : Driver<Data>, DatabaseClient {
    /* internal */ var receiver: (suspend (data: Data, version: Int) -> Unit)? = null
    /* internal */ var clientId: Int = -1
    private val localDataMutex = Mutex()
    private var localData: Data? by guardedBy<Data?>(localDataMutex, null)
    private var localVersion: Int? by guardedBy<Int?>(localDataMutex, null)
    private val schema: Schema
        get() = checkNotNull(schemaLookup(storageKey.entitySchemaHash)) {
            "Schema not found for hash: ${storageKey.entitySchemaHash}"
        }
    private val log = TaggedLog { this.toString() }
    override var token: String? = null
        private set

    /* internal */
    suspend fun register(): DatabaseDriver<Data> = apply {
        clientId = database.addClient(this)

        log.debug { "Registered with clientId = $clientId" }
    }

    @Suppress("UNCHECKED_CAST")
    override suspend fun registerReceiver(
        token: String?,
        receiver: suspend (data: Data, version: Int) -> Unit
    ) {
        this.receiver = receiver
        val (pendingReceiverData, pendingReceiverVersion) = localDataMutex.withLock {
            var dataAndVersion = localData?.takeIf { this.token != token } to localVersion

            // If we didn't have any data, try and fetch it from the database.
            if (dataAndVersion.first == null || dataAndVersion.second == null) {
                log.debug { "registerReceiver($token) - no local data, fetching from database" }
                database.get(
                    storageKey,
                    when (dataClass) {
                        CrdtEntity.Data::class -> DatabaseData.Entity::class
                        CrdtSingleton.DataImpl::class -> DatabaseData.Singleton::class
                        CrdtSet.DataImpl::class -> DatabaseData.Collection::class
                        else -> throw IllegalStateException("Illegal dataClass: $dataClass")
                    },
                    schema
                )?.also {
                    dataAndVersion = when (it) {
                        is DatabaseData.Entity ->
                            it.rawEntity.toCrdtEntityData(it.versionMap)
                        is DatabaseData.Singleton ->
                            it.reference.toCrdtSingletonData(it.versionMap)
                        is DatabaseData.Collection ->
                            it.values.toCrdtSetData(it.versionMap)
                    } as Data to it.databaseVersion
                }
            }
            dataAndVersion
        }

        if (pendingReceiverData == null || pendingReceiverVersion == null) return

        log.debug {
            """
                registerReceiver($token) - calling receiver(
                    $pendingReceiverData, 
                    $pendingReceiverVersion
                )
            """.trimIndent()
        }
        receiver(pendingReceiverData, pendingReceiverVersion)
    }

    @Suppress("UNCHECKED_CAST")
    override suspend fun send(data: Data, version: Int): Boolean {
        log.debug {
            """
                send(
                    $data, 
                    $version
                )
            """.trimIndent()
        }

        // Prep the data for storage.
        val databaseData = when (data) {
            is CrdtEntity.Data -> DatabaseData.Entity(
                data.toRawEntity(),
                schema,
                version,
                data.versionMap
            )
            is CrdtSingleton.Data<*> -> {
                val referenceData = requireNotNull(data as? CrdtSingleton.Data<Reference>) {
                    "Data must be CrdtSingleton.Data<Reference>"
                }
                DatabaseData.Singleton(
                    referenceData.toReferenceSingleton(),
                    schema,
                    version,
                    referenceData.versionMap
                )
            }
            is CrdtSet.Data<*> -> {
                val referenceData = requireNotNull(data as? CrdtSet.Data<Reference>) {
                    "Data must be CrdtSet.Data<Reference>"
                }
                DatabaseData.Collection(
                    referenceData.toReferenceSet(),
                    schema,
                    version,
                    referenceData.versionMap
                )
            }
            else -> throw UnsupportedOperationException(
                "Unsupported type for DatabaseDriver: ${data::class}"
            )
        }

        // Store the prepped data.
        return (database.insertOrUpdate(storageKey, databaseData, clientId) == version).also {
            // If the update was successful, update our local data/version.
            if (it) localDataMutex.withLock {
                localData = data
                localVersion = version
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    override suspend fun onDatabaseUpdate(
        data: DatabaseData,
        version: Int,
        originatingClientId: Int?
    ) {
        // Convert the raw DatabaseData into the appropriate CRDT data model
        val actualData = when (data) {
            is DatabaseData.Singleton -> data.reference.toCrdtSingletonData(data.versionMap)
            is DatabaseData.Collection -> data.values.toCrdtSetData(data.versionMap)
            is DatabaseData.Entity -> data.rawEntity.toCrdtEntityData(data.versionMap)
        } as Data

        // Stash it locally.
        localDataMutex.withLock {
            localData = actualData
            localVersion = version
        }

        if (originatingClientId == clientId) return

        log.debug {
            """
                onDatabaseUpdate(
                    $data, 
                    version: $version, 
                    originatingClientId: $originatingClientId
                )
            """.trimIndent()
        }

        // Let the receiver know about it.
        bumpToken()
        receiver?.invoke(actualData, version)
    }

    override suspend fun onDatabaseDelete(originatingClientId: Int?) {
        localDataMutex.withLock {
            localData = null
            localVersion = null
        }

        if (originatingClientId == clientId) return

        log.debug { "onDatabaseDelete(originatingClientId: $originatingClientId)" }
        bumpToken()
    }

    override fun toString(): String = "DatabaseDriver($storageKey, $clientId)"

    /* internal */ suspend fun getLocalData(): Data? = localDataMutex.withLock { localData }

    private fun bumpToken() {
        token = Random.nextInt().toString()
    }
}
