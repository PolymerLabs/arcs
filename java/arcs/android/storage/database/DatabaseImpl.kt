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
import arcs.android.storage.transaction
import arcs.android.storage.useTransaction
import arcs.core.data.Entity
import arcs.core.data.FieldType
import arcs.core.data.PrimitiveType
import arcs.core.data.Schema
import arcs.core.storage.database.Database
import arcs.core.storage.StorageKey
import java.lang.IllegalArgumentException

/** The Type ID that gets stored in the database. */
typealias TypeId = Long

class DatabaseImpl(
    context: Context
) : Database, SQLiteOpenHelper(
    context,
    DB_NAME,
    /* cursorFactory = */ null,
    DB_VERSION
) {
    /** Maps from schema hash to type ID (local copy of the 'types' table). */
    @VisibleForTesting
    val schemaTypeMap = lazy { loadTypes() }

    override fun onCreate(db: SQLiteDatabase) {
        db.transaction {
            CREATE.forEach(db::execSQL)

            // Populate the 'types' table with the primitive types. The ordinal of the enum will be
            // the Type ID used in the database.
            PrimitiveType.values().forEach {
                val content = ContentValues().apply {
                    put("id", it.ordinal)
                    put("name", it.name)
                    put("is_primitive", true)
                }
                db.insert("types", null, content)
            }
        }
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit

    override suspend fun delete(storageKey: StorageKey) {
        TODO("not implemented")
    }

    override suspend fun insertOrUpdate(storageKey: StorageKey, entity: Entity) {
        TODO("not implemented")
    }

    /** Resets the registrations by deleting everything from the database. */
    fun reset() {
        writableDatabase.useTransaction {
            execSQL("DELETE FROM collection_entries")
            execSQL("DELETE FROM collections")
            execSQL("DELETE FROM entities")
            execSQL("DELETE FROM field_values")
            execSQL("DELETE FROM fields")
            execSQL("DELETE FROM number_primitive_values")
            execSQL("DELETE FROM requested_notifiers")
            execSQL("DELETE FROM storage_keys")
            execSQL("DELETE FROM text_primitive_values")
            execSQL("DELETE FROM types")
        }
    }

    fun getOrCreateSchemaTypeId(schema: Schema): TypeId {
        schemaTypeMap.value[schema.hash]?.let { return it }

        return writableDatabase.useTransaction {
            val content = ContentValues().apply {
                put("name", schema.hash)
                put("is_primitive", false)
            }
            val schemaTypeId = insert("types", null, content)

            schemaTypeMap.value[schema.hash] = schemaTypeId

            val insertFieldStatement = compileStatement(
                "INSERT INTO fields (type_id, parent_type_id, name) VALUES (?, ?, ?)"
            )
            val insertFieldBlock = { fieldName: String, fieldType: FieldType ->
                insertFieldStatement.apply {
                    bindLong(1, getTypeId(fieldType))
                    bindLong(2, schemaTypeId)
                    bindString(3, fieldName)
                    executeInsert()
                }
                Unit
            }
            schema.fields.singletons.forEach(insertFieldBlock)
            schema.fields.collections.forEach(insertFieldBlock)
            schemaTypeId
        }
    }

    /** Returns the type ID for the given [fieldType] if known, otherwise throws. */
    @VisibleForTesting
    fun getTypeId(fieldType: FieldType): TypeId = when (fieldType) {
        is FieldType.Primitive -> fieldType.primitiveType.ordinal.toLong()
        is FieldType.EntityRef -> schemaTypeMap.value[fieldType.schemaHash]
            ?: throw IllegalArgumentException(
                "Unknown type ID for schema with hash ${fieldType.schemaHash}"
            )
    }

    /** Loads all schema type IDs from the 'types' table into memory. */
    private fun loadTypes(): MutableMap<String, TypeId> {
        val schemaTypeMap = mutableMapOf<String, TypeId>()
        readableDatabase.rawQuery(
            "SELECT name, id FROM types WHERE is_primitive = 0",
            emptyArray()
        ).use {
            while (it.moveToNext()) {
                val hash = it.getString(0)
                val id = it.getLong(1)
                schemaTypeMap[hash] = id
            }
        }
        return schemaTypeMap
    }

    companion object {
        internal const val DB_NAME = "resurrection.sqlite3"
        private const val DB_VERSION = 1

        private val CREATE =
            """
                CREATE TABLE types (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    is_primitive INTEGER NOT NULL DEFAULT 0
                )

                CREATE INDEX type_name_index ON types (name, id)

                CREATE TABLE storage_keys (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    storage_key TEXT UNIQUE NOT NULL
                )

                CREATE INDEX storage_key_index ON storage_keys (storage_key, id)

                CREATE TABLE entities (
                    storage_key_id INTEGER NOT NULL PRIMARY KEY,
                    type_id INTEGER NOT NULL
                )

                CREATE TABLE collections (
                    storage_key_id INTEGER NOT NULL PRIMARY KEY,
                    type_id INTEGER NOT NULL
                )

                CREATE TABLE collection_entries (
                    collection_storage_key_id INTEGER NOT NULL,
                    entity_storage_key_id INTEGER NOT NULL
                )

                CREATE INDEX
                    collection_entries_collection_storage_key_index
                ON collection_entries (collection_storage_key_id)

                CREATE TABLE fields (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    type_id INTEGER NOT NULL,
                    parent_type_id INTEGER NOT NULL,
                    name TEXT NOT NULL
                )

                CREATE INDEX field_names_by_parent_type ON fields (parent_type_id, name)

                CREATE TABLE field_values (
                    entity_storage_key_id INTEGER NOT NULL,
                    field_id INTEGER NOT NULL,
                    primitive_value_id INTEGER
                )

                CREATE INDEX field_values_by_entity_storage_key
                ON field_values (entity_storage_key_id, primitive_value_id)

                CREATE TABLE text_primitive_values (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    value TEXT NOT NULL UNIQUE
                )

                CREATE INDEX text_primitive_value_index ON text_primitive_values (value)

                CREATE TABLE number_primitive_values (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    value REAL NOT NULL UNIQUE
                )

                CREATE INDEX number_primitive_value_index ON number_primitive_values (value)

                CREATE TABLE requested_notifiers (
                    component_package TEXT NOT NULL,
                    component_class TEXT NOT NULL,
                    notification_key TEXT NOT NULL
                )

                CREATE INDEX notifiers_by_component 
                ON requested_notifiers (
                    component_package, 
                    component_class
                )
            """.trimIndent().split("\n\n")
    }
}