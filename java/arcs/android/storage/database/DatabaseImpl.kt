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
import androidx.annotation.VisibleForTesting
import arcs.android.common.bindBoolean
import arcs.android.common.forEach
import arcs.android.common.forSingleResult
import arcs.android.common.getBoolean
import arcs.android.common.map
import arcs.android.common.transaction
import arcs.android.common.useTransaction
import arcs.android.crdt.VersionMapProto
import arcs.android.crdt.fromProto
import arcs.android.crdt.toProto
import arcs.core.crdt.VersionMap
import arcs.core.data.Entity
import arcs.core.data.FieldName
import arcs.core.data.FieldType
import arcs.core.data.PrimitiveType
import arcs.core.data.Schema
import arcs.core.storage.Reference
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyParser
import arcs.core.storage.database.Database
import arcs.core.storage.database.DatabaseClient
import arcs.core.storage.database.DatabaseData
import arcs.core.storage.database.DatabasePerformanceStatistics
import arcs.core.util.guardedBy
import arcs.core.util.performance.Counters
import arcs.core.util.performance.PerformanceStatistics
import arcs.jvm.util.performance.JvmTimer
import com.google.protobuf.ByteString
import kotlin.reflect.KClass
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
@Suppress("Recycle") // Our helper extension methods close Cursors correctly.
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
    private val mutex = Mutex()
    // TODO: handle rehydrating from a snapshot.
    private val stats = DatabasePerformanceStatistics(
        insertUpdate = PerformanceStatistics(JvmTimer, *DatabaseCounters.INSERT_UPDATE_COUNTERS),
        get = PerformanceStatistics(JvmTimer, *DatabaseCounters.GET_COUNTERS),
        delete = PerformanceStatistics(JvmTimer, *DatabaseCounters.DELETE_COUNTERS)
    )

    /** Maps from schema hash to type ID (local copy of the 'types' table). */
    private val schemaTypeMap by guardedBy(mutex, ::loadTypes)

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

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit

    override fun addClient(client: DatabaseClient): Int {
        TODO("not implemented")
    }

    override fun removeClient(identifier: Int) {
        TODO("not implemented")
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
    fun getEntity(
        storageKey: StorageKey,
        schema: Schema,
        counters: Counters? = null
    ): DatabaseData.Entity = readableDatabase.useTransaction {
        val db = this
        // Fetch the entity's type by storage key.
        counters?.increment(DatabaseCounters.GET_ENTITY_TYPE_BY_STORAGEKEY)
        rawQuery(
            """
                SELECT
                    storage_keys.id,
                    storage_keys.value_id,
                    storage_keys.data_type,
                    entities.entity_id,
                    entities.version_map
                FROM storage_keys
                LEFT JOIN entities ON storage_keys.id = entities.storage_key_id
                WHERE storage_keys.storage_key = ?
            """.trimIndent(),
            arrayOf(storageKey.toString())
        ).forSingleResult {
            val dataType = DataType.values()[it.getInt(2)]
            require(dataType == DataType.Entity) {
                "Expected storage key $storageKey to be an Entity but was a $dataType."
            }
            val storageKeyId = it.getLong(0)
            val schemaTypeId = it.getLong(1)
            val entityId = it.getString(3)
            val versionMap = it.getVersionMap(4)
            // Fetch the entity's fields.
            counters?.increment(DatabaseCounters.GET_ENTITY_FIELDS)
            val fieldsByName = getSchemaFields(schemaTypeId, db)
            val fieldsById = fieldsByName.mapKeys { it.value.fieldId }
            // Populate the entity's field data from the database.
            counters?.increment(DatabaseCounters.GET_ENTITY_FIELD_VALUES)
            val data = mutableMapOf<FieldName, Any?>()
            rawQuery(
                "SELECT field_id, value_id FROM field_values WHERE entity_storage_key_id = ?",
                arrayOf(storageKeyId.toString())
            ).forEach {
                val fieldId = it.getLong(0)
                val fieldValueId = it.getLong(1)
                val field = fieldsById.getValue(fieldId)
                // TODO: Don't do a separate query for every field.
                data[field.fieldName] = getEntityFieldValue(fieldValueId, field, db, counters)
            }
            DatabaseData.Entity(
                Entity(
                    id = entityId,
                    schema = schema,
                    data = data
                ),
                1, // TODO: Set correct database version
                versionMap
            )
        } ?: throw IllegalArgumentException(
            "Entity at storage key $storageKey does not exist."
        )
    }

    private fun getEntityFieldValue(
        fieldValueId: FieldValueId,
        field: SchemaField,
        db: SQLiteDatabase,
        counters: Counters?
    ): Any = when {
        field.isCollection -> {
            counters?.increment(DatabaseCounters.GET_ENTITY_FIELD_VALUE_COLLECTION)
            getCollectionEntries(fieldValueId, field.typeId, db, counters)
        }
        isPrimitiveType(field.typeId) -> {
            counters?.increment(DatabaseCounters.GET_ENTITY_FIELD_VALUE_PRIMITIVE)
            getPrimitiveValue(fieldValueId, field.typeId, db, counters)
        }
        else -> {
            counters?.increment(DatabaseCounters.GET_ENTITY_FIELD_VALUE_REFERENCE)
            getReferenceValue(fieldValueId, db)
        }
    }

    private fun getReferenceValue(
        entityRefId: FieldValueId,
        db: SQLiteDatabase
    ): Any = db.rawQuery(
        """
            SELECT entity_id, backing_storage_key, version_map
            FROM entity_refs
            WHERE id = ?
        """.trimIndent(),
        arrayOf(entityRefId.toString())
    ).forSingleResult {
        Reference(
            id = it.getString(0),
            storageKey = StorageKeyParser.parse(it.getString(1)),
            version = it.getVersionMap(2)
        )
    } ?: throw IllegalArgumentException("Entity Reference with ID $entityRefId does not exist.")

    @VisibleForTesting
    fun getCollection(
        storageKey: StorageKey,
        schema: Schema,
        counters: Counters? = null
    ): DatabaseData.Collection = readableDatabase.useTransaction {
        val db = this
        counters?.increment(DatabaseCounters.GET_COLLECTION_ID)
        val (collectionId, versionMap) = requireNotNull(
            getCollectionIdAndVersionMap(storageKey, DataType.Collection, db)
        ) {
            "Collection at storage key $storageKey does not exist."
        }
        counters?.increment(DatabaseCounters.GET_COLLECTION_ENTRIES)
        val values = getCollectionReferenceEntries(collectionId, db)
        DatabaseData.Collection(
            values,
            schema,
            1, // TODO: Set correct database version
            versionMap
        )
    }

    @VisibleForTesting
    fun getSingleton(
        storageKey: StorageKey,
        schema: Schema,
        counters: Counters? = null
    ): DatabaseData.Singleton = readableDatabase.useTransaction {
        val db = this
        counters?.increment(DatabaseCounters.GET_SINGLETON_ID)
        val (collectionId, versionMap) = requireNotNull(
            getCollectionIdAndVersionMap(storageKey, DataType.Singleton, db)
        ) {
            "Singleton at storage key $storageKey does not exist."
        }
        counters?.increment(DatabaseCounters.GET_SINGLETON_ENTRIES)
        val values = getCollectionReferenceEntries(collectionId, db)
        require(values.size <= 1) {
            "Singleton at storage key $storageKey has more than one value."
        }
        val reference = values.singleOrNull()
        DatabaseData.Singleton(
            reference,
            schema,
            1, // TODO: Set correct database version
            versionMap
        )
    }

    override suspend fun insertOrUpdate(
        storageKey: StorageKey,
        data: DatabaseData,
        originatingClientId: Int?
    ): Int = stats.insertUpdate.timeSuspending { counters ->
        when (data) {
            is DatabaseData.Entity -> {
                counters.increment(DatabaseCounters.INSERTUPDATE_ENTITY)
                insertOrUpdate(storageKey, data, counters)
            }
            is DatabaseData.Collection -> {
                counters.increment(DatabaseCounters.INSERTUPDATE_COLLECTION)
                insertOrUpdate(storageKey, data, DataType.Collection, counters)
            }
            is DatabaseData.Singleton -> {
                counters.increment(DatabaseCounters.INSERTUPDATE_SINGLETON)
                insertOrUpdate(storageKey, data, counters)
            }
        }
        // TODO: Return a proper database version number.
        return@timeSuspending 1
    }

    @VisibleForTesting
    suspend fun insertOrUpdate(
        storageKey: StorageKey,
        data: DatabaseData.Entity,
        counters: Counters? = null
    ) = writableDatabase.useTransaction {
        val db = this
        val entity = data.entity
        // Fetch/create the entity's type ID.
        val schemaTypeId = getSchemaTypeId(entity.schema, db, counters)
        // Create a new ID for the storage key.
        val storageKeyId = createEntityStorageKeyId(
            storageKey,
            entity.id,
            schemaTypeId,
            data.versionMap,
            db,
            counters
        )
        // Insert the entity's field types.
        counters?.increment(DatabaseCounters.GET_ENTITY_FIELDS)
        val fields = getSchemaFields(schemaTypeId, db)
        val content = ContentValues().apply {
            put("entity_storage_key_id", storageKeyId)
        }
        entity.data.forEach { (fieldName, fieldValue) ->
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
                        getPrimitiveValueId(fieldValue, field.typeId, db, counters)
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
    }

    /**
     * Inserts a new collection into the database. Can contain primitives or references. Will create
     * and return a new collection ID for the collection. For entity field collections only (handle
     * collections should use [insertOrUpdate]).
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
                // Entity field collections don't need version maps.
            }
        )

        val content = ContentValues().apply {
            put("collection_id", collectionId)
        }
        // TODO: Don't do this one-by-one.
        val valueIds = if (isPrimitiveType(typeId)) {
            elements.map { getPrimitiveValueId(it, typeId, db) }
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
    suspend fun insertOrUpdate(
        storageKey: StorageKey,
        data: DatabaseData.Collection,
        dataType: DataType,
        counters: Counters?
    ) = writableDatabase.useTransaction {
        val db = this

        // Fetch/create the entity's type ID.
        val schemaTypeId = getSchemaTypeId(data.schema, db, counters)

        // Retrieve existing collection ID for this storage key, if one exists.
        when (dataType) {
            DataType.Collection ->
                counters?.increment(DatabaseCounters.GET_COLLECTION_ID)
            DataType.Singleton ->
                counters?.increment(DatabaseCounters.GET_SINGLETON_ID)
            else -> Unit
        }

        val pair = getCollectionIdAndVersionMap(storageKey, dataType, db)

        val collectionId = if (pair == null) {
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
            val (collectionId, storedVersionMap) = pair
            // TODO: Don't blindly delete everything and re-insert: only insert/remove the diff.
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

            // Updated stored version map if different.
            if (storedVersionMap != data.versionMap) {
                update(
                    TABLE_COLLECTIONS,
                    ContentValues().apply {
                        put("version_map", data.versionMap.toProtoLiteral())
                    },
                    "collection_id = ?",
                    arrayOf(collectionId.toString())
                )
            }
            collectionId
        }

        // Insert all elements into the collection.
        val content = ContentValues().apply {
            put("collection_id", collectionId)
        }
        // TODO: Don't do this one-by-one.
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
    }

    @VisibleForTesting
    suspend fun insertOrUpdate(
        storageKey: StorageKey,
        data: DatabaseData.Singleton,
        counters: Counters? = null
    ) {
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
        insertOrUpdate(storageKey, collectionData, DataType.Singleton, counters)
    }

    override suspend fun delete(
        storageKey: StorageKey,
        originatingClientId: Int?
    ) = writableDatabase.use {
        delete(storageKey, originatingClientId, it)
    }

    @Suppress("UNUSED_PARAMETER") // TODO: use originatingClientId
    suspend fun delete(
        storageKey: StorageKey,
        originatingClientId: Int?,
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
            execSQL(
                "DELETE FROM field_values WHERE entity_storage_key_id = ?",
                arrayOf(storageKeyId)
            )

            // entity_refs and types don't get deleted.

            // TODO: Delete entity collection fields.

            if (collectionId != null) {
                counters.increment(DatabaseCounters.DELETE_COLLECTION)
                execSQL("DELETE FROM collections WHERE id = ?", arrayOf(collectionId))
                counters.increment(DatabaseCounters.DELETE_COLLECTION_ENTRIES)
                execSQL(
                    "DELETE FROM collection_entries WHERE collection_id = ?",
                    arrayOf(collectionId)
                )
            }
        }
    }

    override suspend fun snapshotStatistics() = stats.snapshot()

    /** Deletes everything from the database. */
    fun reset() {
        writableDatabase.useTransaction {
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

    @VisibleForTesting
    suspend fun getSchemaTypeId(
        schema: Schema,
        db: SQLiteDatabase,
        counters: Counters? = null
    ): TypeId = mutex.withLock {
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
     */
    @VisibleForTesting
    suspend fun createEntityStorageKeyId(
        storageKey: StorageKey,
        entityId: String,
        typeId: TypeId,
        versionMap: VersionMap,
        db: SQLiteDatabase,
        counters: Counters? = null
    ): StorageKeyId = db.transaction {
        // TODO: Use an LRU cache.
        counters?.increment(DatabaseCounters.GET_ENTITY_STORAGEKEY_ID)
        rawQuery(
            """
                SELECT storage_keys.data_type, entities.entity_id
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

            // Remove the existing entity.
            this@DatabaseImpl.delete(storageKey, null, db)
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
                put("version_map", versionMap.toProtoLiteral())
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
        val refId = rawQuery(
            """
                SELECT id
                FROM entity_refs
                WHERE entity_id = ? AND backing_storage_key = ? AND version_map = ?
            """.trimIndent(),
            arrayOf(
                reference.id,
                reference.storageKey.toString(),
                reference.version.toProtoLiteral()
            )
        ).forSingleResult { it.getLong(0) }
        refId ?: run {
            counters?.increment(DatabaseCounters.INSERT_ENTITY_REFERENCE)
            insertOrThrow(
                TABLE_ENTITY_REFS,
                null,
                ContentValues().apply {
                    put("entity_id", reference.id)
                    put("backing_storage_key", reference.storageKey.toString())
                    put("version_map", reference.version.toProtoLiteral())
                }
            )
        }
    }

    @VisibleForTesting
    fun getCollectionIdAndVersionMap(
        storageKey: StorageKey,
        expectedDataType: DataType,
        db: SQLiteDatabase
    ): Pair<CollectionId, VersionMap>? =
        db.rawQuery(
            """
                SELECT storage_keys.data_type, collections.id, collections.version_map
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
            val versionMap = it.getVersionMap(2)
            collectionId to versionMap
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
            ).map { it.getBoolean(0) }.toSet()
        }

        // For strings and numbers, join against the appropriate primitive table.
        val (tableName, valueGetter) = when (typeId.toInt()) {
            PrimitiveType.Text.ordinal -> {
                counters?.increment(DatabaseCounters.GET_PRIMITIVE_COLLECTION_TEXT)
                TABLE_TEXT_PRIMITIVES to { cursor: Cursor -> cursor.getString(0) }
            }
            PrimitiveType.Number.ordinal -> {
                counters?.increment(DatabaseCounters.GET_PRIMITIVE_COLLECTION_NUMBER)
                TABLE_NUMBER_PRIMITIVES to { cursor: Cursor -> cursor.getDouble(0) }
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
            SELECT entity_refs.entity_id, entity_refs.backing_storage_key, entity_refs.version_map
            FROM collection_entries
            JOIN entity_refs ON collection_entries.value_id = entity_refs.id
            WHERE collection_entries.collection_id = ?
        """.trimIndent(),
        arrayOf(collectionId.toString())
    ).map {
        Reference(
            id = it.getString(0),
            storageKey = StorageKeyParser.parse(it.getString(1)),
            version = it.getVersionMap(2)
        )
    }.toSet()

    /** Returns true if the given [TypeId] represents a primitive type. */
    private fun isPrimitiveType(typeId: TypeId) = typeId < PrimitiveType.values().size

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
        // TODO: Use an LRU cache.
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
        value: Any?,
        typeId: TypeId,
        db: SQLiteDatabase,
        counters: Counters? = null
    ): FieldValueId {
        // TODO: Cache the most frequent values somehow.
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

    @VisibleForTesting
    fun getPrimitiveValue(
        valueId: FieldValueId,
        typeId: TypeId,
        db: SQLiteDatabase,
        counters: Counters? = null
    ): Any {
        // TODO: Cache the most frequent values somehow.
        fun runSelectQuery(tableName: String) = db.rawQuery(
            "SELECT value FROM $tableName WHERE id = ?",
            arrayOf(valueId.toString())
        ).forSingleResult { it.getString(0) }
            ?: throw IllegalArgumentException("Unknown primitive with ID $valueId.")

        return when (typeId.toInt()) {
            PrimitiveType.Boolean.ordinal -> {
                counters?.increment(DatabaseCounters.GET_PRIMITIVE_VALUE_BOOLEAN)
                when (valueId) {
                    1L -> true
                    0L -> false
                    else -> throw IllegalArgumentException(
                        "Expected $valueId to be a Boolean (0 or 1)."
                    )
                }
            }
            PrimitiveType.Text.ordinal -> {
                counters?.increment(DatabaseCounters.GET_PRIMITIVE_VALUE_TEXT)
                runSelectQuery(TABLE_TEXT_PRIMITIVES)
            }
            PrimitiveType.Number.ordinal -> {
                counters?.increment(DatabaseCounters.GET_PRIMITIVE_VALUE_NUMBER)
                runSelectQuery(TABLE_NUMBER_PRIMITIVES).toDouble()
            }
            else -> throw IllegalArgumentException("Not a primitive type ID: $typeId")
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
    }

    /** Test-only version of [getTypeId]. */
    @VisibleForTesting
    suspend fun getTypeIdForTest(fieldType: FieldType) = mutex.withLock {
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

    @VisibleForTesting(otherwise = VisibleForTesting.NONE)
    fun dumpTables(vararg tableNames: String, db: SQLiteDatabase? = null) {
        tableNames.forEach { tableName ->
            println("\nDumping table \"$tableName\":")
            (db ?: readableDatabase).rawQuery("SELECT * FROM $tableName", arrayOf()).use { cursor ->
                val header = cursor.columnNames.joinToString(" | ", "| ", " |")
                val border = "-".repeat(header.length)
                println(border)
                println(header)
                println(border)

                while (cursor.moveToNext()) {
                    println((0 until cursor.columnCount).joinToString(" | ", "| ", " |") { col ->
                        when (cursor.getType(col)) {
                            Cursor.FIELD_TYPE_BLOB -> cursor.getBlob(col).toString()
                            else -> cursor.getString(col)
                        }
                    })
                }
                println(border)
            }
        }
    }

    /** Returns a string representation of the [VersionMapProto] for this [VersionMap]. */
    private fun VersionMap.toProtoLiteral() = toProto().toByteString().toStringUtf8()

    /** Parses a [VersionMap] out of the [Cursor] for the given column. */
    private fun Cursor.getVersionMap(column: Int): VersionMap {
        val str = getString(column)
        val bytes = ByteString.copyFromUtf8(str)
        val proto = VersionMapProto.parseFrom(bytes)
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

    companion object {
        private const val DB_VERSION = 1

        // TODO: Add constants for column names?
        private val TABLE_STORAGE_KEYS = "storage_keys"
        private val TABLE_COLLECTION_ENTRIES = "collection_entries"
        private val TABLE_COLLECTIONS = "collections"
        private val TABLE_ENTITIES = "entities"
        private val TABLE_ENTITY_REFS = "entity_refs"
        private val TABLE_FIELD_VALUES = "field_values"
        private val TABLE_TYPES = "types"
        private val TABLE_TEXT_PRIMITIVES = "text_primitive_values"
        private val TABLE_NUMBER_PRIMITIVES = "number_primitive_values"

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
                    storage_key_id INTEGER NOT NULL PRIMARY KEY,
                    entity_id TEXT NOT NULL,
                    -- Serialized VersionMapProto for the entity.
                    version_map TEXT NOT NULL
                );

                -- Stores references to entities.
                CREATE TABLE entity_refs (
                    -- Unique ID in this table.
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    -- The ID for the entity (Arcs string ID, not a row ID).
                    entity_id TEXT NOT NULL,
                    -- The storage key for the backing store for this entity.
                    backing_storage_key TEXT NOT NULL,
                    -- Serialized VersionMapProto for the reference.
                    version_map TEXT NOT NULL
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
                    -- Serialized VersionMapProto for the collection.
                    -- (Not required for entity field collections.)
                    version_map TEXT
                );

                -- Entries in a collection/singleton. (Singletons will have only a single row.)
                CREATE TABLE collection_entries (
                    collection_id INTEGER NOT NULL,
                    -- For collections of primitives: value_id for primitive in collection.
                    -- For collections of entities: id of reference in entity_refs table.
                    -- For singletons: storage_key_id of entity.
                    value_id INTEGER NOT NULL
                );

                CREATE INDEX collection_entries_collection_id_index
                ON collection_entries (collection_id);

                CREATE TABLE fields (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    type_id INTEGER NOT NULL,
                    parent_type_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    -- Boolean indicating if the field is a collection or singleton.
                    is_collection INTEGER NOT NULL
                );

                CREATE INDEX field_names_by_parent_type ON fields (parent_type_id, name);

                CREATE TABLE field_values (
                    entity_storage_key_id INTEGER NOT NULL,
                    field_id INTEGER NOT NULL,
                    -- For singleton primitive fields: id in primitive value table.
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
    }
}
