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
            db.insert("types", null, content)
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
        dataType: KClass<out DatabaseData>
    ): DatabaseData? {
        TODO("not implemented")
    }

    override suspend fun insertOrUpdate(
        storageKey: StorageKey,
        data: DatabaseData,
        originatingClientId: Int?
    ): Int {
        TODO("not implemented")
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

    suspend fun getSchemaTypeId(schema: Schema): TypeId = mutex.withLock {
        schemaTypeMap[schema.hash]?.let { return it }

        return writableDatabase.useTransaction {
            val content = ContentValues().apply {
                put("name", schema.hash)
                put("is_primitive", false)
            }
            val schemaTypeId = insert("types", null, content)

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
     * Returns a map of field name to ID for each field in the given schema [TypeId].
     *
     * Call [getSchemaTypeId] first to get the [TypeId].
     */
    @VisibleForTesting
    fun getSchemaFieldIds(schemaTypeId: TypeId): Map<FieldName, FieldId> {
        // TODO: Use an LRU cache.
        val fieldIds = mutableMapOf<FieldName, FieldId>()
        readableDatabase.rawQuery(
            "SELECT name, id FROM fields WHERE parent_type_id = ?",
            arrayOf(schemaTypeId.toString())
        ).forEach {
            fieldIds[it.getString(0)] = it.getLong(1)
        }
        return fieldIds
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
        // TODO: Factor out a generic forEach method on Cursor.
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

    companion object {
        private const val DB_VERSION = 1

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
