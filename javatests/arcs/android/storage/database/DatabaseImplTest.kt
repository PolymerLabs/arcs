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

import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.common.map
import arcs.core.crdt.VersionMap
import arcs.core.data.Entity
import arcs.core.data.FieldType
import arcs.core.data.PrimitiveType
import arcs.core.data.Schema
import arcs.core.data.SchemaDescription
import arcs.core.data.SchemaFields
import arcs.core.storage.Reference
import arcs.core.storage.StorageKeyParser
import arcs.core.storage.database.DatabaseData
import arcs.core.storage.testutil.DummyStorageKey
import arcs.core.testutil.assertSuspendingThrows
import arcs.core.testutil.assertThrows
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assertWithMessage
import java.lang.IllegalArgumentException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@ExperimentalCoroutinesApi
@RunWith(AndroidJUnit4::class)
class DatabaseImplTest {
    private lateinit var database: DatabaseImpl
    private lateinit var db: SQLiteDatabase

    @Before
    fun setUp() {
        database = DatabaseImpl(ApplicationProvider.getApplicationContext(), "test.sqlite3")
        db = database.writableDatabase
        DummyStorageKey.registerParser()
    }

    @After
    fun tearDown() {
        database.reset()
        database.close()
        StorageKeyParser.reset()
    }

    @Test
    fun getTypeId_primitiveTypeIds() = runBlockingTest {
        assertThat(database.getTypeId(FieldType.Boolean)).isEqualTo(PrimitiveType.Boolean.ordinal)
        assertThat(database.getTypeId(FieldType.Number)).isEqualTo(PrimitiveType.Number.ordinal)
        assertThat(database.getTypeId(FieldType.Text)).isEqualTo(PrimitiveType.Text.ordinal)
    }

    @Test
    fun getTypeId_entity_throwsWhenMissing() = runBlockingTest {
        val exception = assertSuspendingThrows(IllegalArgumentException::class) {
            database.getTypeId(FieldType.EntityRef("abc"))
        }
        assertThat(exception)
            .hasMessageThat()
            .isEqualTo("Unknown type ID for schema with hash abc")
    }

    @Test
    fun getSchemaTypeId_newSchema() = runBlockingTest {
        val schema = newSchema("abc")

        assertThat(database.getSchemaTypeId(schema, db)).isEqualTo(FIRST_ENTITY_TYPE_ID)

        // Repeating should give the same result.
        assertThat(database.getSchemaTypeId(schema, db)).isEqualTo(FIRST_ENTITY_TYPE_ID)

        assertThat(database.getTypeId(FieldType.EntityRef("abc")))
            .isEqualTo(FIRST_ENTITY_TYPE_ID)
    }

    @Test
    fun getSchemaTypeId_multipleNewSchemas() = runBlockingTest {
        val schema1 = newSchema("first")
        val schema2 = newSchema("second")
        val expectedTypeId1 = FIRST_ENTITY_TYPE_ID
        val expectedTypeId2 = FIRST_ENTITY_TYPE_ID + 1

        assertThat(database.getSchemaTypeId(schema1, db)).isEqualTo(expectedTypeId1)
        assertThat(database.getTypeId(FieldType.EntityRef("first")))
            .isEqualTo(expectedTypeId1)

        assertThat(database.getSchemaTypeId(schema2, db)).isEqualTo(expectedTypeId2)
        assertThat(database.getTypeId(FieldType.EntityRef("second")))
            .isEqualTo(expectedTypeId2)
    }

    @Test
    fun getSchemaTypeId_withPrimitiveFields() = runBlockingTest {
        val schema = newSchema("abc", SchemaFields(
            singletons = mapOf("text" to FieldType.Text, "bool" to FieldType.Boolean),
            collections = mapOf("num" to FieldType.Number)
        ))

        val typeId = database.getSchemaTypeId(schema, db)

        assertThat(typeId).isEqualTo(FIRST_ENTITY_TYPE_ID)
        assertThat(readFieldsTable()).containsExactly(
            FieldRow(1, TEXT_TYPE_ID, typeId, "text"),
            FieldRow(2, BOOLEAN_TYPE_ID, typeId, "bool"),
            FieldRow(3, NUMBER_TYPE_ID, typeId, "num")
        )
    }

    @Test
    fun getSchemaFields() = runBlockingTest {
        val schema1 = newSchema("abc", SchemaFields(
            singletons = mapOf("text" to FieldType.Text, "bool" to FieldType.Boolean),
            collections = mapOf("num" to FieldType.Number)
        ))
        val schemaTypeId1 = database.getSchemaTypeId(schema1, db)

        // Creates new IDs for each field.
        val fields1 = database.getSchemaFields(schemaTypeId1, db)
        assertThat(fields1).containsExactly(
            "text", DatabaseImpl.SchemaField("text", 1L, TEXT_TYPE_ID, isCollection = false),
            "bool", DatabaseImpl.SchemaField("bool", 2L, BOOLEAN_TYPE_ID, isCollection = false),
            "num", DatabaseImpl.SchemaField("num", 3L, NUMBER_TYPE_ID, isCollection = true)
        )

        // Re-running with the same schema doesn't create new field IDs
        assertThat(database.getSchemaFields(schemaTypeId1, db)).isEqualTo(fields1)

        // Running on a different schema creates new field IDs.
        val schema2 = schema1.copy(hash = "xyz")
        val schemaTypeId2 = database.getSchemaTypeId(schema2, db)
        val fields2 = database.getSchemaFields(schemaTypeId2, db)
        assertThat(fields2).containsExactly(
            "text", DatabaseImpl.SchemaField("text", 4L, TEXT_TYPE_ID, isCollection = false),
            "bool", DatabaseImpl.SchemaField("bool", 5L, BOOLEAN_TYPE_ID, isCollection = false),
            "num", DatabaseImpl.SchemaField("num", 6L, NUMBER_TYPE_ID, isCollection = true)
        )
    }

    @Test
    fun getSchemaFieldIds_emptySchema() = runBlockingTest {
        val schema = newSchema("abc")
        val schemaTypeId = database.getSchemaTypeId(schema, db)
        assertThat(database.getSchemaFields(schemaTypeId, db)).isEmpty()
    }

    @Test
    fun getSchemaFieldIds_unknownSchemaId() = runBlockingTest {
        val fieldIds = database.getSchemaFields(987654L, db)
        assertThat(fieldIds).isEmpty()
    }

    @Test
    fun createEntityStorageKeyId_createsNewIds() = runBlockingTest {
        assertThat(database.createEntityStorageKeyId(DummyStorageKey("key1"), "eid1", 123L, db)).isEqualTo(1L)
        assertThat(database.createEntityStorageKeyId(DummyStorageKey("key2"), "eid2", 123L, db)).isEqualTo(2L)
        assertThat(database.createEntityStorageKeyId(DummyStorageKey("key3"), "eid3", 123L, db)).isEqualTo(3L)
    }

    @Test
    fun createEntityStorageKeyId_replacesExistingIds() = runBlockingTest {
        // Insert keys for the first time.
        assertThat(database.createEntityStorageKeyId(DummyStorageKey("key1"), "eid1", 123L, db)).isEqualTo(1L)
        assertThat(database.createEntityStorageKeyId(DummyStorageKey("key2"), "eid2", 123L, db)).isEqualTo(2L)
        // Inserting again should overwrite them.
        assertThat(database.createEntityStorageKeyId(DummyStorageKey("key1"), "eid1", 123L, db)).isEqualTo(3L)
        assertThat(database.createEntityStorageKeyId(DummyStorageKey("key2"), "eid2", 123L, db)).isEqualTo(4L)
    }

    @Test
    fun createEntityStorageKeyId_wrongEntityId() = runBlockingTest {
        val key = DummyStorageKey("key")
        database.createEntityStorageKeyId(key, "correct-entity-id", 123L, db)

        val exception = assertSuspendingThrows(IllegalArgumentException::class) {
            database.createEntityStorageKeyId(key, "incorrect-entity-id", 123L, db)
        }
        assertThat(exception).hasMessageThat().isEqualTo(
            "Expected storage key dummy://key to have entity ID incorrect-entity-id but was " +
                "correct-entity-id."
        )
    }

    @Test
    fun getPrimitiveValue_boolean() = runBlockingTest {
        // Test value -> ID.
        assertThat(database.getPrimitiveValueId(true, BOOLEAN_TYPE_ID, db)).isEqualTo(1)
        assertThat(database.getPrimitiveValueId(false, BOOLEAN_TYPE_ID, db)).isEqualTo(0)

        val exception1 = assertThrows(IllegalArgumentException::class) {
            database.getPrimitiveValueId("not a bool", BOOLEAN_TYPE_ID, db)
        }
        assertThat(exception1).hasMessageThat().isEqualTo("Expected value to be a Boolean.")

        // Test ID -> value.
        assertThat(database.getPrimitiveValue(1, BOOLEAN_TYPE_ID, db)).isEqualTo(true)
        assertThat(database.getPrimitiveValue(0, BOOLEAN_TYPE_ID, db)).isEqualTo(false)

        val exception2 = assertThrows(IllegalArgumentException::class) {
            database.getPrimitiveValue(2, BOOLEAN_TYPE_ID, db)
        }
        assertThat(exception2).hasMessageThat().isEqualTo("Expected 2 to be a Boolean (0 or 1).")
    }

    @Test
    fun getPrimitiveValue_text() = runBlockingTest {
        // Test value -> ID.
        assertThat(database.getPrimitiveValueId("aaa", TEXT_TYPE_ID, db)).isEqualTo(1)
        assertThat(database.getPrimitiveValueId("bbb", TEXT_TYPE_ID, db)).isEqualTo(2)
        assertThat(database.getPrimitiveValueId("ccc", TEXT_TYPE_ID, db)).isEqualTo(3)
        assertThat(database.getPrimitiveValueId("aaa", TEXT_TYPE_ID, db)).isEqualTo(1)

        val exception1 = assertThrows(IllegalArgumentException::class) {
            database.getPrimitiveValueId(123.0, TEXT_TYPE_ID, db)
        }
        assertThat(exception1).hasMessageThat().isEqualTo("Expected value to be a String.")

        // Test ID -> value.
        assertThat(database.getPrimitiveValue(1, TEXT_TYPE_ID, db)).isEqualTo("aaa")
        assertThat(database.getPrimitiveValue(2, TEXT_TYPE_ID, db)).isEqualTo("bbb")
        assertThat(database.getPrimitiveValue(3, TEXT_TYPE_ID, db)).isEqualTo("ccc")

        val exception2 = assertThrows(IllegalArgumentException::class) {
            database.getPrimitiveValue(4, TEXT_TYPE_ID, db)
        }
        assertThat(exception2).hasMessageThat().isEqualTo("Unknown primitive with ID 4.")
    }

    @Test
    fun getPrimitiveValue_number() = runBlockingTest {
        // Test value -> ID.
        assertThat(database.getPrimitiveValueId(111.0, NUMBER_TYPE_ID, db)).isEqualTo(1)
        assertThat(database.getPrimitiveValueId(222.0, NUMBER_TYPE_ID, db)).isEqualTo(2)
        assertThat(database.getPrimitiveValueId(333.0, NUMBER_TYPE_ID, db)).isEqualTo(3)
        assertThat(database.getPrimitiveValueId(111.0, NUMBER_TYPE_ID, db)).isEqualTo(1)

        val exception1 = assertThrows(IllegalArgumentException::class) {
            database.getPrimitiveValueId("not a number", NUMBER_TYPE_ID, db)
        }
        assertThat(exception1).hasMessageThat().isEqualTo("Expected value to be a Double.")

        // Test ID -> value.
        assertThat(database.getPrimitiveValue(1, NUMBER_TYPE_ID, db)).isEqualTo(111.0)
        assertThat(database.getPrimitiveValue(2, NUMBER_TYPE_ID, db)).isEqualTo(222.0)
        assertThat(database.getPrimitiveValue(3, NUMBER_TYPE_ID, db)).isEqualTo(333.0)

        val exception2 = assertThrows(IllegalArgumentException::class) {
            database.getPrimitiveValue(4, NUMBER_TYPE_ID, db)
        }
        assertThat(exception2).hasMessageThat().isEqualTo("Unknown primitive with ID 4.")
    }

    @Test
    fun getPrimitiveValue_unknownTypeId() = runBlockingTest {
        // Test value -> ID.
        val exception1 = assertThrows(IllegalArgumentException::class) {
            database.getPrimitiveValueId("aaa", 987654L, db)
        }
        assertThat(exception1).hasMessageThat().isEqualTo("Not a primitive type ID: 987654")

        // Test ID -> value.
        val exception2 = assertThrows(IllegalArgumentException::class) {
            database.getPrimitiveValue(1, 987654L, db)
        }
        assertThat(exception2).hasMessageThat().isEqualTo("Not a primitive type ID: 987654")
    }

    @Test
    fun insertAndGet_entity_newEmptyEntity() = runBlockingTest {
        val key = DummyStorageKey("key")
        val schema = newSchema("hash")
        val entity = Entity("entity", schema, mutableMapOf())

        database.insertOrUpdate(key, entity)
        val entityOut = database.getEntity(key, schema).entity

        assertThat(entityOut).isEqualTo(entity)
    }

    @Test
    fun insertAndGet_entity_newEntityWithPrimitiveFields() = runBlockingTest {
        val key = DummyStorageKey("key")
        val schema = newSchema(
            "hash",
            SchemaFields(
                singletons = mapOf(
                    "text" to FieldType.Text,
                    "bool" to FieldType.Boolean,
                    "num" to FieldType.Number
                ),
                collections = mapOf(
                    "texts" to FieldType.Text,
                    "bools" to FieldType.Boolean,
                    "nums" to FieldType.Number
                )
            )
        )
        val entity = Entity(
            "entity",
            schema,
            mutableMapOf(
                "text" to "abc",
                "bool" to true,
                "num" to 123.0,
                "texts" to setOf("abc", "def"),
                "bools" to setOf(true, false),
                "nums" to setOf(123.0, 456.0)
            )
        )

        database.insertOrUpdate(key, entity)
        val entityOut = database.getEntity(key, schema).entity

        assertThat(entityOut).isEqualTo(entity)
    }

    @Test
    fun insertAndGet_entity_updateExistingEntity() = runBlockingTest {
        val key = DummyStorageKey("key")
        val schema = newSchema(
            "hash",
            SchemaFields(
                singletons = mapOf(
                    "text" to FieldType.Text,
                    "bool" to FieldType.Boolean,
                    "num" to FieldType.Number
                ),
                collections = mapOf(
                    "texts" to FieldType.Text,
                    "bools" to FieldType.Boolean,
                    "nums" to FieldType.Number
                )
            )
        )
        val entityId = "entity"
        val entity1 = Entity(
            entityId,
            schema,
            mutableMapOf(
                "text" to "aaa",
                "bool" to true,
                "num" to 111.0,
                "texts" to setOf("aaa", "bbb"),
                "bools" to setOf(true),
                "nums" to setOf(11.0, 111.0)
            )
        )
        val entity2 = Entity(
            entityId,
            schema,
            mutableMapOf(
                "text" to "zzz",
                "bool" to false,
                "num" to 999.0,
                "texts" to setOf("zzz", "yyy"),
                "bools" to setOf(false),
                "nums" to setOf(99.0, 999.0)
            )
        )

        database.insertOrUpdate(key, entity1)
        database.insertOrUpdate(key, entity2)
        val entityOut = database.getEntity(key, schema).entity

        assertThat(entityOut).isEqualTo(entity2)
    }

    @Test
    fun insertAndGet_entity_primitiveCollectionField_isNull() = runBlockingTest {
        val key = DummyStorageKey("key")
        val schema = newSchema(
            "hash",
            SchemaFields(
                singletons = mapOf(),
                collections = mapOf("texts" to FieldType.Text)
            )
        )
        val entity = Entity(
            "entity",
            schema,
            mutableMapOf("texts" to null)
        )

        database.insertOrUpdate(key, entity)
        val entityOut = database.getEntity(key, schema).entity
        assertThat(entityOut.data).isEmpty()
    }

    @Test
    fun insertAndGet_entity_primitiveCollectionField_isEmpty() = runBlockingTest {
        val key = DummyStorageKey("key")
        val schema = newSchema(
            "hash",
            SchemaFields(
                singletons = mapOf(),
                collections = mapOf("texts" to FieldType.Text)
            )
        )
        val entity = Entity(
            "entity",
            schema,
            mutableMapOf("texts" to setOf<String>())
        )

        database.insertOrUpdate(key, entity)
        val entityOut = database.getEntity(key, schema).entity
        assertThat(entityOut.data).isEmpty()
    }

    @Test
    fun insert_entity_primitiveCollectionField_wrongType() = runBlockingTest {
        val schema = newSchema(
            "hash",
            SchemaFields(
                singletons = mapOf(),
                collections = mapOf("texts" to FieldType.Text)
            )
        )
        val entity = Entity(
            "entity",
            schema,
            mutableMapOf(
                "texts" to listOf("aaa", "bbb") // Should be a Set, not a List.
            )
        )

        val exception = assertSuspendingThrows(IllegalArgumentException::class) {
            database.insertOrUpdate(DummyStorageKey("key"), entity)
        }
        assertThat(exception).hasMessageThat().startsWith("Collection fields must be of type Set.")
    }

    @Test
    fun get_entity_unknownStorageKey() = runBlockingTest {
        val exception = assertThrows(IllegalArgumentException::class) {
            database.getEntity(DummyStorageKey("nope"), newSchema("hash"))
        }
        assertThat(exception).hasMessageThat().isEqualTo(
            "Entity at storage key dummy://nope does not exist."
        )
    }

    @Test
    fun insertAndGet_collection_newEmptyCollection() = runBlockingTest {
        val key = DummyStorageKey("key")
        val schema = newSchema("hash")
        val inputCollection = DatabaseData.Collection(
            values = emptySet(),
            schema = schema,
            databaseVersion = 1,
            versionMap = VersionMap()
        )

        database.insertOrUpdate(key, inputCollection)
        val outputCollection = database.getCollection(key, schema)

        assertThat(outputCollection).isEqualTo(inputCollection)
    }

    @Test
    fun insertAndGet_collection_newCollectionOfEntities() = runBlockingTest {
        val collectionKey = DummyStorageKey("collection")
        val backingKey = DummyStorageKey("backing")
        val schema = newSchema("hash")
        val inputCollection = DatabaseData.Collection(
            values = setOf(
                Reference("ref1", backingKey, VersionMap()),
                Reference("ref2", backingKey, VersionMap())
            ),
            schema = schema,
            databaseVersion = 1,
            versionMap = VersionMap()
        )

        database.insertOrUpdate(collectionKey, inputCollection)
        val outputCollection = database.getCollection(collectionKey, schema)

        assertThat(outputCollection).isEqualTo(inputCollection)
    }

    @Test
    fun insertAndGet_collection_canChangeElements() = runBlockingTest {
        val collectionKey = DummyStorageKey("collection")
        val backingKey = DummyStorageKey("backing")
        val schema = newSchema("hash")
        val values = mutableSetOf(
            Reference("ref", backingKey, VersionMap()),
            Reference("ref-to-remove", backingKey, VersionMap())
        )
        val inputCollection1 = DatabaseData.Collection(
            values = values,
            schema = schema,
            databaseVersion = 1,
            versionMap = VersionMap()
        )
        database.insertOrUpdate(collectionKey, inputCollection1)

        // Test removal of old elements.
        values.removeIf { it.id == "ref-to-remove" }
        val inputCollection2 = inputCollection1.copy(values = values)
        database.insertOrUpdate(collectionKey, inputCollection2)
        assertThat(database.getCollection(collectionKey, schema)).isEqualTo(inputCollection2)

        // Test addition of new elements.
        values.add(Reference("new-ref", backingKey, VersionMap()))
        val inputCollection3 = inputCollection2.copy(values = values)
        database.insertOrUpdate(collectionKey, inputCollection3)
        assertThat(database.getCollection(collectionKey, schema)).isEqualTo(inputCollection3)

        // Test clearing all elements.
        values.clear()
        val inputCollection4 = inputCollection3.copy(values = values)
        database.insertOrUpdate(collectionKey, inputCollection4)
        assertThat(database.getCollection(collectionKey, schema)).isEqualTo(inputCollection4)
    }

    @Test
    fun get_collection_unknownStorageKey() = runBlockingTest {
        val exception = assertThrows(IllegalArgumentException::class) {
            database.getCollection(DummyStorageKey("key"), newSchema("hash"))
        }
        assertThat(exception).hasMessageThat().isEqualTo(
            "Collection at storage key dummy://key does not exist."
        )
    }

    @Test
    fun insertAndGet_singleton_newWithNullRef() = runBlockingTest {
        val key = DummyStorageKey("key")
        val schema = newSchema("hash")
        val inputSingleton = DatabaseData.Singleton(
            reference = null,
            schema = schema,
            databaseVersion = 1,
            versionMap = VersionMap()
        )

        database.insertOrUpdate(key, inputSingleton)
        val outputSingleton = database.getSingleton(key, schema)

        assertThat(outputSingleton).isEqualTo(inputSingleton)
    }

    @Test
    fun insertAndGet_singleton_newWithRef() = runBlockingTest {
        val singletonKey = DummyStorageKey("singleton")
        val backingKey = DummyStorageKey("backing")
        val schema = newSchema("hash")
        val inputSingleton = DatabaseData.Singleton(
            reference = Reference("ref", backingKey, VersionMap()),
            schema = schema,
            databaseVersion = 1,
            versionMap = VersionMap()
        )

        database.insertOrUpdate(singletonKey, inputSingleton)
        val outputSingleton = database.getSingleton(singletonKey, schema)

        assertThat(outputSingleton).isEqualTo(inputSingleton)
    }

    @Test
    fun insertAndGet_singleton_canChangeValues() = runBlockingTest {
        val singletonKey = DummyStorageKey("singleton")
        val backingKey = DummyStorageKey("backing")
        val schema = newSchema("hash")
        val inputSingleton1 = DatabaseData.Singleton(
            reference = Reference("ref", backingKey, VersionMap()),
            schema = schema,
            databaseVersion = 1,
            versionMap = VersionMap()
        )
        database.insertOrUpdate(singletonKey, inputSingleton1)

        // Test can change reference.
        val inputSingleton2 = inputSingleton1.copy(
            reference = Reference("new-ref", backingKey, VersionMap())
        )
        database.insertOrUpdate(singletonKey, inputSingleton2)
        assertThat(database.getSingleton(singletonKey, schema)).isEqualTo(inputSingleton2)

        // Test can clear value.
        val inputSingleton3 = inputSingleton2.copy(reference = null)
        database.insertOrUpdate(singletonKey, inputSingleton3)
        assertThat(database.getSingleton(singletonKey, schema)).isEqualTo(inputSingleton3)
    }

    @Test
    fun get_singleton_unknownStorageKey() = runBlockingTest {
        val exception = assertThrows(IllegalArgumentException::class) {
            database.getSingleton(DummyStorageKey("key"), newSchema("hash"))
        }
        assertThat(exception).hasMessageThat().isEqualTo(
            "Singleton at storage key dummy://key does not exist."
        )
    }

    @Test
    fun get_mismatchedDataTypes_entity() = runBlockingTest {
        val entityKey = DummyStorageKey("entity")
        val schema = newSchema("hash")
        val entity = DatabaseData.Entity(
            entity = Entity("entity", schema, mutableMapOf()),
            databaseVersion = 1,
            versionMap = VersionMap()
        )
        database.insertOrUpdate(entityKey, entity)

        val exception1 = assertThrows(IllegalArgumentException::class) {
            database.getCollection(entityKey, schema)
        }
        assertThat(exception1).hasMessageThat().isEqualTo(
            "Expected storage key dummy://entity to be a Collection but was a Entity."
        )

        val exception2 = assertThrows(IllegalArgumentException::class) {
            database.getSingleton(entityKey, schema)
        }
        assertThat(exception2).hasMessageThat().isEqualTo(
            "Expected storage key dummy://entity to be a Singleton but was a Entity."
        )
    }

    @Test
    fun get_mismatchedDataTypes_collection() = runBlockingTest {
        val collectionKey = DummyStorageKey("collection")
        val schema = newSchema("hash")
        val collection = DatabaseData.Collection(
            values = emptySet(),
            schema = schema,
            databaseVersion = 1,
            versionMap = VersionMap()
        )
        database.insertOrUpdate(collectionKey, collection)

        val exception1 = assertThrows(IllegalArgumentException::class) {
            database.getSingleton(collectionKey, schema)
        }
        assertThat(exception1).hasMessageThat().isEqualTo(
            "Expected storage key dummy://collection to be a Singleton but was a Collection."
        )

        val exception2 = assertThrows(IllegalArgumentException::class) {
            database.getEntity(collectionKey, schema)
        }
        assertThat(exception2).hasMessageThat().isEqualTo(
            "Expected storage key dummy://collection to be an Entity but was a Collection."
        )
    }

    @Test
    fun get_mismatchedDataTypes_singleton() = runBlockingTest {
        val singletonKey = DummyStorageKey("singleton")
        val schema = newSchema("hash")
        val singleton = DatabaseData.Singleton(
            reference = null,
            schema = schema,
            databaseVersion = 1,
            versionMap = VersionMap()
        )
        database.insertOrUpdate(singletonKey, singleton)

        val exception1 = assertThrows(IllegalArgumentException::class) {
            database.getCollection(singletonKey, schema)
        }
        assertThat(exception1).hasMessageThat().isEqualTo(
            "Expected storage key dummy://singleton to be a Collection but was a Singleton."
        )

        val exception2 = assertThrows(IllegalArgumentException::class) {
            database.getEntity(singletonKey, schema)
        }
        assertThat(exception2).hasMessageThat().isEqualTo(
            "Expected storage key dummy://singleton to be an Entity but was a Singleton."
        )
    }

    @Test
    fun delete_entity_getsRemoved() = runBlockingTest {
        val entityKey = DummyStorageKey("entity")
        val schema = newSchema("hash")
        val entity = DatabaseData.Entity(
            entity = Entity("entity", schema, mutableMapOf()),
            databaseVersion = 1,
            versionMap = VersionMap()
        )
        database.insertOrUpdate(entityKey, entity)

        database.delete(entityKey)

        assertTableIsEmpty("storage_keys")
        assertTableIsEmpty("entities")
        assertTableIsEmpty("field_values")
        val exception = assertThrows(IllegalArgumentException::class) {
            database.getEntity(entityKey, schema)
        }
        assertThat(exception).hasMessageThat().isEqualTo(
            "Entity at storage key dummy://entity does not exist."
        )
    }

    @Test
    fun delete_collection_otherEntitiesUnaffected() = runBlockingTest {
        val keyToKeep = DummyStorageKey("key-to-keep")
        val keyToDelete = DummyStorageKey("key-to-delete")
        val schema = newSchema("hash")
        val entity = DatabaseData.Entity(
            entity = Entity("entity", schema, mutableMapOf()),
            databaseVersion = 1,
            versionMap = VersionMap()
        )
        database.insertOrUpdate(keyToKeep, entity)
        database.insertOrUpdate(keyToDelete, entity)

        database.delete(keyToDelete)

        assertThat(database.getEntity(keyToKeep, schema)).isEqualTo(entity)
        assertThrows(IllegalArgumentException::class) {
            database.getEntity(keyToDelete, schema)
        }
    }

    @Test
    fun delete_collection_getsRemoved() = runBlockingTest {
        val collectionKey = DummyStorageKey("collection")
        val backingKey = DummyStorageKey("backing")
        val schema = newSchema("hash")
        val collection = DatabaseData.Collection(
            values = setOf(Reference("ref1", backingKey, VersionMap())),
            schema = schema,
            databaseVersion = 1,
            versionMap = VersionMap()
        )
        database.insertOrUpdate(collectionKey, collection)

        database.delete(collectionKey)

        assertTableIsEmpty("storage_keys")
        assertTableIsEmpty("collections")
        assertTableIsEmpty("collection_entries")
        val exception = assertThrows(IllegalArgumentException::class) {
            database.getCollection(collectionKey, schema)
        }
        assertThat(exception).hasMessageThat().isEqualTo(
            "Collection at storage key dummy://collection does not exist."
        )
    }

    @Test
    fun delete_collection_otherCollectionsUnaffected() = runBlockingTest {
        val keyToKeep = DummyStorageKey("key-to-keep")
        val keyToDelete = DummyStorageKey("key-to-delete")
        val backingKey = DummyStorageKey("backing")
        val schema = newSchema("hash")
        val collection = DatabaseData.Collection(
            values = setOf(Reference("ref1", backingKey, VersionMap())),
            schema = schema,
            databaseVersion = 1,
            versionMap = VersionMap()
        )
        database.insertOrUpdate(keyToKeep, collection)
        database.insertOrUpdate(keyToDelete, collection)

        database.delete(keyToDelete)

        assertThat(database.getCollection(keyToKeep, schema)).isEqualTo(collection)
        assertThrows(IllegalArgumentException::class) {
            database.getCollection(keyToDelete, schema)
        }
    }

    @Test
    fun delete_singleton_getsRemoved() = runBlockingTest {
        val singletonKey = DummyStorageKey("singleton")
        val backingKey = DummyStorageKey("backing")
        val schema = newSchema("hash")
        val singleton = DatabaseData.Singleton(
            reference = Reference("ref1", backingKey, VersionMap()),
            schema = schema,
            databaseVersion = 1,
            versionMap = VersionMap()
        )
        database.insertOrUpdate(singletonKey, singleton)

        database.delete(singletonKey)

        assertTableIsEmpty("storage_keys")
        assertTableIsEmpty("collections")
        assertTableIsEmpty("collection_entries")
        val exception = assertThrows(IllegalArgumentException::class) {
            database.getSingleton(singletonKey, schema)
        }
        assertThat(exception).hasMessageThat().isEqualTo(
            "Singleton at storage key dummy://singleton does not exist."
        )
    }

    @Test
    fun delete_singleton_otherSingletonsUnaffected() = runBlockingTest {
        val keyToKeep = DummyStorageKey("key-to-keep")
        val keyToDelete = DummyStorageKey("key-to-delete")
        val backingKey = DummyStorageKey("backing")
        val schema = newSchema("hash")
        val reference = Reference("ref1", backingKey, VersionMap())
        val singleton = DatabaseData.Singleton(reference, schema, 1, VersionMap())
        database.insertOrUpdate(keyToKeep, singleton)
        database.insertOrUpdate(keyToDelete, singleton)

        database.delete(keyToDelete)

        assertThat(database.getSingleton(keyToKeep, schema)).isEqualTo(singleton)
        assertThrows(IllegalArgumentException::class) {
            database.getSingleton(keyToDelete, schema)
        }
    }

    private fun newSchema(
        hash: String,
        fields: SchemaFields = SchemaFields(emptyMap(), emptyMap())
    ) = Schema(
        names = emptyList(),
        fields = fields,
        description = SchemaDescription(),
        hash = hash
    )

    /** Returns a list of all the rows in the 'fields' table. */
    private fun readFieldsTable() =
        database.readableDatabase.rawQuery("SELECT * FROM fields", emptyArray()).map(::FieldRow)

    private fun assertTableIsEmpty(tableName: String) {
        database.readableDatabase.rawQuery("SELECT * FROM $tableName", arrayOf()).use {
            assertWithMessage("Expected table $tableName to be empty, but found ${it.count} rows.")
                .that(it.count)
                .isEqualTo(0)
        }
    }

    companion object {
        /** The first free Type ID after all primitive types have been assigned. */
        private const val FIRST_ENTITY_TYPE_ID = 3

        private val TEXT_TYPE_ID = PrimitiveType.Text.ordinal.toLong()
        private val BOOLEAN_TYPE_ID = PrimitiveType.Boolean.ordinal.toLong()
        private val NUMBER_TYPE_ID = PrimitiveType.Number.ordinal.toLong()
    }
}

/** Helper class for reading results from the fields table. */
private data class FieldRow(
    val id: Long,
    val typeId: Long,
    val parentTypeId: Long,
    val name: String
) {
    constructor(cursor: Cursor) : this(
        cursor.getLong(0),
        cursor.getLong(1),
        cursor.getLong(2),
        cursor.getString(3)
    )
}
