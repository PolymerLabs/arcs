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
import arcs.android.common.getBoolean
import arcs.android.common.transaction
import arcs.android.common.useTransaction
import arcs.core.crdt.internal.VersionMap
import arcs.core.data.Entity
import arcs.core.data.FieldName
import arcs.core.data.FieldType
import arcs.core.data.PrimitiveType
import arcs.core.data.Schema
import arcs.core.storage.StorageKey
import arcs.core.storage.database.Database
import arcs.core.storage.database.DatabaseClient
import arcs.core.storage.database.DatabaseData
import arcs.core.util.guardWith
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

    /** Maps from schema hash to type ID (local copy of the 'types' table). */
    private val schemaTypeMap by guardWith(mutex, ::loadTypes)

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
            db.insert(TABLE_TYPES, null, content)
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
    ) = when (dataType) {
        DatabaseData.Entity::class -> getEntity(storageKey, schema)
        else -> TODO("Support Singletons and Collections")
    }

    @VisibleForTesting
    fun getEntity(storageKey: StorageKey, schema: Schema): DatabaseData.Entity =
        readableDatabase.useTransaction {
            val db = this
            // Fetch the entity's type by storage key.
            val (storageKeyId, schemaTypeId) = rawQuery(
                "SELECT id, value_id FROM storage_keys WHERE storage_key = ?",
                arrayOf(storageKey.toString())
            ).use {
                require(it.moveToFirst()) { "Entity at storage key $storageKey does not exist." }
                it.getLong(0) to it.getLong(1)
            }
            // Fetch the entity's fields.
            val fieldsByName = getSchemaFields(schemaTypeId, db)
            val fieldsById = fieldsByName.mapKeys { it.value.fieldId }
            // Populate the entity's field data from the database.
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
                data[field.fieldName] = getPrimitiveValue(fieldValueId, field.typeId, db)
            }
            DatabaseData.Entity(
                Entity(
                    id = "TODO", // TODO: Store Entity ID in database.
                    schema = schema,
                    data = data
                ),
                1, // TODO: Set correct database version
                VersionMap() // TODO: Fill in VersionMap
            )
        }

    override suspend fun insertOrUpdate(
        storageKey: StorageKey,
        data: DatabaseData,
        originatingClientId: Int?
    ): Int {
        when (data) {
            is DatabaseData.Entity -> insertOrUpdate(storageKey, data.entity)
            else -> TODO("Support Singletons and Collections")
        }
        // TODO: Return a proper database version number.
        return 1
    }

    @VisibleForTesting
    suspend fun insertOrUpdate(storageKey: StorageKey, entity: Entity) =
        writableDatabase.useTransaction {
            val db = this
            // Fetch/create the entity's type ID.
            val schemaTypeId = getSchemaTypeId(entity.schema, db)
            // Set the type ID for this storage key.
            val storageKeyId = getEntityStorageKeyId(storageKey, schemaTypeId, db)
            // Insert/update the entity's field types.
            val fields = getSchemaFields(schemaTypeId, db)
            val content = ContentValues().apply {
                put("entity_storage_key_id", storageKeyId)
            }
            entity.data.forEach { (fieldName, fieldValue) ->
                content.apply {
                    val field = fields.getValue(fieldName)
                    put("field_id", field.fieldId)
                    // TODO: Handle non-primitive field values and collections.
                    put("value_id", getPrimitiveValueId(fieldValue, field.typeId, db))
                }
                insertWithOnConflict(
                    TABLE_FIELD_VALUES,
                    null,
                    content,
                    SQLiteDatabase.CONFLICT_REPLACE
                )
            }
        }

    override suspend fun delete(storageKey: StorageKey, originatingClientId: Int?) {
        TODO("not implemented")
    }

    /** Deletes everything from the database. */
    fun reset() {
        writableDatabase.useTransaction {
            execSQL("DELETE FROM collection_entries")
            execSQL("DELETE FROM collections")
            execSQL("DELETE FROM field_values")
            execSQL("DELETE FROM fields")
            execSQL("DELETE FROM number_primitive_values")
            execSQL("DELETE FROM storage_keys")
            execSQL("DELETE FROM text_primitive_values")
            execSQL("DELETE FROM types")
        }
    }

    @VisibleForTesting
    suspend fun getSchemaTypeId(schema: Schema, db: SQLiteDatabase): TypeId = mutex.withLock {
        schemaTypeMap[schema.hash]?.let { return it }

        return db.transaction {
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
     * Returns the ID for the given [StorageKey] if one already exists, otherwise creates a new one
     * for it.
     */
    @VisibleForTesting
    fun getEntityStorageKeyId(
        storageKey: StorageKey,
        typeId: TypeId,
        db: SQLiteDatabase
    ): StorageKeyId {
        // TODO: Use an LRU cache.
        val content = ContentValues().apply {
            put("storage_key", storageKey.toString())
            put("data_type", DataType.Entity.ordinal)
            put("value_id", typeId)
        }
        return db.insertWithOnConflict(
            "storage_keys", null, content, SQLiteDatabase.CONFLICT_IGNORE
        )
    }

    /**
     * Returns a map of field name to field ID and type ID, for each field in the given schema
     * [TypeId].
     *
     * Call [getSchemaTypeId] first to get the [TypeId].
     */
    @VisibleForTesting
    fun getSchemaFields(schemaTypeId: TypeId, db: SQLiteDatabase): Map<FieldName, SchemaField> {
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
    fun getPrimitiveValueId(value: Any?, typeId: TypeId, db: SQLiteDatabase): FieldValueId {
        // TODO: Cache the most frequent values somehow.
        if (typeId.toInt() == PrimitiveType.Boolean.ordinal) {
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
                    TABLE_TEXT_PRIMITIVES to value
                }
                PrimitiveType.Number.ordinal -> {
                    require(value is Double) { "Expected value to be a Double." }
                    TABLE_NUMBER_PRIMITIVES to value.toString()
                }
                else -> throw IllegalArgumentException("Not a primitive type ID: $typeId")
            }
            val fieldValueId = rawQuery(
                "SELECT id FROM $tableName WHERE value = ?", arrayOf(valueStr)
            ).use {
                if (it.moveToFirst()) it.getLong(0) else null
            }
            if (fieldValueId != null) {
                fieldValueId
            } else {
                val content = ContentValues().apply {
                    put("value", valueStr)
                }
                insert(tableName, null, content)
            }
        }
    }

    @VisibleForTesting
    fun getPrimitiveValue(valueId: FieldValueId, typeId: TypeId, db: SQLiteDatabase): Any {
        // TODO: Cache the most frequent values somehow.
        fun runSelectQuery(tableName: String) = db.rawQuery(
            "SELECT value FROM $tableName WHERE id = ?",
            arrayOf(valueId.toString())
        ).use {
            require(it.moveToFirst()) { "Unknown primitive with ID $valueId." }
            it.getString(0)
        }
        return when (typeId.toInt()) {
            PrimitiveType.Boolean.ordinal -> when (valueId) {
                1L -> true
                0L -> false
                else -> throw IllegalArgumentException(
                    "Expected $valueId to be a Boolean (0 or 1)."
                )
            }
            PrimitiveType.Text.ordinal -> runSelectQuery(TABLE_TEXT_PRIMITIVES)
            PrimitiveType.Number.ordinal -> runSelectQuery(TABLE_NUMBER_PRIMITIVES).toDouble()
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
                    -- For collections of entities: storage_key_id of entity in collection.
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
