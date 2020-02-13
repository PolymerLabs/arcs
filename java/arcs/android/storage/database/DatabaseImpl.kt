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
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlin.reflect.KClass

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
        insertUpdate = PerformanceStatistics(
            JvmTimer,
            "insertUpdate_entity",
            "insertUpdate_collection",
            "insertUpdate_singleton",
            "entity_schema_cache_hit",
            "entity_schema_cache_miss",
            "create_entity_type_id",
            "create_entity_field",
            "select_entity_storageKey_id",
            "insert_entity_storageKey",
            "insert_entity_record",
            "get_entity_fields",
            "update_entity_field_value",
            "get_boolean_value_id",
            "get_text_value_id",
            "get_number_value_id",
            "create_text_value_id",
            "create_number_value_id",
            "get_collection_id",
            "get_singleton_id",
            "get_entity_reference",
            "insert_entity_reference",
            "insert_collection_record",
            "insert_collection_storageKey",
            "delete_collection_entries",
            "insert_collection_entry",
            "insert_singleton_record",
            "insert_singleton_storageKey",
            "delete_singleton_entries",
            "insert_singleton_entry"
        ),
        get = PerformanceStatistics(
            JvmTimer,
            "get_entity",
            "get_collection",
            "get_singleton",
            "get_entity_type_by_storageKey",
            "get_entity_fields",
            "get_entity_field_values",
            "get_entity_field_value_primitive",
            "get_primitive_value_boolean",
            "get_primitive_value_text",
            "get_primitive_value_number",
            "get_collection_id",
            "get_collection_entries",
            "get_singleton_id",
            "get_singleton_entries"
        ),
        delete = PerformanceStatistics(JvmTimer)
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
            insert(TABLE_TYPES, null, content)
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
                counters.increment("get_entity")
                getEntity(storageKey, schema, counters)
            }
            DatabaseData.Collection::class -> {
                counters.increment("get_collection")
                getCollection(storageKey, schema, counters)
            }
            DatabaseData.Singleton::class -> {
                counters.increment("get_singleton")
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
        counters?.increment("get_entity_type_by_storageKey")
        val (storageKeyId, schemaTypeId, entityId) = rawQuery(
            """
                SELECT
                    storage_keys.id,
                    storage_keys.value_id,
                    storage_keys.data_type,
                    entities.entity_id
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
            Triple(it.getLong(0), it.getLong(1), it.getString(3))
        } ?: throw IllegalArgumentException(
            "Entity at storage key $storageKey does not exist."
        )
        // Fetch the entity's fields.
        counters?.increment("get_entity_fields")
        val fieldsByName = getSchemaFields(schemaTypeId, db)
        val fieldsById = fieldsByName.mapKeys { it.value.fieldId }
        // Populate the entity's field data from the database.
        counters?.increment("get_entity_field_values")
        val data = mutableMapOf<FieldName, Any?>()
        rawQuery(
            "SELECT field_id, value_id FROM field_values WHERE entity_storage_key_id = ?",
            arrayOf(storageKeyId.toString())
        ).forEach {
            val fieldId = it.getLong(0)
            val fieldValueId = it.getLong(1)
            val field = fieldsById.getValue(fieldId)
            // TODO: Handle non-primitive and collection field values.
            // TODO: Don't do a separate query for every field.
            counters?.increment("get_entity_field_value_primitive")
            data[field.fieldName] = getPrimitiveValue(fieldValueId, field.typeId, db, counters)
        }
        DatabaseData.Entity(
            Entity(
                id = entityId,
                schema = schema,
                data = data
            ),
            1, // TODO: Set correct database version
            VersionMap() // TODO: Fill in VersionMap
        )
    }

    @VisibleForTesting
    fun getCollection(
        storageKey: StorageKey,
        schema: Schema,
        counters: Counters? = null
    ): DatabaseData.Collection = readableDatabase.useTransaction {
        val db = this
        counters?.increment("collection_id")
        val collectionId = requireNotNull(
            getCollectionId(storageKey, DataType.Collection, db)
        ) {
            "Collection at storage key $storageKey does not exist."
        }
        counters?.increment("collection_entries")
        val values = getCollectionEntries(collectionId, db)
        DatabaseData.Collection(
            values,
            schema,
            1, // TODO: Set correct database version
            VersionMap() // TODO: Fill in VersionMap
        )
    }

    @VisibleForTesting
    fun getSingleton(
        storageKey: StorageKey,
        schema: Schema,
        counters: Counters? = null
    ): DatabaseData.Singleton = readableDatabase.useTransaction {
        val db = this
        counters?.increment("get_singleton_id")
        val collectionId = requireNotNull(getCollectionId(storageKey, DataType.Singleton, db)) {
            "Singleton at storage key $storageKey does not exist."
        }
        counters?.increment("get_singleton_entries")
        val values = getCollectionEntries(collectionId, db)
        require(values.size <= 1) {
            "Singleton at storage key $storageKey has more than one value."
        }
        val reference = values.singleOrNull()
        DatabaseData.Singleton(
            reference,
            schema,
            1, // TODO: Set correct database version
            VersionMap() // TODO: Fill in VersionMap
        )
    }

    override suspend fun insertOrUpdate(
        storageKey: StorageKey,
        data: DatabaseData,
        originatingClientId: Int?
    ): Int = stats.insertUpdate.timeSuspending { counters ->
        when (data) {
            is DatabaseData.Entity -> {
                counters.increment("insertUpdate_entity")
                insertOrUpdate(storageKey, data.entity, counters)
            }
            is DatabaseData.Collection -> {
                counters.increment("insertUpdate_collection")
                insertOrUpdate(storageKey, data, DataType.Collection, counters)
            }
            is DatabaseData.Singleton -> {
                counters.increment("insertUpdate_singleton")
                insertOrUpdate(storageKey, data, counters)
            }
        }
        // TODO: Return a proper database version number.
        return@timeSuspending 1
    }

    @VisibleForTesting
    suspend fun insertOrUpdate(storageKey: StorageKey, entity: Entity, counters: Counters? = null) =
        writableDatabase.useTransaction {
            val db = this
            // Fetch/create the entity's type ID.
            val schemaTypeId = getSchemaTypeId(entity.schema, db, counters)
            // Set the type ID for this storage key.
            val storageKeyId = getEntityStorageKeyId(
                storageKey,
                entity.id,
                schemaTypeId,
                db,
                counters
            )
            // Insert/update the entity's field types.
            counters?.increment("get_entity_fields")
            val fields = getSchemaFields(schemaTypeId, db)
            val content = ContentValues().apply {
                put("entity_storage_key_id", storageKeyId)
            }
            entity.data.forEach { (fieldName, fieldValue) ->
                content.apply {
                    val field = fields.getValue(fieldName)
                    put("field_id", field.fieldId)
                    // TODO: Handle non-primitive field values and collections.
                    put("value_id", getPrimitiveValueId(fieldValue, field.typeId, db, counters))
                }
                counters?.increment("update_entity_field_value")
                insertWithOnConflict(
                    TABLE_FIELD_VALUES,
                    null,
                    content,
                    SQLiteDatabase.CONFLICT_REPLACE
                )
            }
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
                counters?.increment("get_collection_id")
            DataType.Singleton ->
                counters?.increment("get_singleton_id")
            else -> Unit
        }
        var collectionId = getCollectionId(storageKey, dataType, db)

        if (collectionId == null) {
            // Create a new collection ID and storage key ID.
            when (dataType) {
                DataType.Collection ->
                    counters?.increment("insert_collection_record")
                DataType.Singleton ->
                    counters?.increment("insert_singleton_record")
                else -> Unit
            }
            collectionId = insert(
                TABLE_COLLECTIONS,
                null,
                ContentValues().apply { put("type_id", schemaTypeId) }
            )
            when (dataType) {
                DataType.Collection ->
                    counters?.increment("insert_collection_storageKey")
                DataType.Singleton ->
                    counters?.increment("insert_singleton_storageKey")
                else -> Unit
            }
            insert(
                TABLE_STORAGE_KEYS,
                null,
                ContentValues().apply {
                    put("storage_key", storageKey.toString())
                    put("data_type", dataType.ordinal)
                    put("value_id", collectionId)
                }
            )
        } else {
            // Collection already exists; delete all existing entries.
            // TODO: Don't blindly delete everything and re-insert: only insert/remove the diff.
            when (dataType) {
                DataType.Collection ->
                    counters?.increment("delete_collection_entries")
                DataType.Singleton ->
                    counters?.increment("delete_singleton_entry")
                else -> Unit
            }
            delete(
                TABLE_COLLECTION_ENTRIES,
                "collection_id = ?",
                arrayOf(collectionId.toString())
            )
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
                        counters?.increment("insert_collection_entry")
                    DataType.Singleton ->
                        counters?.increment("insert_singleton_entry")
                    else -> Unit
                }
                insert(
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
    ): Unit = stats.delete.timeSuspending<Unit> {
        TODO("not implemented")
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
            counters?.increment("entity_schema_cache_hit")
            return@withLock it
        }
        counters?.increment("entity_schema_cache_miss")

        return db.transaction {
            counters?.increment("create_entity_type_id")
            val content = ContentValues().apply {
                put("name", schema.hash)
                put("is_primitive", false)
            }
            val schemaTypeId = insert(TABLE_TYPES, null, content)

            schemaTypeMap[schema.hash] = schemaTypeId

            val insertFieldStatement = compileStatement(
                """
                    INSERT INTO fields (type_id, parent_type_id, name, is_collection)
                    VALUES (?, ?, ?, ?)
                """.trimIndent()
            )

            suspend fun insertFieldBlock(
                fieldName: String,
                fieldType: FieldType,
                isCollection: Boolean
            ) {
                counters?.increment("create_entity_field")
                insertFieldStatement.apply {
                    bindLong(1, getTypeId(fieldType))
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
     * Returns the ID for the given entity [StorageKey] if one already exists, otherwise creates a
     * new one for it.
     */
    @VisibleForTesting
    fun getEntityStorageKeyId(
        storageKey: StorageKey,
        entityId: String,
        typeId: TypeId,
        db: SQLiteDatabase,
        counters: Counters? = null
    ): StorageKeyId = db.transaction {
        // TODO: Use an LRU cache.
        counters?.increment("select_entity_storageKey_id")
        val storageKeyId = rawQuery(
            """
                SELECT storage_keys.id, storage_keys.data_type, entities.entity_id
                FROM storage_keys
                LEFT JOIN entities ON storage_keys.id = entities.storage_key_id
                WHERE storage_keys.storage_key = ?
            """.trimIndent(),
            arrayOf(storageKey.toString())
        ).forSingleResult {
            // Return existing storage key id.
            val storageKeyId = it.getLong(0)
            val dataType = DataType.values()[it.getInt(1)]
            require(dataType == DataType.Entity) {
                "Expected storage key $storageKey to be an Entity, instead was $dataType."
            }
            val storedEntityId = it.getString(2)
            require(storedEntityId == entityId) {
                "Expected storage key $storageKey to have entity ID $entityId but was " +
                    "$storedEntityId."
            }
            storageKeyId
        }
        storageKeyId ?: run {
            // Insert storage key.
            counters?.increment("insert_entity_storageKey")
            val newStorageKeyId = insert(
                TABLE_STORAGE_KEYS,
                null,
                ContentValues().apply {
                    put("storage_key", storageKey.toString())
                    put("data_type", DataType.Entity.ordinal)
                    put("value_id", typeId)
                }
            )

            // Insert entity ID.
            counters?.increment("insert_entity_record")
            val result = insert(
                TABLE_ENTITIES,
                null,
                ContentValues().apply {
                    put("storage_key_id", newStorageKeyId)
                    put("entity_id", entityId)
                }
            )

            newStorageKeyId
        }
    }

    @VisibleForTesting
    fun getEntityReferenceId(
        reference: Reference,
        db: SQLiteDatabase,
        counters: Counters? = null
    ): ReferenceId = db.transaction {
        counters?.increment("get_entity_reference")
        val refId = rawQuery(
            "SELECT id FROM entity_refs WHERE entity_id = ? AND backing_storage_key = ?",
            arrayOf(reference.id, reference.storageKey.toString())
        ).forSingleResult { it.getLong(0) }
        refId ?: run {
            counters?.increment("insert_entity_reference")
            insert(
                TABLE_ENTITY_REFS,
                null,
                ContentValues().apply {
                    put("entity_id", reference.id)
                    put("backing_storage_key", reference.storageKey.toString())
                }
            )
        }
    }

    @VisibleForTesting
    fun getCollectionId(
        storageKey: StorageKey,
        expectedDataType: DataType,
        db: SQLiteDatabase
    ): CollectionId? =
        db.rawQuery(
            "SELECT data_type, value_id FROM storage_keys WHERE storage_key = ?",
            arrayOf(storageKey.toString())
        ).forSingleResult {
            val dataType = DataType.values()[it.getInt(0)]
            val collectionId = it.getLong(1)
            require(dataType == expectedDataType) {
                "Expected storage key $storageKey to be a $expectedDataType but was a $dataType."
            }
            collectionId
        }

    private fun getCollectionEntries(
        collectionId: CollectionId,
        db: SQLiteDatabase
    ): Set<Reference> = db.rawQuery(
        """
            SELECT entity_refs.entity_id, entity_refs.backing_storage_key
            FROM collection_entries
            JOIN entity_refs ON collection_entries.value_id = entity_refs.id
            WHERE collection_entries.collection_id = ?
        """.trimIndent(),
        arrayOf(collectionId.toString())
    ).map {
        Reference(
            id = it.getString(0),
            storageKey = StorageKeyParser.parse(it.getString(1)),
            version = VersionMap() // TODO: VersionMap
        )
    }.toSet()

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
            counters?.increment("get_boolean_value_id")
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
                    counters?.increment("get_text_value_id")
                    TABLE_TEXT_PRIMITIVES to value
                }
                PrimitiveType.Number.ordinal -> {
                    require(value is Double) { "Expected value to be a Double." }
                    counters?.increment("get_number_value_id")
                    TABLE_NUMBER_PRIMITIVES to value.toString()
                }
                else -> throw IllegalArgumentException("Not a primitive type ID: $typeId")
            }
            val fieldValueId = rawQuery(
                "SELECT id FROM $tableName WHERE value = ?", arrayOf(valueStr)
            ).forSingleResult { it.getLong(0) }
            fieldValueId ?: run {
                when (tableName) {
                    TABLE_TEXT_PRIMITIVES -> counters?.increment("create_text_value_id")
                    TABLE_NUMBER_PRIMITIVES -> counters?.increment("create_number_value_id")
                }
                insert(tableName, null, ContentValues().apply {
                    put("value", valueStr)
                })
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
                counters?.increment("get_primitive_value_boolean")
                when (valueId) {
                    1L -> true
                    0L -> false
                    else -> throw IllegalArgumentException(
                        "Expected $valueId to be a Boolean (0 or 1)."
                    )
                }
            }
            PrimitiveType.Text.ordinal -> {
                counters?.increment("get_primitive_value_text")
                runSelectQuery(TABLE_TEXT_PRIMITIVES)
            }
            PrimitiveType.Number.ordinal -> {
                counters?.increment("get_primitive_value_number")
                runSelectQuery(TABLE_NUMBER_PRIMITIVES).toDouble()
            }
            else -> throw IllegalArgumentException("Not a primitive type ID: $typeId")
        }
    }

    /** Returns the type ID for the given [fieldType] if known, otherwise throws. */
    @VisibleForTesting
    suspend fun getTypeId(fieldType: FieldType): TypeId = when (fieldType) {
        is FieldType.Primitive -> fieldType.primitiveType.ordinal.toLong()
        is FieldType.EntityRef -> mutex.withLock {
            requireNotNull(schemaTypeMap[fieldType.schemaHash]) {
                "Unknown type ID for schema with hash ${fieldType.schemaHash}"
            }
        }
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
                    entity_id TEXT NOT NULL
                );
                
                -- Stores references to entities.
                CREATE TABLE entity_refs (
                    -- Unique ID in this table.
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    -- The ID for the entity (Arcs string ID, not a row ID).
                    entity_id TEXT NOT NULL,
                    -- The storage key for the backing store for this entity.
                    backing_storage_key TEXT NOT NULL
                );
                
                CREATE INDEX entity_refs_index ON entity_refs (entity_id, backing_storage_key);

                -- Name is a bit of a misnomer. Defines both collections and singletons. 
                CREATE TABLE collections (
                    id INTEGER NOT NULL PRIMARY KEY,
                    -- Type of the elements stored in the collection/singleton.
                    type_id INTEGER NOT NULL
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
