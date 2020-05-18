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

package arcs.android.storage.database

import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.util.Base64
import androidx.annotation.VisibleForTesting
import arcs.android.common.bindBoolean
import arcs.android.common.forEach
import arcs.android.common.forSingleResult
import arcs.android.common.getBoolean
import arcs.android.common.getNullableBoolean
import arcs.android.common.getNullableDouble
import arcs.android.common.getNullableString
import arcs.android.common.map
import arcs.android.common.transaction
import arcs.android.crdt.VersionMapProto
import arcs.android.crdt.fromProto
import arcs.android.crdt.toProto
import arcs.core.common.Referencable
import arcs.core.crdt.VersionMap
import arcs.core.data.FieldName
import arcs.core.data.FieldType
import arcs.core.data.LARGEST_PRIMITIVE_TYPE_ID
import arcs.core.data.PrimitiveType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.data.util.toReferencable
import arcs.core.storage.Reference
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyParser
import arcs.core.storage.database.Database
import arcs.core.storage.database.DatabaseClient
import arcs.core.storage.database.DatabaseData
import arcs.core.storage.database.DatabasePerformanceStatistics
import arcs.core.util.TaggedLog
import arcs.core.util.guardedBy
import arcs.core.util.performance.Counters
import arcs.core.util.performance.PerformanceStatistics
import arcs.core.util.performance.Timer
import arcs.jvm.util.JvmTime
import com.google.protobuf.InvalidProtocolBufferException
import java.time.Duration
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

/** The Type ID that gets stored in the database. */
typealias TypeId = Long

/** The ID for a field in a schema. */
typealias FieldId = Long

/** The ID for a storage key. */
typealias StorageKeyId = Long

/** The ID of a field value, referring to either a row in a primitive table, or an entity ID. */
typealias FieldValueId = Long

/** The ID of a collection (or a singleton). */
typealias CollectionId = Long

/** The ID of an entity reference. */
typealias ReferenceId = Long

/** Implementation of [Database] for Android using SQLite. */
@VisibleForTesting(otherwise = VisibleForTesting.PACKAGE_PRIVATE)
@Suppress("Recycle", "EXPERIMENTAL_API_USAGE") // Our helper extension methods close Cursors correctly.
class DatabaseImpl(
    context: Context,
    databaseName: String,
    persistent: Boolean = true
) : Database, SQLiteOpenHelper(
    context,
    // Using `null` with SQLiteOpenHelper's database name makes it an in-memory database.
    if (persistent) databaseName else null,
    /* cursorFactory = */ null,
    DB_VERSION
) {
    private val log = TaggedLog { this.toString() }

    // TODO: handle rehydrating from a snapshot.
    private val stats = DatabasePerformanceStatistics(
        insertUpdate = PerformanceStatistics(
            Timer(JvmTime),
            *DatabaseCounters.INSERT_UPDATE_COUNTERS
        ),
        get = PerformanceStatistics(Timer(JvmTime), *DatabaseCounters.GET_COUNTERS),
        delete = PerformanceStatistics(Timer(JvmTime), *DatabaseCounters.DELETE_COUNTERS)
    )

    private val schemaMutex = Mutex()
    /** Maps from schema hash to type ID (local copy of the 'types' table). */
    private val schemaTypeMap by guardedBy(schemaMutex, ::loadTypes)

    private val clientMutex = Mutex()
    private var nextClientId by guardedBy(clientMutex, 1)
    private val clients by guardedBy(clientMutex, mutableMapOf<Int, DatabaseClient>())
    private val clientFlow: Flow<DatabaseClient> = flow {
        clientMutex.withLock {
            // Make a copy of the values to prevent ConcurrentModificationExceptions.
            clients.values.toList()
        }.forEach { emit(it) }
    }

    override fun onCreate(db: SQLiteDatabase) = db.transaction {
        CREATE.forEach(db::execSQL)

        // Populate the 'types' table with the primitive types. The ordinal of the enum will be
        // the Type ID used in the database.
        val content = ContentValues().apply {
            put("is_primitive", true)
        }
        PrimitiveType.values().forEach {
            content.apply {
                put("id", it.ordinal)
                put("name", it.name)
            }
            insertOrThrow(TABLE_TYPES, null, content)
        }
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = db.transaction {
        ((oldVersion + 1)..newVersion).forEach {
            nextVersion -> MIGRATION_STEPS[nextVersion]?.forEach(db::execSQL)
        }
    }

    override suspend fun addClient(client: DatabaseClient): Int = clientMutex.withLock {
        clients[nextClientId] = client
        nextClientId++
    }

    override suspend fun removeClient(identifier: Int) = clientMutex.withLock {
        clients.remove(nextClientId)
        // TODO: When all clients are done with the database, close the connection.
        Unit
    }

    override suspend fun get(
        storageKey: StorageKey,
        dataType: KClass<out DatabaseData>,
        schema: Schema
    ) = stats.get.timeSuspending { counters ->
        when (dataType) {
            DatabaseData.Entity::class -> {
                counters.increment(DatabaseCounters.GET_ENTITY)
                getEntity(storageKey, schema, counters)
            }
            DatabaseData.Collection::class -> {
                counters.increment(DatabaseCounters.GET_COLLECTION)
                getCollection(storageKey, schema, counters)
            }
            DatabaseData.Singleton::class -> {
                counters.increment(DatabaseCounters.GET_SINGLETON)
                getSingleton(storageKey, schema, counters)
            }
            else -> throw UnsupportedOperationException("Unsupported data type $dataType.")
        }
    }

    @VisibleForTesting
    @Suppress("UNCHECKED_CAST")
    fun getEntity(
        storageKey: StorageKey,
        schema: Schema,
        counters: Counters? = null
    ): DatabaseData.Entity? = readableDatabase.transaction {
        val db = this
        // Fetch the entity's type by storage key.
        counters?.increment(DatabaseCounters.GET_ENTITY_TYPE_BY_STORAGEKEY)
        rawQuery(
            """
                SELECT
                    storage_keys.id,
                    storage_keys.data_type,
                    entities.entity_id,
                    entities.creation_timestamp,
                    entities.expiration_timestamp,
                    entities.version_map,
                    entities.version_number
                FROM storage_keys
                LEFT JOIN entities ON storage_keys.id = entities.storage_key_id
                WHERE storage_keys.storage_key = ?
            """.trimIndent(),
            arrayOf(storageKey.toString())
        ).forSingleResult {
            val dataType = DataType.values()[it.getInt(1)]
            require(dataType == DataType.Entity) {
                "Expected storage key $storageKey to be an Entity but was a $dataType."
            }
            val storageKeyId = it.getLong(0)
            val entityId = it.getString(2)
            val creationTimestamp = it.getLong(3)
            val expirationTimestamp = it.getLong(4)
            val versionMap = requireNotNull(it.getVersionMap(5)) {
                "No VersionMap available for Entity at $storageKey"
            }
            val versionNumber = it.getInt(6)
            val (singletons, collections) = getEntityFields(storageKeyId, counters, db)
            return DatabaseData.Entity(
                RawEntity(
                    id = entityId,
                    singletons = singletons,
                    collections = collections,
                    creationTimestamp = creationTimestamp,
                    expirationTimestamp = expirationTimestamp
                ),
                schema,
                versionNumber,
                versionMap
            )
        }
    }

    /** Returns the singleton and collection fields for the entity at the given storage key ID. */
    private fun getEntityFields(
        storageKeyId: StorageKeyId,
        counters: Counters?,
        db: SQLiteDatabase
    ): Pair<Map<FieldName, Referencable?>, Map<FieldName, Set<Referencable>>> {
        counters?.increment(DatabaseCounters.GET_ENTITY_FIELDS)
        val singletons = mutableMapOf<FieldName, Referencable?>()
        val collections = mutableMapOf<FieldName, MutableSet<Referencable>>()

        db.rawQuery(
            """
                SELECT
                    fields.name,
                    fields.is_collection,
                    fields.type_id,
                    CASE
                        WHEN fields.is_collection = 0 THEN field_values.value_id
                        ELSE collection_entries.value_id
                    END AS field_value_id,
                    text_primitive_values.value,
                    number_primitive_values.value,
                    entity_refs.entity_id,
                    entity_refs.backing_storage_key,
                    entity_refs.version_map,
                    entity_refs.creation_timestamp,
                    entity_refs.expiration_timestamp
                FROM storage_keys
                LEFT JOIN entities
                    ON entities.storage_key_id = storage_keys.id
                LEFT JOIN fields
                    ON fields.parent_type_id = storage_keys.value_id
                LEFT JOIN field_values
                    ON field_values.entity_storage_key_id = storage_keys.id
                    AND field_values.field_id = fields.id
                LEFT JOIN collection_entries
                    ON fields.is_collection = 1
                    AND collection_entries.collection_id = field_values.value_id
                LEFT JOIN number_primitive_values
                    ON fields.type_id = 1 AND number_primitive_values.id = field_value_id
                LEFT JOIN text_primitive_values
                    ON fields.type_id = 2 AND text_primitive_values.id = field_value_id
                LEFT JOIN entity_refs
                    ON fields.type_id > 2 AND entity_refs.id = field_value_id
                WHERE storage_keys.id = ?
            """.trimIndent(),
            arrayOf(storageKeyId.toString())
        ).forEach {
            // Artifact of all the LEFT JOINs. If the entity is empty, there can be a single
            // row full of NULLs. Just skip it if null.
            val fieldName = it.getNullableString(0) ?: return@forEach
            val isCollection = it.getBoolean(1)
            val typeId = it.getInt(2)

            val value: Referencable? = when (typeId) {
                PrimitiveType.Boolean.ordinal -> it.getNullableBoolean(3)?.toReferencable()
                PrimitiveType.Text.ordinal -> it.getNullableString(4)?.toReferencable()
                PrimitiveType.Number.ordinal -> it.getNullableDouble(5)?.toReferencable()
                else -> if (it.isNull(6)) {
                    null
                } else {
                    Reference(
                        it.getString(6),
                        StorageKeyParser.parse(it.getString(7)),
                        it.getVersionMap(8),
                        it.getLong(9),
                        it.getLong(10)
                    )
                }
            }

            if (isCollection) {
                // Ensure we create the collection even if the element to add is null.
                val collection = collections.getOrPut(fieldName) { mutableSetOf() }
                value?.let { x -> collection.add(x) }
            } else {
                singletons[fieldName] = value
            }
        }
        return singletons to collections
    }

    @VisibleForTesting
    fun getCollection(
        storageKey: StorageKey,
        schema: Schema,
        counters: Counters? = null
    ): DatabaseData.Collection? = readableDatabase.transaction {
        val db = this
        counters?.increment(DatabaseCounters.GET_COLLECTION_ID)
        val (collectionId, versionMap, versionNumber) =
            getCollectionMetadata(storageKey, DataType.Collection, db)
                ?: return@transaction null

        counters?.increment(DatabaseCounters.GET_COLLECTION_ENTRIES)
        val values = getCollectionReferenceEntries(collectionId, db)
        DatabaseData.Collection(
            values,
            schema,
            versionNumber,
            versionMap
        )
    }

    @VisibleForTesting
    fun getSingleton(
        storageKey: StorageKey,
        schema: Schema,
        counters: Counters? = null
    ): DatabaseData.Singleton? = readableDatabase.transaction {
        val db = this
        counters?.increment(DatabaseCounters.GET_SINGLETON_ID)
        val (collectionId, versionMap, versionNumber) =
            getCollectionMetadata(storageKey, DataType.Singleton, db)
                ?: return@transaction null

        counters?.increment(DatabaseCounters.GET_SINGLETON_ENTRIES)
        val values = getCollectionReferenceEntries(collectionId, db)
        require(values.size <= 1) {
            "Singleton at storage key $storageKey has more than one value."
        }
        val reference = values.singleOrNull()
        DatabaseData.Singleton(
            reference,
            schema,
            versionNumber,
            versionMap
        )
    }

    override suspend fun insertOrUpdate(
        storageKey: StorageKey,
        data: DatabaseData,
        originatingClientId: Int?
    ): Boolean = stats.insertUpdate.timeSuspending { counters ->
        when (data) {
            is DatabaseData.Entity -> {
                counters.increment(DatabaseCounters.INSERTUPDATE_ENTITY)
                insertOrUpdateEntity(storageKey, data, counters)
            }
            is DatabaseData.Collection -> {
                counters.increment(DatabaseCounters.INSERTUPDATE_COLLECTION)
                insertOrUpdateCollection(storageKey, data, DataType.Collection, counters)
            }
            is DatabaseData.Singleton -> {
                counters.increment(DatabaseCounters.INSERTUPDATE_SINGLETON)
                insertOrUpdateSingleton(storageKey, data, counters)
            }
        }
    }.also { success ->
        if (success) {
            notifyClients(storageKey) {
                it.onDatabaseUpdate(data, data.databaseVersion, originatingClientId)
            }
        }
    }

    @VisibleForTesting
    suspend fun insertOrUpdateEntity(
        storageKey: StorageKey,
        data: DatabaseData.Entity,
        counters: Counters? = null
    ): Boolean = writableDatabase.transaction {
        val db = this
        val entity = data.rawEntity
        // Fetch/create the entity's type ID.
        val schemaTypeId = getSchemaTypeId(data.schema, db, counters)
        // Create a new ID for the storage key.
        val storageKeyId = createEntityStorageKeyId(
            storageKey,
            entity.id,
            entity.creationTimestamp,
            entity.expirationTimestamp,
            schemaTypeId,
            data.versionMap,
            data.databaseVersion,
            db,
            counters
        ) ?: return@transaction false // Database has newer data. Don't apply the given op.

        // Insert the entity's field types.
        counters?.increment(DatabaseCounters.GET_ENTITY_FIELDS)
        val fields = getSchemaFields(schemaTypeId, db)
        val content = ContentValues().apply {
            put("entity_storage_key_id", storageKeyId)
        }
        entity.allData
            .filter { (_, fieldValue) ->
                // If a field value is null, we don't write it to the database.
                fieldValue != null
            }
            .forEach { (fieldName, fieldValue) ->
                content.apply {
                    val field = fields.getValue(fieldName)
                    put("field_id", field.fieldId)
                    val valueId = when {
                        field.isCollection -> {
                            if (fieldValue == null) return@forEach
                            require(fieldValue is Set<*>) {
                                "Collection fields must be of type Set. Instead found " +
                                    "${fieldValue::class}."
                            }
                            if (fieldValue.isEmpty()) return@forEach
                            insertFieldCollection(
                                fieldValue,
                                field.typeId,
                                db,
                                counters
                            )
                        }
                        isPrimitiveType(field.typeId) -> {
                            getPrimitiveValueId(
                                fieldValue as Referencable,
                                field.typeId,
                                db,
                                counters
                            )
                        }
                        else -> {
                            require(fieldValue is Reference) {
                                "Expected field value to be a Reference but was $fieldValue."
                            }
                            getEntityReferenceId(fieldValue, db, counters)
                        }
                    }
                    put("value_id", valueId)
                }

                counters?.increment(DatabaseCounters.UPDATE_ENTITY_FIELD_VALUE)
                insertWithOnConflict(
                    TABLE_FIELD_VALUES,
                    null,
                    content,
                    SQLiteDatabase.CONFLICT_REPLACE
                )
            }
            true
    }

    /**
     * Inserts a new collection into the database. Can contain primitives or references. Will create
     * and return a new collection ID for the collection. For entity field collections only (handle
     * collections should use [insertOrUpdateCollection]).
     */
    private fun insertFieldCollection(
        elements: Set<*>,
        typeId: TypeId,
        db: SQLiteDatabase,
        counters: Counters?
    ): FieldValueId = db.transaction {
        // Create a new collection.
        counters?.increment(DatabaseCounters.INSERT_COLLECTION_RECORD)
        val collectionId = insertOrThrow(
            TABLE_COLLECTIONS,
            null,
            ContentValues().apply {
                put("type_id", typeId)
                // Entity field collections don't need version maps or numbers.
            }
        )

        val content = ContentValues().apply {
            put("collection_id", collectionId)
        }
        // TODO(#4889): Don't do this one-by-one.
        val valueIds = if (isPrimitiveType(typeId)) {
            elements.map { getPrimitiveValueId(it as Referencable, typeId, db) }
        } else {
            elements.map {
                require(it is Reference) {
                    "Expected element in collection to be a Reference but was $it."
                }
                getEntityReferenceId(it, db, counters)
            }
        }
        valueIds.forEach { valueId ->
            content.put("value_id", valueId)
            counters?.increment(DatabaseCounters.INSERT_COLLECTION_ENTRY)
            insertOrThrow(TABLE_COLLECTION_ENTRIES, null, content)
        }

        collectionId
    }

    @VisibleForTesting
    suspend fun insertOrUpdateCollection(
        storageKey: StorageKey,
        data: DatabaseData.Collection,
        dataType: DataType,
        counters: Counters?
    ): Boolean = writableDatabase.transaction {
        val db = this

        // Fetch/create the entity's type ID.
        val schemaTypeId = getSchemaTypeId(data.schema, db, counters)

        when (dataType) {
            DataType.Collection ->
                counters?.increment(DatabaseCounters.GET_COLLECTION_ID)
            DataType.Singleton ->
                counters?.increment(DatabaseCounters.GET_SINGLETON_ID)
            else -> Unit
        }

        // Retrieve existing collection ID for this storage key, if one exists.
        val metadata = getCollectionMetadata(storageKey, dataType, db)

        val collectionId = if (metadata == null) {
            // Create a new collection ID and storage key ID.
            when (dataType) {
                DataType.Collection ->
                    counters?.increment(DatabaseCounters.INSERT_COLLECTION_RECORD)
                DataType.Singleton ->
                    counters?.increment(DatabaseCounters.INSERT_SINGLETON_RECORD)
                else -> Unit
            }
            val collectionId = insertOrThrow(
                TABLE_COLLECTIONS,
                null,
                ContentValues().apply {
                    put("type_id", schemaTypeId)
                    put("version_map", data.versionMap.toProtoLiteral())
                    put("version_number", data.databaseVersion)
                }
            )
            when (dataType) {
                DataType.Collection ->
                    counters?.increment(DatabaseCounters.INSERT_COLLECTION_STORAGEKEY)
                DataType.Singleton ->
                    counters?.increment(DatabaseCounters.INSERT_SINGLETON_STORAGEKEY)
                else -> Unit
            }
            insertOrThrow(
                TABLE_STORAGE_KEYS,
                null,
                ContentValues().apply {
                    put("storage_key", storageKey.toString())
                    put("data_type", dataType.ordinal)
                    put("value_id", collectionId)
                }
            )
            collectionId
        } else {
            // Collection already exists; delete all existing entries.
            val collectionId = metadata.collectionId
            if (data.databaseVersion != metadata.versionNumber + 1) {
                return@transaction false
            }

            // TODO(#4889): Don't blindly delete everything and re-insert: only insert/remove the
            // diff.
            when (dataType) {
                DataType.Collection ->
                    counters?.increment(DatabaseCounters.DELETE_COLLECTION_ENTRIES)
                DataType.Singleton ->
                    counters?.increment(DatabaseCounters.DELETE_SINGLETON_ENTRY)
                else -> Unit
            }
            delete(
                TABLE_COLLECTION_ENTRIES,
                "collection_id = ?",
                arrayOf(collectionId.toString())
            )

            // Updated collection metadata.
            update(
                TABLE_COLLECTIONS,
                ContentValues().apply {
                    put("version_map", data.versionMap.toProtoLiteral())
                    put("version_number", data.databaseVersion)
                },
                "id = ?",
                arrayOf(collectionId.toString())
            )
            collectionId
        }

        // Insert all elements into the collection.
        val content = ContentValues().apply {
            put("collection_id", collectionId)
        }
        // TODO(#4889): Don't do this one-by-one.
        data.values
            .map {
                getEntityReferenceId(it, db)
            }
            .forEach { referenceId ->
                when (dataType) {
                    DataType.Collection ->
                        counters?.increment(DatabaseCounters.INSERT_COLLECTION_ENTRY)
                    DataType.Singleton ->
                        counters?.increment(DatabaseCounters.INSERT_SINGLETON_ENTRY)
                    else -> Unit
                }
                insertOrThrow(
                    TABLE_COLLECTION_ENTRIES,
                    null,
                    content.apply { put("value_id", referenceId) }
                )
            }
        true
    }

    @VisibleForTesting
    suspend fun insertOrUpdateSingleton(
        storageKey: StorageKey,
        data: DatabaseData.Singleton,
        counters: Counters? = null
    ): Boolean {
        // Convert Singleton into a a zero-or-one-element Collection.
        val set = mutableSetOf<Reference>()
        data.reference?.let { set.add(it) }
        val collectionData = with(data) {
            DatabaseData.Collection(
                set,
                schema,
                databaseVersion,
                versionMap
            )
        }
        // Store the Collection as a Singleton.
        return insertOrUpdateCollection(storageKey, collectionData, DataType.Singleton, counters)
    }

    override suspend fun delete(
        storageKey: StorageKey,
        originatingClientId: Int?
    ) = writableDatabase.use {
        delete(storageKey, it)
    }.also { notifyClients(storageKey) { it.onDatabaseDelete(originatingClientId) } }

    suspend fun delete(
        storageKey: StorageKey,
        db: SQLiteDatabase
    ): Unit = stats.delete.timeSuspending { counters ->
        db.transaction {
            counters.increment(DatabaseCounters.GET_STORAGE_KEY_ID)
            val (storageKeyId, collectionId) = rawQuery(
                "SELECT id, data_type, value_id FROM storage_keys WHERE storage_key = ?",
                arrayOf(storageKey.toString())
            ).forSingleResult {
                val dataType = DataType.values()[it.getInt(1)]
                var collectionId: Long? = null
                if (dataType == DataType.Singleton || dataType == DataType.Collection) {
                    collectionId = it.getLong(2)
                }
                it.getLong(0) to collectionId
            } ?: return@transaction

            counters.increment(DatabaseCounters.DELETE_STORAGE_KEY)
            execSQL("DELETE FROM storage_keys WHERE id = ?", arrayOf(storageKeyId))
            counters.increment(DatabaseCounters.DELETE_ENTITY)
            execSQL("DELETE FROM entities WHERE storage_key_id = ?", arrayOf(storageKeyId))
            counters.increment(DatabaseCounters.DELETE_ENTITY_FIELDS)

            // entity_refs and types don't get deleted.

            if (collectionId != null) {
                counters.increment(DatabaseCounters.DELETE_COLLECTION)
                execSQL("DELETE FROM collections WHERE id = ?", arrayOf(collectionId))
                counters.increment(DatabaseCounters.DELETE_COLLECTION_ENTRIES)
                execSQL(
                    "DELETE FROM collection_entries WHERE collection_id = ?",
                    arrayOf(collectionId)
                )
            } else {
                deleteFields(arrayOf(storageKeyId.toString()), db)
            }
        }
    }

    override suspend fun runGarbageCollection() {
        val twoDaysAgo = JvmTime.currentTimeMillis - Duration.ofDays(2).toMillis()
        writableDatabase.transaction {
            val db = this
            rawQuery(
                """
                    SELECT storage_key_id, storage_key, orphan, MAX(entity_refs.id) IS NULL AS noRef
                    FROM entities
                    LEFT JOIN storage_keys ON entities.storage_key_id = storage_keys.id
                    LEFT JOIN entity_refs ON entity_storage_key = storage_keys.storage_key
                    GROUP BY storage_key_id, storage_key, orphan
                    HAVING entities.creation_timestamp < $twoDaysAgo
                    AND (orphan OR noRef)
                """.trimIndent(),
                arrayOf()
            ).forEach {
                val storageKeyId = it.getLong(0)
                val storageKey = StorageKeyParser.parse(it.getString(1))
                val orphan = it.getNullableBoolean(2) ?: false
                val noRef = it.getBoolean(3)
                if (orphan && noRef) {
                    // Already marked as orphan, still not referenced, safe to delete.
                    // TODO(#4889): Don't do this one-by-one, do a single delete query.
                    delete(storageKey = storageKey, db = db)
                    notifyClients(storageKey) { it.onDatabaseDelete(null) }
                }
                if (!orphan && noRef) {
                    // Is not referenced, but not marked as orphan: mark as orphan, will be deleted
                    // on the next round.
                    update(
                        TABLE_ENTITIES,
                        ContentValues().apply {
                            put("orphan", true)
                        },
                        "storage_key_id = ?",
                        arrayOf(storageKeyId.toString())
                    )
                }
                if (orphan && !noRef) {
                    // Was marked orphan, but now has a reference, mark as not orphan.
                    update(
                        TABLE_ENTITIES,
                        ContentValues().apply {
                            put("orphan", false)
                        },
                        "storage_key_id = ?",
                        arrayOf(storageKeyId.toString())
                    )
                }
            }
        }
    }

    override suspend fun snapshotStatistics() = stats.snapshot()

    /** Deletes everything from the database. */
    fun reset() {
        writableDatabase.transaction {
            execSQL("DELETE FROM collection_entries")
            execSQL("DELETE FROM collections")
            execSQL("DELETE FROM entities")
            execSQL("DELETE FROM entity_refs")
            execSQL("DELETE FROM field_values")
            execSQL("DELETE FROM fields")
            execSQL("DELETE FROM number_primitive_values")
            execSQL("DELETE FROM storage_keys")
            execSQL("DELETE FROM text_primitive_values")
            execSQL("DELETE FROM types")
        }
    }

    override suspend fun removeAllEntities() {
        return clearEntities("""
            SELECT storage_key_id, storage_key 
            FROM entities 
            LEFT JOIN storage_keys
                ON entities.storage_key_id = storage_keys.id        
            """)
    }

    override suspend fun removeEntitiesCreatedBetween(startTimeMillis: Long, endTimeMillis: Long) {
        return clearEntities("""
            SELECT storage_key_id, storage_key 
            FROM entities 
            LEFT JOIN storage_keys
                ON entities.storage_key_id = storage_keys.id
            WHERE creation_timestamp >= $startTimeMillis
            AND creation_timestamp <= $endTimeMillis
            """)
    }

    override suspend fun removeExpiredEntities() {
        val nowMillis = JvmTime.currentTimeMillis
        val query = """
            SELECT storage_key_id, storage_key 
            FROM entities 
            LEFT JOIN storage_keys
                ON entities.storage_key_id = storage_keys.id
            WHERE expiration_timestamp < $nowMillis
        """
        clearEntities(query)
    }

    /*
     * Clear entities obtained by the qiven query. The query should return pairs of
     * (storage_key_id, storage_key) from the storage_keys table. This method will delete all fields
     * for those entities and remove references pointing to them. It also notifies client listening
     * for any updated storage key.
     */
    private suspend fun clearEntities(query: String) {
        writableDatabase.transaction {
            val db = this
            // Find all expired entities.
            val storageKeyIdsPairs = rawQuery(query.trimIndent(), arrayOf())
                .map { it.getLong(0) to it.getString(1) }.toSet()
            val storageKeyIds = storageKeyIdsPairs.map { it.first.toString() }.toTypedArray()
            val storageKeys = storageKeyIdsPairs.map { it.second }.toTypedArray()
            // List of question marks of the same length, to be used in queries.
            val questionMarks = questionMarks(storageKeyIds)

            deleteFields(storageKeyIds, db)

            // Clean up unused values as they can contain sensitive data.
            // This query will return all field value ids being referenced by collection or 
            // singleton fields.
            val usedFieldIdsQuery =
                """
                    SELECT
                        CASE
                            WHEN fields.is_collection = 0 THEN field_values.value_id
                            ELSE collection_entries.value_id
                        END AS field_value_id                        
                    FROM field_values
                    LEFT JOIN fields
                        ON field_values.field_id = fields.id
                    LEFT JOIN collection_entries
                        ON fields.is_collection = 1
                        AND collection_entries.collection_id = field_values.value_id
                    WHERE fields.type_id = ?
                """.trimIndent()

            delete(
                TABLE_NUMBER_PRIMITIVES,
                "id NOT IN ($usedFieldIdsQuery)",
                arrayOf(PrimitiveType.Number.ordinal.toString())
            )
            delete(
                TABLE_TEXT_PRIMITIVES,
                "id NOT IN ($usedFieldIdsQuery)",
                arrayOf(PrimitiveType.Text.ordinal.toString())
            )

            // Remove all references to these entities.
            delete(
                TABLE_ENTITY_REFS,
                "entity_storage_key IN ($questionMarks)",
                storageKeys
            )

            // Find all collections with missing entries (collections that were updated).
            val updatedContainersStorageKeys = rawQuery(
                """
                    SELECT storage_keys.storage_key
                    FROM storage_keys
                    LEFT JOIN collection_entries
                        ON storage_keys.value_id = collection_entries.collection_id
                    WHERE storage_keys.data_type IN (?, ?)
                    AND collection_entries.value_id NOT IN (SELECT id FROM entity_refs)
                """.trimIndent(),
                arrayOf(
                    DataType.Singleton.ordinal.toString(),
                    DataType.Collection.ordinal.toString()
                )
            ).map { it.getString(0) }.toSet()

            // Remove from collection_entries all references to the expired entities.
            delete(
                TABLE_COLLECTION_ENTRIES,
                """
                    collection_id IN (SELECT id FROM collections WHERE type_id > ?)
                    AND value_id NOT IN (SELECT id FROM entity_refs)
                """.trimIndent(),
                arrayOf(LARGEST_PRIMITIVE_TYPE_ID.toString()) // only entity collections.
            )
            (storageKeys union updatedContainersStorageKeys).map { storageKey ->
                notifyClients(StorageKeyParser.parse(storageKey)) {
                    it.onDatabaseDelete(null)
                }
            }
        }
    }

    private fun deleteFields(storageKeyIds: Array<String>, db: SQLiteDatabase) = db.transaction {
        // List of question marks of the same length, to be used in queries.
        val questionMarks = questionMarks(storageKeyIds)
        // Find collection ids for collection fields of the expired entities.
        val collectionIdsToDelete = rawQuery(
            """
                SELECT collection_id
                FROM fields
                LEFT JOIN field_values
                    ON field_values.field_id = fields.id
                LEFT JOIN collection_entries
                    ON fields.is_collection = 1
                    AND collection_entries.collection_id = field_values.value_id
                WHERE fields.is_collection = 1
                    AND field_values.entity_storage_key_id IN ($questionMarks)
            """.trimIndent(),
            storageKeyIds
        ).map { it.getLong(0).toString() }.toSet().toTypedArray()
        val collectionQuestionMarks = questionMarks(collectionIdsToDelete)
        // Remove entries for those collections.
        delete(
            TABLE_COLLECTION_ENTRIES,
            "collection_id IN ($collectionQuestionMarks)",
            collectionIdsToDelete
        )
        // Remove those collections.
        delete(
            TABLE_COLLECTIONS,
            "id IN ($collectionQuestionMarks)",
            collectionIdsToDelete
        )

        // Remove field values for all expired entities.
        delete(
            TABLE_FIELD_VALUES,
            "entity_storage_key_id IN ($questionMarks)",
            storageKeyIds
        )
    }

    /* Constructs a string with [array.size] question marks separated by a comma. This can be used
     * to pass [array] as parameters to sql statements.
     */
    private fun questionMarks(array: Array<String>): String = array.map { "?" }.joinToString()

    @VisibleForTesting
    suspend fun getSchemaTypeId(
        schema: Schema,
        db: SQLiteDatabase,
        counters: Counters? = null
    ): TypeId = schemaMutex.withLock {
        schemaTypeMap[schema.hash]?.let {
            counters?.increment(DatabaseCounters.ENTITY_SCHEMA_CACHE_HIT)
            return@withLock it
        }
        counters?.increment(DatabaseCounters.ENTITY_SCHEMA_CACHE_MISS)

        return db.transaction {
            counters?.increment(DatabaseCounters.INSERT_ENTITY_TYPE_ID)
            val content = ContentValues().apply {
                put("name", schema.hash)
                put("is_primitive", false)
            }
            val schemaTypeId = insertOrThrow(TABLE_TYPES, null, content)

            // TODO: If the transaction fails (elsewhere), we need to roll this back...
            schemaTypeMap[schema.hash] = schemaTypeId

            val insertFieldStatement = compileStatement(
                """
                    INSERT INTO fields (type_id, parent_type_id, name, is_collection)
                    VALUES (?, ?, ?, ?)
                """.trimIndent()
            )

            fun insertFieldBlock(
                fieldName: String,
                fieldType: FieldType,
                isCollection: Boolean
            ) {
                counters?.increment(DatabaseCounters.INSERT_ENTITY_FIELD)
                insertFieldStatement.apply {
                    bindLong(1, getTypeId(fieldType, schemaTypeMap))
                    bindLong(2, schemaTypeId)
                    bindString(3, fieldName)
                    bindBoolean(4, isCollection)
                    executeInsert()
                }
            }
            schema.fields.singletons.forEach { (fieldName, fieldType) ->
                insertFieldBlock(fieldName, fieldType, isCollection = false)
            }
            schema.fields.collections.forEach { (fieldName, fieldType) ->
                insertFieldBlock(fieldName, fieldType, isCollection = true)
            }
            schemaTypeId
        }
    }

    /**
     * Creates a new storage key ID for the given entity [StorageKey]. If one already exists, it and
     * all data for the existing entity are deleted first before creating a new one.
     *
     * @returns the new storage key ID for the entity if one was successfully created, or null
     *     otherwise (e.g. if the given version number was too low)
     */
    @VisibleForTesting
    suspend fun createEntityStorageKeyId(
        storageKey: StorageKey,
        entityId: String,
        creationTimestamp: Long,
        expirationTimestamp: Long,
        typeId: TypeId,
        versionMap: VersionMap,
        databaseVersion: Int,
        db: SQLiteDatabase,
        counters: Counters? = null
    ): StorageKeyId? = db.transaction {
        // TODO(#4889): Use an LRU cache.
        counters?.increment(DatabaseCounters.GET_ENTITY_STORAGEKEY_ID)
        rawQuery(
            """
                SELECT
                    storage_keys.data_type,
                    entities.entity_id,
                    entities.version_number
                FROM storage_keys
                LEFT JOIN entities ON storage_keys.id = entities.storage_key_id
                WHERE storage_keys.storage_key = ?
            """.trimIndent(),
            arrayOf(storageKey.toString())
        ).forSingleResult {
            // Check existing entry for the storage key.
            val dataType = DataType.values()[it.getInt(0)]
            require(dataType == DataType.Entity) {
                "Expected storage key $storageKey to be an Entity, instead was $dataType."
            }
            val storedEntityId = it.getString(1)
            require(storedEntityId == entityId) {
                "Expected storage key $storageKey to have entity ID $entityId but was " +
                    "$storedEntityId."
            }
            val storedVersion = it.getInt(2)
            if (databaseVersion != storedVersion + 1) {
                return@transaction null
            }

            // Remove the existing entity.
            this@DatabaseImpl.delete(storageKey, db)
        }

        // Insert storage key.
        counters?.increment(DatabaseCounters.INSERT_ENTITY_STORAGEKEY)
        val storageKeyId = insertOrThrow(
            TABLE_STORAGE_KEYS,
            null,
            ContentValues().apply {
                put("storage_key", storageKey.toString())
                put("data_type", DataType.Entity.ordinal)
                put("value_id", typeId)
            }
        )

        // Insert entity ID.
        counters?.increment(DatabaseCounters.INSERT_ENTITY_RECORD)
        insertOrThrow(
            TABLE_ENTITIES,
            null,
            ContentValues().apply {
                put("storage_key_id", storageKeyId)
                put("entity_id", entityId)
                put("creation_timestamp", creationTimestamp)
                put("expiration_timestamp", expirationTimestamp)
                put("version_map", versionMap.toProtoLiteral())
                put("version_number", databaseVersion)
            }
        )

        storageKeyId
    }

    @VisibleForTesting
    fun getEntityReferenceId(
        reference: Reference,
        db: SQLiteDatabase,
        counters: Counters? = null
    ): ReferenceId = db.transaction {
        counters?.increment(DatabaseCounters.GET_ENTITY_REFERENCE)
        val withoutVersionMap =
            """
                SELECT id
                FROM entity_refs
                WHERE entity_id = ? AND backing_storage_key = ?
                    AND creation_timestamp = ? AND expiration_timestamp = ?
            """.trimIndent() to arrayOf(
                reference.id,
                reference.storageKey.toString(),
                reference.creationTimestamp.toString(),
                reference.expirationTimestamp.toString()
            )
        val withVersionMap =
            """
                SELECT id
                FROM entity_refs
                WHERE entity_id = ? AND backing_storage_key = ? AND version_map = ?
                    AND creation_timestamp = ? AND expiration_timestamp = ?
            """.trimIndent() to arrayOf(
                reference.id,
                reference.storageKey.toString(),
                reference.version?.toProtoLiteral(),
                reference.creationTimestamp.toString(),
                reference.expirationTimestamp.toString()
            )

        val refId = (reference.version?.let { withVersionMap } ?: withoutVersionMap)
            .let { rawQuery(it.first, it.second) }
            .forSingleResult { it.getLong(0) }

        refId ?: run {
            counters?.increment(DatabaseCounters.INSERT_ENTITY_REFERENCE)
            insertOrThrow(
                TABLE_ENTITY_REFS,
                null,
                ContentValues().apply {
                    put("entity_id", reference.id)
                    put("creation_timestamp", reference.creationTimestamp)
                    put("expiration_timestamp", reference.expirationTimestamp)
                    put("backing_storage_key", reference.storageKey.toString())
                    put("entity_storage_key", reference.referencedStorageKey().toString())
                    reference.version?.let {
                        put("version_map", it.toProtoLiteral())
                    } ?: run {
                        putNull("version_map")
                    }
                }
            )
        }
    }

    @VisibleForTesting
    fun getCollectionMetadata(
        storageKey: StorageKey,
        expectedDataType: DataType,
        db: SQLiteDatabase
    ): CollectionMetadata? =
        db.rawQuery(
            """
                SELECT
                    storage_keys.data_type,
                    collections.id,
                    collections.version_map,
                    collections.version_number
                FROM storage_keys
                LEFT JOIN collections ON collections.id = storage_keys.value_id
                WHERE storage_keys.storage_key = ?
            """.trimIndent(),
            arrayOf(storageKey.toString())
        ).forSingleResult {
            val dataType = DataType.values()[it.getInt(0)]
            val collectionId = it.getLong(1)
            require(dataType == expectedDataType) {
                "Expected storage key $storageKey to be a $expectedDataType but was a $dataType."
            }
            val versionMap = requireNotNull(it.getVersionMap(2)) {
                "Expected a version map for the collection at $storageKey"
            }
            val versionNumber = it.getInt(3)
            CollectionMetadata(collectionId, versionMap, versionNumber)
        }

    private fun getCollectionEntries(
        collectionId: CollectionId,
        typeId: TypeId,
        db: SQLiteDatabase,
        counters: Counters?
    ): Set<*> = if (isPrimitiveType(typeId)) {
        getCollectionPrimitiveEntries(collectionId, typeId, db, counters)
    } else {
        getCollectionReferenceEntries(collectionId, db)
    }

    private fun getCollectionPrimitiveEntries(
        collectionId: CollectionId,
        typeId: TypeId,
        db: SQLiteDatabase,
        counters: Counters?
    ): Set<*> {
        // Booleans are easy, just fetch the values from the collection_entries table directly.
        if (typeId.toInt() == PrimitiveType.Boolean.ordinal) {
            counters?.increment(DatabaseCounters.GET_PRIMITIVE_COLLECTION_BOOLEAN)
            return db.rawQuery(
                "SELECT value_id FROM collection_entries WHERE collection_id = ?",
                arrayOf(collectionId.toString())
            ).map { it.getBoolean(0).toReferencable() }.toSet()
        }

        // For strings and numbers, join against the appropriate primitive table.
        val (tableName, valueGetter) = when (typeId.toInt()) {
            PrimitiveType.Text.ordinal -> {
                counters?.increment(DatabaseCounters.GET_PRIMITIVE_COLLECTION_TEXT)
                TABLE_TEXT_PRIMITIVES to { cursor: Cursor -> cursor.getString(0).toReferencable() }
            }
            PrimitiveType.Number.ordinal -> {
                counters?.increment(DatabaseCounters.GET_PRIMITIVE_COLLECTION_NUMBER)
                TABLE_NUMBER_PRIMITIVES to {
                    cursor: Cursor -> cursor.getDouble(0).toReferencable()
                }
            }
            else -> throw IllegalArgumentException("Not a primitive type ID: $typeId")
        }
        return db.rawQuery(
            """
                SELECT $tableName.value
                FROM collection_entries
                JOIN $tableName ON collection_entries.value_id = $tableName.id
                WHERE collection_entries.collection_id = ?
            """.trimIndent(),
            arrayOf(collectionId.toString())
        ).map(valueGetter).toSet()
    }

    private fun getCollectionReferenceEntries(
        collectionId: CollectionId,
        db: SQLiteDatabase
    ): Set<Reference> = db.rawQuery(
        """
            SELECT
                entity_refs.entity_id,
                entity_refs.creation_timestamp,
                entity_refs.expiration_timestamp,
                entity_refs.backing_storage_key,
                entity_refs.version_map
            FROM collection_entries
            JOIN entity_refs ON collection_entries.value_id = entity_refs.id
            WHERE collection_entries.collection_id = ?
        """.trimIndent(),
        arrayOf(collectionId.toString())
    ).map {
        Reference(
            it.getString(0),
            StorageKeyParser.parse(it.getString(3)),
            it.getVersionMap(4),
            it.getString(1).toLong(),
            it.getString(2).toLong()
        )
    }.toSet()

    /** Returns true if the given [TypeId] represents a primitive type. */
    private fun isPrimitiveType(typeId: TypeId) = typeId <= LARGEST_PRIMITIVE_TYPE_ID

    /**
     * Returns a map of field name to field ID and type ID, for each field in the given schema
     * [TypeId].
     *
     * Call [getSchemaTypeId] first to get the [TypeId].
     */
    @VisibleForTesting
    fun getSchemaFields(
        schemaTypeId: TypeId,
        db: SQLiteDatabase
    ): Map<FieldName, SchemaField> {
        // TODO(#4889): Use an LRU cache.
        val fields = mutableMapOf<FieldName, SchemaField>()
        db.rawQuery(
            "SELECT name, id, type_id, is_collection FROM fields WHERE parent_type_id = ?",
            arrayOf(schemaTypeId.toString())
        ).forEach {
            fields[it.getString(0)] = SchemaField(
                fieldName = it.getString(0),
                fieldId = it.getLong(1),
                typeId = it.getLong(2),
                isCollection = it.getBoolean(3)
            )
        }
        return fields
    }

    /**
     * Returns the ID of the given value from the appropriate primitive table.
     *
     * Booleans don't have a primitive table, they will just be returned as either 0 or 1.
     */
    @VisibleForTesting
    fun getPrimitiveValueId(
        primitiveValue: Referencable,
        typeId: TypeId,
        db: SQLiteDatabase,
        counters: Counters? = null
    ): FieldValueId {
        require(primitiveValue is ReferencablePrimitive<*>) {
            "Expected value to be a ReferencablePrimitive but was $primitiveValue."
        }
        val value = primitiveValue.value
        // TODO(#4889): Cache the most frequent values somehow.
        if (typeId.toInt() == PrimitiveType.Boolean.ordinal) {
            counters?.increment(DatabaseCounters.GET_BOOLEAN_VALUE_ID)
            return when (value) {
                true -> 1
                false -> 0
                else -> throw IllegalArgumentException("Expected value to be a Boolean.")
            }
        }
        return db.transaction {
            val (tableName, valueStr) = when (typeId.toInt()) {
                PrimitiveType.Text.ordinal -> {
                    require(value is String) { "Expected value to be a String." }
                    counters?.increment(DatabaseCounters.GET_TEXT_VALUE_ID)
                    TABLE_TEXT_PRIMITIVES to value
                }
                PrimitiveType.Number.ordinal -> {
                    require(value is Double) { "Expected value to be a Double." }
                    counters?.increment(DatabaseCounters.GET_NUMBER_VALUE_ID)
                    TABLE_NUMBER_PRIMITIVES to value.toString()
                }
                else -> throw IllegalArgumentException("Not a primitive type ID: $typeId")
            }
            val fieldValueId = rawQuery(
                "SELECT id FROM $tableName WHERE value = ?", arrayOf(valueStr)
            ).forSingleResult { it.getLong(0) }
            fieldValueId ?: run {
                when (tableName) {
                    TABLE_TEXT_PRIMITIVES ->
                        counters?.increment(DatabaseCounters.INSERT_TEXT_VALUE)
                    TABLE_NUMBER_PRIMITIVES ->
                        counters?.increment(DatabaseCounters.INSERT_NUMBER_VALUE)
                }
                insertOrThrow(
                    tableName,
                    null,
                    ContentValues().apply {
                        put("value", valueStr)
                    }
                )
            }
        }
    }

    /** Returns the type ID for the given [fieldType] if known, otherwise throws. */
    private fun getTypeId(
        fieldType: FieldType,
        schemaTypeMap: Map<String, Long>
    ): TypeId = when (fieldType) {
        is FieldType.Primitive -> fieldType.primitiveType.ordinal.toLong()
        is FieldType.EntityRef -> requireNotNull(schemaTypeMap[fieldType.schemaHash]) {
            "Unknown type ID for schema with hash ${fieldType.schemaHash}"
        }
        // TODO(b/156003617)
        is FieldType.Tuple ->
            throw NotImplementedError("[FieldType.Tuple]s not currently supported.")
    }

    /** Test-only version of [getTypeId]. */
    @VisibleForTesting
    suspend fun getTypeIdForTest(fieldType: FieldType) = schemaMutex.withLock {
        getTypeId(fieldType, schemaTypeMap)
    }

    /** Loads all schema type IDs from the 'types' table into memory. */
    private fun loadTypes(): MutableMap<String, TypeId> {
        val typeMap = mutableMapOf<String, TypeId>()
        readableDatabase.rawQuery(
            "SELECT name, id FROM types WHERE is_primitive = 0",
            emptyArray()
        ).forEach {
            val hash = it.getString(0)
            val id = it.getLong(1)
            typeMap[hash] = id
        }
        return typeMap
    }

    private suspend fun notifyClients(
        storageKey: StorageKey,
        action: suspend (DatabaseClient) -> Unit
    ): Job {
        return clientFlow.filter { it.storageKey == storageKey }
            .onEach(action)
            .launchIn(CoroutineScope(coroutineContext))
    }

    @VisibleForTesting(otherwise = VisibleForTesting.NONE)
    fun dumpCursor(cursor: Cursor) {
        val header = cursor.columnNames.joinToString(" | ", "| ", " |")
        val border = "-".repeat(header.length)
        println(border)
        println(header)
        println(border)

        while (cursor.moveToNext()) {
            println((0 until cursor.columnCount).joinToString(" | ", "| ", " |") { col ->
                when (cursor.getType(col)) {
                    Cursor.FIELD_TYPE_BLOB -> cursor.getBlob(col).toString()
                    else -> if (cursor.isNull(col)) "NULL" else cursor.getString(col)
                }
            })
        }
        println(border)
    }

    @VisibleForTesting(otherwise = VisibleForTesting.NONE)
    fun dumpTables(vararg tableNames: String, db: SQLiteDatabase? = null) {
        tableNames.forEach { tableName ->
            println("\nDumping table \"$tableName\":")
            (db ?: readableDatabase).rawQuery("SELECT * FROM $tableName", arrayOf())
                .use { dumpCursor(it) }
        }
    }

    /** Returns a base-64 string representation of the [VersionMapProto] for this [VersionMap]. */
    // TODO(#4889): Find a way to store raw bytes as BLOBs, rather than having to base-64 encode.
    private fun VersionMap.toProtoLiteral() =
        Base64.encodeToString(toProto().toByteArray(), Base64.DEFAULT)

    /** Parses a [VersionMap] out of the [Cursor] for the given column. */
    private fun Cursor.getVersionMap(column: Int): VersionMap? {
        if (isNull(column)) return null

        val str = getString(column)
        val bytes = Base64.decode(str, Base64.DEFAULT)
        val proto: VersionMapProto
        try {
            proto = VersionMapProto.parseFrom(bytes)
        } catch (e: InvalidProtocolBufferException) {
            log.error(e) { "Parsing serialized VersionMap \"$str\"." }
            throw e
        }
        return fromProto(proto)
    }

    /** The type of the data stored at a storage key. */
    @VisibleForTesting
    enum class DataType {
        Entity,
        Singleton,
        Collection
    }

    @VisibleForTesting
    data class SchemaField(
        val fieldName: String,
        val fieldId: FieldId,
        val typeId: TypeId,
        val isCollection: Boolean
    )

    @VisibleForTesting
    data class CollectionMetadata(
        val collectionId: CollectionId,
        val versionMap: VersionMap,
        val versionNumber: Int
    )

    companion object {
        private const val DB_VERSION = 2

        private const val TABLE_STORAGE_KEYS = "storage_keys"
        private const val TABLE_COLLECTION_ENTRIES = "collection_entries"
        private const val TABLE_COLLECTIONS = "collections"
        private const val TABLE_ENTITIES = "entities"
        private const val TABLE_ENTITY_REFS = "entity_refs"
        private const val TABLE_FIELD_VALUES = "field_values"
        private const val TABLE_TYPES = "types"
        private const val TABLE_TEXT_PRIMITIVES = "text_primitive_values"
        private const val TABLE_NUMBER_PRIMITIVES = "number_primitive_values"

        private val CREATE =
            """
                CREATE TABLE types (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE, -- Either a primitive type name or a schema hash.
                    is_primitive INTEGER NOT NULL DEFAULT 0
                );

                CREATE INDEX type_name_index ON types (name, id);

                CREATE TABLE storage_keys (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    storage_key TEXT UNIQUE NOT NULL,
                    -- The kind of data stored at this storage key. See DataType enum for values.
                    data_type INTEGER NOT NULL,
                    -- For entities: points to type_id in types table.
                    -- For singletons and collections: points to collection_id in collections table.
                    value_id INTEGER NOT NULL
                );

                CREATE INDEX storage_key_index ON storage_keys (storage_key, id);

                -- Maps entity storage key IDs to entity IDs (Arcs string ID, not a row ID).
                CREATE TABLE entities (
                    -- Points to id in storage_keys table.
                    storage_key_id INTEGER NOT NULL PRIMARY KEY,
                    -- The Arcs entity ID.
                    entity_id TEXT NOT NULL,
                    creation_timestamp INTEGER NOT NULL,
                    expiration_timestamp INTEGER NOT NULL,
                    -- Serialized VersionMapProto for the entity.
                    version_map TEXT NOT NULL,
                    -- Monotonically increasing version number for the entity.
                    version_number INTEGER NOT NULL,
                    -- Whether the entity was found to have any reference to it during the last
                    -- garbage collection cycle (if orphan=1, then it did not have references).
                    orphan INTEGER
                );

                -- Stores references to entities.
                CREATE TABLE entity_refs (
                    -- Unique ID in this table.
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    -- The ID for the entity (Arcs string ID, not a row ID).
                    entity_id TEXT NOT NULL,
                    creation_timestamp INTEGER NOT NULL,
                    expiration_timestamp INTEGER NOT NULL,
                    -- The storage key for the backing store for this entity.
                    backing_storage_key TEXT NOT NULL,
                    -- Serialized VersionMapProto for the reference, if available.
                    version_map TEXT,
                    -- Storage key of the referenced entity.
                    entity_storage_key TEXT
                );

                CREATE INDEX entity_refs_index ON entity_refs (
                    entity_id,
                    backing_storage_key,
                    version_map
                );

                -- Name is a bit of a misnomer. Defines both collections and singletons.
                CREATE TABLE collections (
                    id INTEGER NOT NULL PRIMARY KEY,
                    -- Type of the elements stored in the collection/singleton.
                    type_id INTEGER NOT NULL,
                    -- Serialized VersionMapProto for the collection/singleton.
                    -- (Not required for entity field collections.)
                    version_map TEXT,
                    -- Monotonically increasing version number for the collection/singleton.
                    -- (Not required for entity field collections.)
                    version_number INTEGER
                );

                -- Entries in a collection/singleton. (Singletons will have only a single row.)
                CREATE TABLE collection_entries (
                    collection_id INTEGER NOT NULL,
                    -- For collections of primitives: value_id for primitive in collection.
                    -- For collections/singletons of entities: id of reference in entity_refs table.
                    value_id INTEGER NOT NULL
                );

                CREATE INDEX collection_entries_collection_id_index
                ON collection_entries (collection_id);

                -- Fields in an entity.
                CREATE TABLE fields (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    -- Points to id in types table.
                    type_id INTEGER NOT NULL,
                    -- The type id (types table) of the parent (eg if this is a field in an entity,
                    -- the type id of that entity).
                    parent_type_id INTEGER NOT NULL,
                    -- Name of the field.
                    name TEXT NOT NULL,
                    -- Boolean indicating if the field is a collection or singleton.
                    is_collection INTEGER NOT NULL
                );

                CREATE INDEX field_names_by_parent_type ON fields (parent_type_id, name);

                CREATE TABLE field_values (
                    entity_storage_key_id INTEGER NOT NULL,
                    -- Points to id field in fields table
                    field_id INTEGER NOT NULL,
                    -- For singleton primitive fields: id in primitive value table (the type_id in 
                    -- the corresponding fields table determine which primitive value table to use).
                    -- For booleans this is the boolean value as 0/1.
                    -- For singleton entity references: storage_key_id of entity.
                    -- For collections of anything: collection_id.
                    value_id INTEGER
                );

                CREATE INDEX field_values_by_entity_storage_key
                ON field_values (entity_storage_key_id, value_id);

                CREATE TABLE text_primitive_values (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    value TEXT NOT NULL UNIQUE
                );

                CREATE INDEX text_primitive_value_index ON text_primitive_values (value);

                CREATE TABLE number_primitive_values (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    value REAL NOT NULL UNIQUE
                );

                CREATE INDEX number_primitive_value_index ON number_primitive_values (value);
            """.trimIndent().split("\n\n")

        private val VERSION_2_MIGRATION = arrayOf("ALTER TABLE entities ADD COLUMN orphan INTEGER;")

        private val MIGRATION_STEPS = mapOf(2 to VERSION_2_MIGRATION)
    }
}
