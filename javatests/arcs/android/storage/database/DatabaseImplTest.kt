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
        assertThat(database.getTypeIdForTest(FieldType.Boolean)).isEqualTo(PrimitiveType.Boolean.ordinal)
        assertThat(database.getTypeIdForTest(FieldType.Number)).isEqualTo(PrimitiveType.Number.ordinal)
        assertThat(database.getTypeIdForTest(FieldType.Text)).isEqualTo(PrimitiveType.Text.ordinal)
    }

    @Test
    fun getTypeId_entity_throwsWhenMissing() = runBlockingTest {
        val exception = assertSuspendingThrows(IllegalArgumentException::class) {
            database.getTypeIdForTest(FieldType.EntityRef("abc"))
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

        assertThat(database.getTypeIdForTest(FieldType.EntityRef("abc")))
            .isEqualTo(FIRST_ENTITY_TYPE_ID)
    }

    @Test
    fun getSchemaTypeId_multipleNewSchemas() = runBlockingTest {
        val schema1 = newSchema("first")
        val schema2 = newSchema("second")
        val expectedTypeId1 = FIRST_ENTITY_TYPE_ID
        val expectedTypeId2 = FIRST_ENTITY_TYPE_ID + 1

        assertThat(database.getSchemaTypeId(schema1, db)).isEqualTo(expectedTypeId1)
        assertThat(database.getTypeIdForTest(FieldType.EntityRef("first")))
            .isEqualTo(expectedTypeId1)

        assertThat(database.getSchemaTypeId(schema2, db)).isEqualTo(expectedTypeId2)
        assertThat(database.getTypeIdForTest(FieldType.EntityRef("second")))
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
        assertThat(
            database.createEntityStorageKeyId(
                DummyStorageKey("key1"),
                "eid1",
                123L,
                VERSION_MAP,
                FIRST_VERSION_NUMBER,
                db
            )
        ).isEqualTo(1L)

        assertThat(
            database.createEntityStorageKeyId(
                DummyStorageKey("key2"),
                "eid2",
                123L,
                VERSION_MAP,
                FIRST_VERSION_NUMBER,
                db
            )
        ).isEqualTo(2L)

        assertThat(
            database.createEntityStorageKeyId(
                DummyStorageKey("key3"),
                "eid3",
                123L,
                VERSION_MAP,
                FIRST_VERSION_NUMBER,
                db
            )
        ).isEqualTo(3L)
    }

    @Test
    fun createEntityStorageKeyId_replacesExistingIds() = runBlockingTest {
        // Insert keys for the first time.

        assertThat(
            database.createEntityStorageKeyId(
                DummyStorageKey("key1"),
                "eid1",
                123L,
                VERSION_MAP,
                1,
                db
            )
        ).isEqualTo(1L)

        assertThat(
            database.createEntityStorageKeyId(
                DummyStorageKey("key2"),
                "eid2",
                123L,
                VERSION_MAP,
                1,
                db
            )
        ).isEqualTo(2L)

        // Inserting again should overwrite them.

        assertThat(
            database.createEntityStorageKeyId(
                DummyStorageKey("key1"),
                "eid1",
                123L,
                VERSION_MAP,
                2,
                db
            )
        ).isEqualTo(3L)

        assertThat(
            database.createEntityStorageKeyId(
                DummyStorageKey("key2"),
                "eid2",
                123L,
                VERSION_MAP,
                2,
                db
            )
        ).isEqualTo(4L)
    }

    @Test
    fun createEntityStorageKeyId_wrongEntityId() = runBlockingTest {
        val key = DummyStorageKey("key")
        database.createEntityStorageKeyId(
            key,
            "correct-entity-id",
            123L,
            VERSION_MAP,
            FIRST_VERSION_NUMBER,
            db
        )

        val exception = assertSuspendingThrows(IllegalArgumentException::class) {
            database.createEntityStorageKeyId(
                key,
                "incorrect-entity-id",
                123L,
                VERSION_MAP,
                FIRST_VERSION_NUMBER,
                db
            )
        }
        assertThat(exception).hasMessageThat().isEqualTo(
            "Expected storage key dummy://key to have entity ID incorrect-entity-id but was " +
                "correct-entity-id."
        )
    }

    @Test
    fun createEntityStorageKeyId_versionNumberMustBeLarger() = runBlockingTest {
        val key = DummyStorageKey("key")
        val entityId = "entity-id"
        val typeId = 123L
        database.createEntityStorageKeyId(key, entityId, typeId, VERSION_MAP, 10, db)

        // Same version number is rejected.
        val exception1 = assertSuspendingThrows(IllegalArgumentException::class) {
            database.createEntityStorageKeyId(key, entityId, typeId, VERSION_MAP, 10, db)
        }
        assertThat(exception1).hasMessageThat().isEqualTo(
            "Given version (10) must be greater than version in database (10) when updating " +
                "storage key dummy://key."
        )

        // Smaller version number is rejected.
        val exception2 = assertSuspendingThrows(IllegalArgumentException::class) {
            database.createEntityStorageKeyId(key, entityId, typeId, VERSION_MAP, 9, db)
        }
        assertThat(exception2).hasMessageThat().isEqualTo(
            "Given version (9) must be greater than version in database (10) when updating " +
                "storage key dummy://key."
        )

        // Increasing version number is ok.
        database.createEntityStorageKeyId(key, entityId, typeId, VERSION_MAP, 11, db)
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
        val entity = DatabaseData.Entity(
            Entity("entity", schema, mutableMapOf()),
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )

        database.insertOrUpdate(key, entity)
        val entityOut = database.getEntity(key, schema)

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
        val entity = DatabaseData.Entity(
            Entity(
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
            ),
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )

        database.insertOrUpdate(key, entity)
        database.dumpTables("storage_keys", "entities", "fields", "field_values")
        val entityOut = database.getEntity(key, schema)

        assertThat(entityOut).isEqualTo(entity)
    }

    @Test
    fun insertAndGet_entity_newEntityWithReferenceFields() = runBlockingTest {
        val key = DummyStorageKey("key")
        val childSchema = newSchema(
            "child",
            SchemaFields(
                singletons = mapOf("name" to FieldType.Text),
                collections = mapOf()
            )
        )
        val schema = newSchema(
            "parent",
            SchemaFields(
                singletons = mapOf("favouriteChild" to FieldType.EntityRef("child")),
                collections = mapOf("otherChildren" to FieldType.EntityRef("child"))
            )
        )
        val alice = DatabaseData.Entity(
            Entity("alice-id", childSchema, mutableMapOf("name" to "Alice")),
            1,
            VersionMap("alice" to 1)
        )
        val bob = DatabaseData.Entity(
            Entity("bob-id", childSchema, mutableMapOf("name" to "Bob")),
            1,
            VersionMap("bob" to 2)
        )
        val charlie = DatabaseData.Entity(
            Entity("charlie-id", childSchema, mutableMapOf("name" to "Charlie")),
            1,
            VersionMap("charlie" to 3)
        )
        val parentEntity = DatabaseData.Entity(
            Entity(
                "parent-id",
                schema,
                mutableMapOf(
                    "favouriteChild" to Reference(
                        "alice-id",
                        DummyStorageKey("alice-key"),
                        VersionMap("alice" to 1)
                    ),
                    "otherChildren" to setOf(
                        Reference("bob-id", DummyStorageKey("bob-key"), VersionMap("bob" to 2)),
                        Reference(
                            "charlie-id",
                            DummyStorageKey("charlie-key"),
                            VersionMap("charlie" to 3)
                        )
                    )
                )
            ),
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )
        database.insertOrUpdate(DummyStorageKey("alice-key"), alice)
        database.insertOrUpdate(DummyStorageKey("bob-key"), bob)
        database.insertOrUpdate(DummyStorageKey("charlie-key"), charlie)

        database.insertOrUpdate(key, parentEntity)
        val entityOut = database.getEntity(key, schema)

        assertThat(entityOut).isEqualTo(parentEntity)
    }

    @Test
    fun insertAndGet_entity_updateExistingEntity() = runBlockingTest {
        val key = DummyStorageKey("key")
        val childSchema = newSchema("child")
        database.getSchemaTypeId(childSchema, db)
        val schema = newSchema(
            "hash",
            SchemaFields(
                singletons = mapOf(
                    "text" to FieldType.Text,
                    "bool" to FieldType.Boolean,
                    "num" to FieldType.Number,
                    "ref" to FieldType.EntityRef("child")
                ),
                collections = mapOf(
                    "texts" to FieldType.Text,
                    "bools" to FieldType.Boolean,
                    "nums" to FieldType.Number,
                    "refs" to FieldType.EntityRef("child")
                )
            )
        )
        val entityId = "entity"
        val entity1 = DatabaseData.Entity(
            Entity(
                entityId,
                schema,
                mutableMapOf(
                    "text" to "aaa",
                    "bool" to true,
                    "num" to 111.0,
                    "ref" to Reference("child-id-1", DummyStorageKey("child-ref-1"), VersionMap("child-1" to 1)),
                    "texts" to setOf("aaa", "bbb"),
                    "bools" to setOf(true),
                    "nums" to setOf(11.0, 111.0),
                    "refs" to setOf(
                        Reference("child-id-2", DummyStorageKey("child-ref-2"), VersionMap("child-2" to 2)),
                        Reference("child-id-3", DummyStorageKey("child-ref-3"), VersionMap("child-3" to 3))
                    )
                )
            ),
            1,
            VersionMap("actor" to 1)
        )
        val entity2 = DatabaseData.Entity(
            Entity(
                entityId,
                schema,
                mutableMapOf(
                    "text" to "zzz",
                    "bool" to false,
                    "num" to 999.0,
                    "ref" to Reference("child-id-9", DummyStorageKey("child-ref-9"), VersionMap("child-9" to 9)),
                    "texts" to setOf("zzz", "yyy"),
                    "bools" to setOf(false),
                    "nums" to setOf(99.0, 999.0),
                    "refs" to setOf(
                        Reference("child-id-8", DummyStorageKey("child-ref-8"), VersionMap("child-8" to 8)),
                        Reference("child-id-7", DummyStorageKey("child-ref-7"), VersionMap("child-7" to 7))
                    )
                )
            ),
            2,
            VersionMap("actor" to 2)
        )

        database.insertOrUpdate(key, entity1)
        database.insertOrUpdate(key, entity2)
        val entityOut = database.getEntity(key, schema)

        assertThat(entityOut).isEqualTo(entity2)
    }

    @Test
    fun insertAndGet_entity_collectionFields_areNull() = runBlockingTest {
        val key = DummyStorageKey("key")
        val childSchema = newSchema("child")
        database.getSchemaTypeId(childSchema, db)
        val schema = newSchema(
            "hash",
            SchemaFields(
                singletons = mapOf(),
                collections = mapOf(
                    "texts" to FieldType.Text,
                    "refs" to FieldType.EntityRef("child")
                )
            )
        )
        val entity = DatabaseData.Entity(
            Entity(
                "entity",
                schema,
                mutableMapOf("texts" to null, "refs" to null)
            ),
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )

        database.insertOrUpdate(key, entity)
        val entityOut = database.getEntity(key, schema)
        assertThat(entityOut.entity.data).isEmpty()
    }

    @Test
    fun insertAndGet_entity_collectionFields_areEmpty() = runBlockingTest {
        val key = DummyStorageKey("key")
        val childSchema = newSchema("child")
        database.getSchemaTypeId(childSchema, db)
        val schema = newSchema(
            "hash",
            SchemaFields(
                singletons = mapOf(),
                collections = mapOf(
                    "texts" to FieldType.Text,
                    "refs" to FieldType.EntityRef("child")
                )
            )
        )
        val entity = DatabaseData.Entity(
            Entity(
                "entity",
                schema,
                mutableMapOf("texts" to setOf<String>(), "refs" to setOf<Reference>())
            ),
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )

        database.insertOrUpdate(key, entity)
        val entityOut = database.getEntity(key, schema)
        assertThat(entityOut.entity.data).isEmpty()
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
        val entity = DatabaseData.Entity(
            Entity(
                "entity",
                schema,
                mutableMapOf(
                    "texts" to listOf("aaa", "bbb") // Should be a Set, not a List.
                )
            ),
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )

        val exception = assertSuspendingThrows(IllegalArgumentException::class) {
            database.insertOrUpdate(DummyStorageKey("key"), entity)
        }
        assertThat(exception).hasMessageThat().startsWith("Collection fields must be of type Set.")
    }

    @Test
    fun insert_entity_singleReferenceField_wrongType() = runBlockingTest {
        val childSchema = newSchema("child")
        database.getSchemaTypeId(childSchema, db)
        val schema = newSchema(
            "hash",
            SchemaFields(
                singletons = mapOf("ref" to FieldType.EntityRef("child")),
                collections = emptyMap()
            )
        )

        val exception = assertSuspendingThrows(IllegalArgumentException::class) {
            database.insertOrUpdate(
                DummyStorageKey("key"),
                DatabaseData.Entity(
                    Entity(
                        "entity",
                        schema,
                        // Should be a Reference.
                        mutableMapOf("ref" to "abc")
                    ),
                    FIRST_VERSION_NUMBER,
                    VERSION_MAP
                )
            )
        }
        assertThat(exception).hasMessageThat().isEqualTo(
            "Expected field value to be a Reference but was abc."
        )
    }

    @Test
    fun insert_entity_collectionReferenceField_wrongType() = runBlockingTest {
        val childSchema = newSchema("child")
        database.getSchemaTypeId(childSchema, db)
        val schema = newSchema(
            "hash",
            SchemaFields(
                singletons = emptyMap(),
                collections = mapOf("refs" to FieldType.EntityRef("child"))
            )
        )

        val exception = assertSuspendingThrows(IllegalArgumentException::class) {
            database.insertOrUpdate(
                DummyStorageKey("key"),
                DatabaseData.Entity(
                    Entity(
                        "entity",
                        schema,
                        // Should be Set<Reference>.
                        mutableMapOf("refs" to setOf("abc"))
                    ),
                    FIRST_VERSION_NUMBER,
                    VERSION_MAP
                )
            )
        }
        assertThat(exception).hasMessageThat().isEqualTo(
            "Expected element in collection to be a Reference but was abc."
        )
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
            versionMap = VERSION_MAP
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
                Reference("ref1", backingKey, VersionMap("ref1" to 1)),
                Reference("ref2", backingKey, VersionMap("ref2" to 2))
            ),
            schema = schema,
            databaseVersion = 1,
            versionMap = VERSION_MAP
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
            Reference("ref", backingKey, VersionMap("ref" to 1)),
            Reference("ref-to-remove", backingKey, VersionMap("ref-to-remove" to 2))
        )
        val inputCollection1 = DatabaseData.Collection(
            values = values,
            schema = schema,
            databaseVersion = 1,
            versionMap = VERSION_MAP
        )
        database.insertOrUpdate(collectionKey, inputCollection1)

        // Test removal of old elements.
        values.removeIf { it.id == "ref-to-remove" }
        val inputCollection2 = inputCollection1.copy(values = values, databaseVersion = 2)
        database.insertOrUpdate(collectionKey, inputCollection2)
        assertThat(database.getCollection(collectionKey, schema)).isEqualTo(inputCollection2)

        // Test addition of new elements.
        values.add(Reference("new-ref", backingKey, VersionMap("new-ref" to 3)))
        val inputCollection3 = inputCollection2.copy(values = values, databaseVersion = 3)
        database.insertOrUpdate(collectionKey, inputCollection3)
        assertThat(database.getCollection(collectionKey, schema)).isEqualTo(inputCollection3)

        // Test clearing all elements.
        values.clear()
        val inputCollection4 = inputCollection3.copy(values = values, databaseVersion = 4)
        database.insertOrUpdate(collectionKey, inputCollection4)
        assertThat(database.getCollection(collectionKey, schema)).isEqualTo(inputCollection4)
    }

    @Test
    fun insertAndGet_collection_mustIncrementVersion() = runBlockingTest {
        val key = DummyStorageKey("collection")
        val collection = DatabaseData.Collection(
            values = mutableSetOf(
                Reference("ref", DummyStorageKey("backing"), VersionMap("ref" to 1))
            ),
            schema = newSchema("hash"),
            databaseVersion = 1,
            versionMap = VERSION_MAP
        )
        database.insertOrUpdate(key, collection)

        val exception = assertSuspendingThrows(IllegalArgumentException::class) {
            database.insertOrUpdate(key, collection)
        }
        assertThat(exception).hasMessageThat().isEqualTo(
            "Given version (1) must be greater than version in database (1) when updating " +
                "storage key dummy://collection."
        )
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
            versionMap = VERSION_MAP
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
            reference = Reference("ref", backingKey, VersionMap("ref" to 1)),
            schema = schema,
            databaseVersion = 1,
            versionMap = VERSION_MAP
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
            reference = Reference("ref", backingKey, VersionMap("ref" to 1)),
            schema = schema,
            databaseVersion = 1,
            versionMap = VERSION_MAP
        )
        database.insertOrUpdate(singletonKey, inputSingleton1)

        // Test can change reference.
        val inputSingleton2 = inputSingleton1.copy(
            reference = Reference("new-ref", backingKey, VersionMap("new-ref" to 2)),
            databaseVersion = 2
        )
        database.insertOrUpdate(singletonKey, inputSingleton2)
        assertThat(database.getSingleton(singletonKey, schema)).isEqualTo(inputSingleton2)

        // Test can clear value.
        val inputSingleton3 = inputSingleton2.copy(reference = null, databaseVersion = 3)
        database.insertOrUpdate(singletonKey, inputSingleton3)
        assertThat(database.getSingleton(singletonKey, schema)).isEqualTo(inputSingleton3)
    }

    @Test
    fun insertAndGet_singleton_mustIncrementVersion() = runBlockingTest {
        val key = DummyStorageKey("singleton")
        val singleton = DatabaseData.Singleton(
            reference = Reference("ref", DummyStorageKey("backing"), VersionMap("ref" to 1)),
            schema = newSchema("hash"),
            databaseVersion = 1,
            versionMap = VERSION_MAP
        )
        database.insertOrUpdate(key, singleton)

        val exception = assertSuspendingThrows(IllegalArgumentException::class) {
            database.insertOrUpdate(key, singleton)
        }
        assertThat(exception).hasMessageThat().isEqualTo(
            "Given version (1) must be greater than version in database (1) when updating " +
                "storage key dummy://singleton."
        )
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
            versionMap = VERSION_MAP
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
            versionMap = VERSION_MAP
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
            versionMap = VERSION_MAP
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
            versionMap = VERSION_MAP
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
            versionMap = VERSION_MAP
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
            values = setOf(Reference("ref1", backingKey, VersionMap("ref1" to 1))),
            schema = schema,
            databaseVersion = 1,
            versionMap = VERSION_MAP
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
            values = setOf(Reference("ref1", backingKey, VersionMap("ref1" to 1))),
            schema = schema,
            databaseVersion = 1,
            versionMap = VERSION_MAP
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
            reference = Reference("ref1", backingKey, VersionMap("ref1" to 1)),
            schema = schema,
            databaseVersion = 1,
            versionMap = VERSION_MAP
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
        val reference = Reference("ref1", backingKey, VersionMap("ref1" to 1))
        val singleton = DatabaseData.Singleton(reference, schema, 1, VERSION_MAP)
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

        private const val FIRST_VERSION_NUMBER = 1
        private val VERSION_MAP = VersionMap("first" to 1, "second" to 2)

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
