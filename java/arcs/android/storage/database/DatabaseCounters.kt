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

/**
 * Collection of constants for use with [arcs.core.storage.database.DatabasePerformanceStatistics]
 * for [DatabaseImpl].
 */
object DatabaseCounters {
    /* General storage key Counters. */
    const val GET_STORAGE_KEY_ID = "get_storage_key_id"
    const val DELETE_STORAGE_KEY = "delete_storage_key"

    /* Entity-related Counters */
    const val INSERTUPDATE_ENTITY = "insertUpdate_entity"
    const val GET_ENTITY = "get_entity"
    const val GET_ENTITY_STORAGEKEY_ID = "get_entity_storageKey_id"
    const val GET_ENTITY_FIELDS = "get_entity_fields"
    const val GET_ENTITY_REFERENCE = "get_entity_reference"
    const val GET_ENTITY_TYPE_BY_STORAGEKEY = "get_entity_type_by_storageKey"
    const val GET_ENTITY_FIELD_VALUES = "get_entity_field_values"
    const val GET_ENTITY_FIELD_VALUE_PRIMITIVE = "get_entity_field_value_primitive"
    const val GET_ENTITY_FIELD_VALUE_PRIMITIVE_COLLECTION =
        "get_entity_field_value_primitive_collection"
    const val ENTITY_SCHEMA_CACHE_HIT = "entity_schema_cache_hit"
    const val ENTITY_SCHEMA_CACHE_MISS = "entity_schema_cache_miss"
    const val INSERT_ENTITY_TYPE_ID = "insert_entity_type_id"
    const val INSERT_ENTITY_FIELD = "insert_entity_field"
    const val INSERT_ENTITY_REFERENCE = "insert_entity_reference"
    const val INSERT_ENTITY_STORAGEKEY = "insert_entity_storageKey"
    const val INSERT_ENTITY_RECORD = "insert_entity_record"
    const val UPDATE_ENTITY_FIELD_VALUE = "update_entity_field_value"
    const val DELETE_ENTITY = "delete_entity"
    const val DELETE_ENTITY_FIELDS = "delete_entity_fields"

    /* Collection-related Counters */
    const val INSERTUPDATE_COLLECTION = "insertUpdate_collection"
    const val GET_COLLECTION = "get_collection"
    const val GET_COLLECTION_ID = "get_collection_id"
    const val GET_COLLECTION_ENTRIES = "get_collection_entries"
    const val INSERT_COLLECTION_RECORD = "insert_collection_record"
    const val INSERT_COLLECTION_STORAGEKEY = "insert_collection_storageKey"
    const val DELETE_COLLECTION = "delete_collection"
    const val DELETE_COLLECTION_ENTRIES = "delete_collection_entries"
    const val INSERT_COLLECTION_ENTRY = "insert_collection_entry"

    /* Singleton-related Counters */
    const val INSERTUPDATE_SINGLETON = "insertUpdate_singleton"
    const val GET_SINGLETON = "get_singleton"
    const val GET_SINGLETON_ID = "get_singleton_id"
    const val GET_SINGLETON_ENTRIES = "get_singleton_entries"
    const val INSERT_SINGLETON_RECORD = "insert_singleton_record"
    const val INSERT_SINGLETON_STORAGEKEY = "insert_singleton_storageKey"
    const val DELETE_SINGLETON_ENTRY = "delete_singleton_entries"
    const val INSERT_SINGLETON_ENTRY = "insert_singleton_entry"

    /* Primitive Counters */
    const val GET_BOOLEAN_VALUE_ID = "get_boolean_value_id"
    const val GET_TEXT_VALUE_ID = "get_text_value_id"
    const val GET_NUMBER_VALUE_ID = "get_number_value_id"
    const val INSERT_TEXT_VALUE = "insert_text_value"
    const val INSERT_NUMBER_VALUE = "insert_number_value"
    const val GET_PRIMITIVE_VALUE_BOOLEAN = "get_primitive_value_boolean"
    const val GET_PRIMITIVE_VALUE_TEXT = "get_primitive_value_text"
    const val GET_PRIMITIVE_VALUE_NUMBER = "get_primitive_value_number"
    const val GET_PRIMITIVE_COLLECTION_BOOLEAN = "get_primitive_collection_boolean"
    const val GET_PRIMITIVE_COLLECTION_TEXT = "get_primitive_collection_text"
    const val GET_PRIMITIVE_COLLECTION_NUMBER = "get_primitive_collection_number"

    /** [Array] of counter names for [DatabaseImpl.insertOrUpdate]. */
    val INSERT_UPDATE_COUNTERS = arrayOf(
        INSERTUPDATE_ENTITY,
        INSERTUPDATE_COLLECTION,
        INSERTUPDATE_SINGLETON,
        ENTITY_SCHEMA_CACHE_HIT,
        ENTITY_SCHEMA_CACHE_MISS,
        INSERT_ENTITY_TYPE_ID,
        INSERT_ENTITY_FIELD,
        GET_ENTITY_STORAGEKEY_ID,
        INSERT_ENTITY_STORAGEKEY,
        INSERT_ENTITY_RECORD,
        GET_ENTITY_FIELDS,
        UPDATE_ENTITY_FIELD_VALUE,
        GET_BOOLEAN_VALUE_ID,
        GET_TEXT_VALUE_ID,
        GET_NUMBER_VALUE_ID,
        INSERT_TEXT_VALUE,
        INSERT_NUMBER_VALUE,
        GET_COLLECTION_ID,
        GET_SINGLETON_ID,
        GET_ENTITY_REFERENCE,
        INSERT_ENTITY_REFERENCE,
        INSERT_COLLECTION_RECORD,
        INSERT_COLLECTION_STORAGEKEY,
        DELETE_COLLECTION_ENTRIES,
        INSERT_COLLECTION_ENTRY,
        INSERT_SINGLETON_RECORD,
        INSERT_SINGLETON_STORAGEKEY,
        DELETE_SINGLETON_ENTRY,
        INSERT_SINGLETON_ENTRY
    )

    /** [Array] of counter names for [DatabaseImpl.get]. */
    val GET_COUNTERS = arrayOf(
        GET_ENTITY,
        GET_COLLECTION,
        GET_SINGLETON,
        GET_ENTITY_TYPE_BY_STORAGEKEY,
        GET_ENTITY_FIELDS,
        GET_ENTITY_FIELD_VALUES,
        GET_ENTITY_FIELD_VALUE_PRIMITIVE,
        GET_ENTITY_FIELD_VALUE_PRIMITIVE_COLLECTION,
        GET_PRIMITIVE_VALUE_BOOLEAN,
        GET_PRIMITIVE_VALUE_TEXT,
        GET_PRIMITIVE_VALUE_NUMBER,
        GET_COLLECTION_ID,
        GET_COLLECTION_ENTRIES,
        GET_SINGLETON_ID,
        GET_SINGLETON_ENTRIES
    )

    /** [Array] of counter names for [DatabaseImpl.delete]. */
    val DELETE_COUNTERS = arrayOf(
        DELETE_COLLECTION,
        DELETE_COLLECTION_ENTRIES,
        DELETE_ENTITY,
        DELETE_ENTITY_FIELDS,
        DELETE_STORAGE_KEY,
        GET_STORAGE_KEY_ID
    )
}
