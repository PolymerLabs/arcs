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
import arcs.android.common.forEach
import arcs.android.common.transaction
import arcs.android.common.useTransaction
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
import java.lang.IllegalArgumentException
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

    override fun <Data : DatabaseData> addClient(client: DatabaseClient<Data>): Int {
        TODO("not implemented")
    }

    override fun removeClient(identifier: Int) {
        TODO("not implemented")
    }

    override suspend fun <Data : DatabaseData> get(
        storageKey: StorageKey,
        dataType: KClass<Data>
    ): Data? {
        TODO("not implemented")
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
            val schemaTypeId = getSchemaTypeId(entity.schema)
            val storageKeyId = getStorageKeyId(storageKey)
            val fields = getSchemaFields(schemaTypeId)
            val content = ContentValues().apply {
                put("entity_storage_key_id", storageKeyId)
            }
            entity.data.forEach { (fieldName, fieldValue) ->
                content.apply {
                    val field = fields.getValue(fieldName)
                    put("field_id", field.fieldId)
                    // TODO: Handle non-primitive field values and collections.
                    put("primitive_value_id", getPrimitiveValueId(fieldValue, field.typeId))
                }
                insertWithOnConflict(
                    "field_values",
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
            execSQL("DELETE FROM entities")
            execSQL("DELETE FROM field_values")
            execSQL("DELETE FROM fields")
            execSQL("DELETE FROM number_primitive_values")
            execSQL("DELETE FROM storage_keys")
            execSQL("DELETE FROM text_primitive_values")
            execSQL("DELETE FROM types")
        }
    }

    @VisibleForTesting
    suspend fun getSchemaTypeId(schema: Schema): TypeId = mutex.withLock {
        schemaTypeMap[schema.hash]?.let { return it }

        return writableDatabase.transaction {
            val content = ContentValues().apply {
                put("name", schema.hash)
                put("is_primitive", false)
            }
            val schemaTypeId = insert(TABLE_TYPES, null, content)

            schemaTypeMap[schema.hash] = schemaTypeId

            val insertFieldStatement = compileStatement(
                "INSERT INTO fields (type_id, parent_type_id, name) VALUES (?, ?, ?)"
            )

            suspend fun insertFieldBlock(fieldName: String, fieldType: FieldType) {
                insertFieldStatement.apply {
                    bindLong(1, getTypeId(fieldType))
                    bindLong(2, schemaTypeId)
                    bindString(3, fieldName)
                    executeInsert()
                }
            }
            schema.fields.singletons.forEach { (fieldName, fieldType) ->
                insertFieldBlock(fieldName, fieldType)
            }
            schema.fields.collections.forEach { (fieldName, fieldType) ->
                insertFieldBlock(fieldName, fieldType)
            }
            schemaTypeId
        }
    }

    /**
     * Returns the ID for the given [StorageKey] if one already exists, otherwise creates a new one
     * for it.
     */
    @VisibleForTesting
    fun getStorageKeyId(storageKey: StorageKey): StorageKeyId {
        // TODO: Use an LRU cache.
        val content = ContentValues().apply {
            put("storage_key", storageKey.toString())
        }
        return writableDatabase.insertWithOnConflict(
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
    fun getSchemaFields(schemaTypeId: TypeId): Map<FieldName, SchemaField> {
        // TODO: Use an LRU cache.
        val fields = mutableMapOf<FieldName, SchemaField>()
        readableDatabase.rawQuery(
            "SELECT name, id, type_id FROM fields WHERE parent_type_id = ?",
            arrayOf(schemaTypeId.toString())
        ).forEach {
            fields[it.getString(0)] = SchemaField(
                fieldName = it.getString(0),
                fieldId = it.getLong(1),
                typeId = it.getLong(2)
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
    fun getPrimitiveValueId(value: Any?, fieldId: FieldId): FieldValueId {
        // TODO: Cache the most frequent values somehow.
        if (fieldId.toInt() == PrimitiveType.Boolean.ordinal) {
            return when (value) {
                true -> 1
                false -> 0
                else -> throw IllegalArgumentException("Expected value to be a Boolean.")
            }
        }
        return writableDatabase.transaction {
            val (tableName, valueStr) = when (fieldId.toInt()) {
                PrimitiveType.Text.ordinal -> {
                    require(value is String) { "Expected value to be a String." }
                    TABLE_TEXT_PRIMITIVES to value
                }
                PrimitiveType.Number.ordinal -> {
                    require(value is Double) { "Expected value to be a Double." }
                    TABLE_NUMBER_PRIMITIVES to value.toString()
                }
                else -> throw IllegalArgumentException("Not a primitive type ID: $fieldId")
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

    @VisibleForTesting
    data class SchemaField(
        val fieldName: String,
        val fieldId: FieldId,
        val typeId: TypeId
    )

    companion object {
        private const val DB_VERSION = 1

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
                    storage_key TEXT UNIQUE NOT NULL
                );

                CREATE INDEX storage_key_index ON storage_keys (storage_key, id);

                CREATE TABLE entities (
                    storage_key_id INTEGER NOT NULL PRIMARY KEY,
                    type_id INTEGER NOT NULL
                );

                CREATE TABLE singletons (
                    storage_key_id INTEGER NOT NULL PRIMARY KEY,
                    type_id INTEGER NOT NULL,
                    value_id INTEGER -- Allow nulls. Either a primitive value id or an entity id.
                )

                CREATE TABLE collections (
                    storage_key_id INTEGER NOT NULL PRIMARY KEY,
                    type_id INTEGER NOT NULL
                );

                CREATE TABLE collection_entries (
                    collection_storage_key_id INTEGER NOT NULL,
                    entity_storage_key_id INTEGER NOT NULL
                );

                CREATE INDEX
                    collection_entries_collection_storage_key_index
                ON collection_entries (collection_storage_key_id);

                CREATE TABLE fields (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    type_id INTEGER NOT NULL,
                    parent_type_id INTEGER NOT NULL,
                    name TEXT NOT NULL
                );

                CREATE INDEX field_names_by_parent_type ON fields (parent_type_id, name);

                CREATE TABLE field_values (
                    entity_storage_key_id INTEGER NOT NULL,
                    field_id INTEGER NOT NULL,
                    primitive_value_id INTEGER
                );

                CREATE INDEX field_values_by_entity_storage_key
                ON field_values (entity_storage_key_id, primitive_value_id);

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
