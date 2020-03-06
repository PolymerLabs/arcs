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
import arcs.core.data.FieldType
import arcs.core.data.PrimitiveType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.util.toReferencable
import arcs.core.storage.Reference
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyParser
import arcs.core.storage.database.DatabaseClient
import arcs.core.storage.database.DatabaseData
import arcs.core.storage.testutil.DummyStorageKey
import arcs.core.testutil.assertSuspendingThrows
import arcs.core.testutil.assertThrows
import arcs.core.util.guardedBy
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assertWithMessage
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.test.runBlockingTest
import kotlinx.coroutines.yield
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
        assertThat(database.getTypeIdForTest(FieldType.Boolean))
            .isEqualTo(PrimitiveType.Boolean.ordinal)
        assertThat(database.getTypeIdForTest(FieldType.Number))
            .isEqualTo(PrimitiveType.Number.ordinal)
        assertThat(database.getTypeIdForTest(FieldType.Text))
            .isEqualTo(PrimitiveType.Text.ordinal)
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
                CREATION_TIMESTAMP,
                EXPIRATION_TIMESTAMP,
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
                CREATION_TIMESTAMP,
                EXPIRATION_TIMESTAMP,
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
                CREATION_TIMESTAMP,
                EXPIRATION_TIMESTAMP,
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
                CREATION_TIMESTAMP,
                EXPIRATION_TIMESTAMP,
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
                CREATION_TIMESTAMP,
                EXPIRATION_TIMESTAMP,
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
                CREATION_TIMESTAMP,
                EXPIRATION_TIMESTAMP,
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
                CREATION_TIMESTAMP,
                EXPIRATION_TIMESTAMP,
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
            CREATION_TIMESTAMP,
            EXPIRATION_TIMESTAMP,
            123L,
            VERSION_MAP,
            FIRST_VERSION_NUMBER,
            db
        )

        val exception = assertSuspendingThrows(IllegalArgumentException::class) {
            database.createEntityStorageKeyId(
                key,
                "incorrect-entity-id",
                CREATION_TIMESTAMP,
                EXPIRATION_TIMESTAMP,
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
        database.createEntityStorageKeyId(
            key,
            entityId,
            CREATION_TIMESTAMP,
            EXPIRATION_TIMESTAMP,
            typeId,
            VERSION_MAP,
            10,
            db
        )

        // Same version number is rejected.
        val exception1 = assertSuspendingThrows(IllegalArgumentException::class) {
            database.createEntityStorageKeyId(
                key,
                entityId,
                CREATION_TIMESTAMP,
                EXPIRATION_TIMESTAMP,
                typeId,
                VERSION_MAP,
                10,
                db
            )
        }
        assertThat(exception1).hasMessageThat().isEqualTo(
            "Given version (10) must be greater than version in database (10) when updating " +
                "storage key dummy://key."
        )

        // Smaller version number is rejected.
        val exception2 = assertSuspendingThrows(IllegalArgumentException::class) {
            database.createEntityStorageKeyId(
                key,
                entityId,
                CREATION_TIMESTAMP,
                EXPIRATION_TIMESTAMP,
                typeId,
                VERSION_MAP,
                9,
                db
            )
        }
        assertThat(exception2).hasMessageThat().isEqualTo(
            "Given version (9) must be greater than version in database (10) when updating " +
                "storage key dummy://key."
        )

        // Increasing version number is ok.
        database.createEntityStorageKeyId(
            key,
            entityId,
            CREATION_TIMESTAMP,
            EXPIRATION_TIMESTAMP,
            typeId,
            VERSION_MAP,
            11,
            db
        )
    }

    @Test
    fun getPrimitiveValue_boolean() = runBlockingTest {
        // Test value -> ID.
        assertThat(database.getPrimitiveValueId(true.toReferencable(), BOOLEAN_TYPE_ID, db))
            .isEqualTo(1)
        assertThat(database.getPrimitiveValueId(false.toReferencable(), BOOLEAN_TYPE_ID, db))
            .isEqualTo(0)

        val exception1 = assertThrows(IllegalArgumentException::class) {
            database.getPrimitiveValueId("not a bool".toReferencable(), BOOLEAN_TYPE_ID, db)
        }
        assertThat(exception1).hasMessageThat().isEqualTo("Expected value to be a Boolean.")

        // Test ID -> value.
        assertThat(database.getPrimitiveValue(1, BOOLEAN_TYPE_ID, db))
            .isEqualTo(true.toReferencable())
        assertThat(database.getPrimitiveValue(0, BOOLEAN_TYPE_ID, db))
            .isEqualTo(false.toReferencable())

        val exception2 = assertThrows(IllegalArgumentException::class) {
            database.getPrimitiveValue(2, BOOLEAN_TYPE_ID, db)
        }
        assertThat(exception2).hasMessageThat().isEqualTo("Expected 2 to be a Boolean (0 or 1).")
    }

    @Test
    fun getPrimitiveValue_text() = runBlockingTest {
        // Test value -> ID.
        assertThat(database.getPrimitiveValueId("aaa".toReferencable(), TEXT_TYPE_ID, db))
            .isEqualTo(1)
        assertThat(database.getPrimitiveValueId("bbb".toReferencable(), TEXT_TYPE_ID, db))
            .isEqualTo(2)
        assertThat(database.getPrimitiveValueId("ccc".toReferencable(), TEXT_TYPE_ID, db))
            .isEqualTo(3)
        assertThat(database.getPrimitiveValueId("aaa".toReferencable(), TEXT_TYPE_ID, db))
            .isEqualTo(1)

        val exception1 = assertThrows(IllegalArgumentException::class) {
            database.getPrimitiveValueId(123.0.toReferencable(), TEXT_TYPE_ID, db)
        }
        assertThat(exception1).hasMessageThat().isEqualTo("Expected value to be a String.")

        // Test ID -> value.
        assertThat(database.getPrimitiveValue(1, TEXT_TYPE_ID, db))
            .isEqualTo("aaa".toReferencable())
        assertThat(database.getPrimitiveValue(2, TEXT_TYPE_ID, db))
            .isEqualTo("bbb".toReferencable())
        assertThat(database.getPrimitiveValue(3, TEXT_TYPE_ID, db))
            .isEqualTo("ccc".toReferencable())

        val exception2 = assertThrows(IllegalArgumentException::class) {
            database.getPrimitiveValue(4, TEXT_TYPE_ID, db)
        }
        assertThat(exception2).hasMessageThat().isEqualTo("Unknown primitive with ID 4.")
    }

    @Test
    fun getPrimitiveValue_number() = runBlockingTest {
        // Test value -> ID.
        assertThat(database.getPrimitiveValueId(111.0.toReferencable(), NUMBER_TYPE_ID, db))
            .isEqualTo(1)
        assertThat(database.getPrimitiveValueId(222.0.toReferencable(), NUMBER_TYPE_ID, db))
            .isEqualTo(2)
        assertThat(database.getPrimitiveValueId(333.0.toReferencable(), NUMBER_TYPE_ID, db))
            .isEqualTo(3)
        assertThat(database.getPrimitiveValueId(111.0.toReferencable(), NUMBER_TYPE_ID, db))
            .isEqualTo(1)

        val exception1 = assertThrows(IllegalArgumentException::class) {
            database.getPrimitiveValueId("not a number".toReferencable(), NUMBER_TYPE_ID, db)
        }
        assertThat(exception1).hasMessageThat().isEqualTo("Expected value to be a Double.")

        // Test ID -> value.
        assertThat(database.getPrimitiveValue(1, NUMBER_TYPE_ID, db))
            .isEqualTo(111.0.toReferencable())
        assertThat(database.getPrimitiveValue(2, NUMBER_TYPE_ID, db))
            .isEqualTo(222.0.toReferencable())
        assertThat(database.getPrimitiveValue(3, NUMBER_TYPE_ID, db))
            .isEqualTo(333.0.toReferencable())

        val exception2 = assertThrows(IllegalArgumentException::class) {
            database.getPrimitiveValue(4, NUMBER_TYPE_ID, db)
        }
        assertThat(exception2).hasMessageThat().isEqualTo("Unknown primitive with ID 4.")
    }

    @Test
    fun getPrimitiveValue_unknownTypeId() = runBlockingTest {
        // Test value -> ID.
        val exception1 = assertThrows(IllegalArgumentException::class) {
            database.getPrimitiveValueId("aaa".toReferencable(), 987654L, db)
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
            RawEntity("entity", emptySet(), emptySet()),
            schema,
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
            RawEntity(
                "entity",
                mapOf(
                    "text" to "abc".toReferencable(),
                    "bool" to true.toReferencable(),
                    "num" to 123.0.toReferencable()
                ),
                mapOf(
                    "texts" to setOf("abc".toReferencable(), "def".toReferencable()),
                    "bools" to setOf(true.toReferencable(), false.toReferencable()),
                    "nums" to setOf(123.0.toReferencable(), 456.0.toReferencable())
                )
            ),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )

        database.insertOrUpdate(key, entity)
        val entityOut = database.getEntity(key, schema)

        assertThat(entityOut).isEqualTo(entity)
    }

    @Test
    fun insertAndGet_entity_withCreationAndExpiration() = runBlockingTest {
        val key = DummyStorageKey("key")
        val schema = newSchema(
            "hash",
            SchemaFields(singletons = mapOf("text" to FieldType.Text), collections = mapOf())
        )
        val entity = DatabaseData.Entity(
            RawEntity("entity", mapOf("text" to "abc".toReferencable()), mapOf(), 11L, 111L),
            schema,
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
            RawEntity("alice-id", singletons = mapOf("name" to "Alice".toReferencable())),
            childSchema,
            1,
            VersionMap("alice" to 1)
        )
        val bob = DatabaseData.Entity(
            RawEntity("bob-id", singletons = mapOf("name" to "Bob".toReferencable())),
            childSchema,
            1,
            VersionMap("bob" to 2)
        )
        val charlie = DatabaseData.Entity(
            RawEntity("charlie-id", singletons = mapOf("name" to "Charlie".toReferencable())),
            childSchema,
            1,
            VersionMap("charlie" to 3)
        )
        val parentEntity = DatabaseData.Entity(
            RawEntity(
                "parent-id",
                mapOf(
                    "favouriteChild" to Reference(
                        "alice-id",
                        DummyStorageKey("alice-key"),
                        VersionMap("alice" to 1)
                    )
                ),
                mapOf(
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
            schema,
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
            RawEntity(
                entityId,
                mapOf(
                    "text" to "aaa".toReferencable(),
                    "bool" to true.toReferencable(),
                    "num" to 111.0.toReferencable(),
                    "ref" to Reference(
                        "child-id-1",
                        DummyStorageKey("child-ref-1"),
                        VersionMap("child-1" to 1)
                    )
                ),
                mapOf(
                    "texts" to setOf("aaa".toReferencable(), "bbb".toReferencable()),
                    "bools" to setOf(true.toReferencable()),
                    "nums" to setOf(11.0.toReferencable(), 111.0.toReferencable()),
                    "refs" to setOf(
                        Reference(
                            "child-id-2",
                            DummyStorageKey("child-ref-2"),
                            VersionMap("child-2" to 2)
                        ),
                        Reference(
                            "child-id-3",
                            DummyStorageKey("child-ref-3"),
                            VersionMap("child-3" to 3)
                        )
                    )
                )
            ),
            schema,
            1,
            VersionMap("actor" to 1)
        )
        val entity2 = DatabaseData.Entity(
            RawEntity(
                entityId,
                mapOf(
                    "text" to "zzz".toReferencable(),
                    "bool" to false.toReferencable(),
                    "num" to 999.0.toReferencable(),
                    "ref" to Reference(
                        "child-id-9",
                        DummyStorageKey("child-ref-9"),
                        VersionMap("child-9" to 9)
                    )
                ),
                mapOf(
                    "texts" to setOf("zzz".toReferencable(), "yyy".toReferencable()),
                    "bools" to setOf(false.toReferencable()),
                    "nums" to setOf(99.0.toReferencable(), 999.0.toReferencable()),
                    "refs" to setOf(
                        Reference(
                            "child-id-8",
                            DummyStorageKey("child-ref-8"),
                            VersionMap("child-8" to 8)
                        ),
                        Reference(
                            "child-id-7",
                            DummyStorageKey("child-ref-7"),
                            VersionMap("child-7" to 7)
                        )
                    )
                )
            ),
            schema,
            2,
            VersionMap("actor" to 2)
        )

        database.insertOrUpdate(key, entity1)
        database.insertOrUpdate(key, entity2)
        val entityOut = database.getEntity(key, schema)

        assertThat(entityOut).isEqualTo(entity2)
    }

    @Test
    fun insertAndGet_entity_collectionFields_areMissing() = runBlockingTest {
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
            RawEntity("entity", emptyMap(), emptyMap()),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )

        database.insertOrUpdate(key, entity)
        val entityOut = database.getEntity(key, schema)
        assertThat(entityOut!!.rawEntity.collections).isEmpty()
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
            RawEntity(
                "entity",
                collections = mapOf("texts" to emptySet(), "refs" to emptySet())
            ),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )

        database.insertOrUpdate(key, entity)
        val entityOut = database.getEntity(key, schema)
        assertThat(entityOut!!.rawEntity.collections).isEmpty()
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
                    RawEntity(
                        "entity",
                        // Should be a Reference.
                        singletons = mapOf("ref" to "abc".toReferencable())
                    ),
                    schema,
                    FIRST_VERSION_NUMBER,
                    VERSION_MAP
                )
            )
        }
        assertThat(exception).hasMessageThat().isEqualTo(
            "Expected field value to be a Reference but was Primitive(abc)."
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
                    RawEntity(
                        "entity",
                        // Should be Set<Reference>.
                        collections = mapOf("refs" to setOf("abc".toReferencable()))
                    ),
                    schema,
                    FIRST_VERSION_NUMBER,
                    VERSION_MAP
                )
            )
        }
        assertThat(exception).hasMessageThat().isEqualTo(
            "Expected element in collection to be a Reference but was Primitive(abc)."
        )
    }

    @Test
    fun get_entity_unknownStorageKey() = runBlockingTest {
        assertThat(database.getEntity(DummyStorageKey("nope"), newSchema("hash"))).isNull()
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
        val oldVersion = database.insertOrUpdate(key, collection)

        // TODO - DatabaseImpl should return the last version when an insert/update could not be
        //  applied.
        assertThat(database.insertOrUpdate(key, collection.copy(databaseVersion = oldVersion - 1)))
            .isEqualTo(oldVersion - 1)
    }

    @Test
    fun get_collection_unknownStorageKey() = runBlockingTest {
        assertThat(database.getCollection(DummyStorageKey("key"), newSchema("hash"))).isNull()
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
        val oldVersion = database.insertOrUpdate(key, singleton, originatingClientId = null)

        // TODO - DatabaseImpl should return the last version when an insert/update could not be
        //  applied.
        assertThat(
            database.insertOrUpdate(
                key,
                singleton.copy(databaseVersion = oldVersion - 1),
                originatingClientId = null
            )
        ).isEqualTo(oldVersion - 1)
    }

    @Test
    fun get_singleton_unknownStorageKey() = runBlockingTest {
        assertThat(database.getSingleton(DummyStorageKey("key"), newSchema("hash"))).isNull()
    }

    @Test
    fun get_mismatchedDataTypes_entity() = runBlockingTest {
        val entityKey = DummyStorageKey("entity")
        val schema = newSchema("hash")
        val entity = DatabaseData.Entity(
            rawEntity = RawEntity("entity", singletons = mapOf(), collections = mapOf()),
            schema = schema,
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
            rawEntity = RawEntity("entity", singletons = emptyMap(), collections = emptyMap()),
            schema = schema,
            databaseVersion = 1,
            versionMap = VERSION_MAP
        )
        database.insertOrUpdate(entityKey, entity)

        database.delete(entityKey)

        assertTableIsEmpty("storage_keys")
        assertTableIsEmpty("entities")
        assertTableIsEmpty("field_values")
        assertThat(database.getEntity(entityKey, schema)).isNull()
    }

    @Test
    fun delete_collection_otherEntitiesUnaffected() = runBlockingTest {
        val keyToKeep = DummyStorageKey("key-to-keep")
        val keyToDelete = DummyStorageKey("key-to-delete")
        val schema = newSchema("hash")
        val entity = DatabaseData.Entity(
            rawEntity = RawEntity("entity", emptySet(), emptySet()),
            schema = schema,
            databaseVersion = 1,
            versionMap = VERSION_MAP
        )
        database.insertOrUpdate(keyToKeep, entity)
        database.insertOrUpdate(keyToDelete, entity)

        database.delete(keyToDelete)

        assertThat(database.getEntity(keyToKeep, schema)).isEqualTo(entity)
        assertThat(database.getEntity(keyToDelete, schema)).isNull()
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
        assertThat(database.getCollection(collectionKey, schema)).isNull()
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
        assertThat(database.getCollection(keyToDelete, schema)).isNull()
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
        assertThat(database.getSingleton(singletonKey, schema)).isNull()
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
        assertThat(database.getSingleton(keyToDelete, schema)).isNull()
    }

    @Test
    fun insertUpdate_notifiesCorrectClient() = runBlockingTest {
        val backingKey = DummyStorageKey("backing")
        val storageKeyA = DummyStorageKey("key-a")
        val storageKeyB = DummyStorageKey("key-b")
        val schema = newSchema("hash")

        val clientA = FakeDatabaseClient(storageKeyA)
        val clientAId = database.addClient(clientA)
        assertThat(clientAId).isEqualTo(1)

        val clientB = FakeDatabaseClient(storageKeyB)
        val clientBId = database.addClient(clientB)
        assertThat(clientBId).isEqualTo(2)

        val reference = Reference("ref1", backingKey, VersionMap("ref1" to 1))
        val singleton = DatabaseData.Singleton(reference, schema, 1, VERSION_MAP)

        database.insertOrUpdate(storageKeyA, singleton, clientAId)

        clientA.eventMutex.withLock {
            assertThat(clientA.updates)
                .containsExactly(FakeDatabaseClient.Update(singleton, 1, clientAId))
        }
        clientB.eventMutex.withLock {
            assertThat(clientB.updates).isEmpty()
        }
    }

    @Test
    fun delete_notifiesCorrectClient() = runBlockingTest {
        val backingKey = DummyStorageKey("backing")
        val storageKeyA = DummyStorageKey("key-a")
        val storageKeyB = DummyStorageKey("key-b")
        val schema = newSchema("hash")

        val clientA = FakeDatabaseClient(storageKeyA)
        val clientAId = database.addClient(clientA)
        assertThat(clientAId).isEqualTo(1)

        val clientB = FakeDatabaseClient(storageKeyB)
        val clientBId = database.addClient(clientB)
        assertThat(clientBId).isEqualTo(2)

        val reference = Reference("ref1", backingKey, VersionMap("ref1" to 1))
        val singleton = DatabaseData.Singleton(reference, schema, 1, VERSION_MAP)

        database.insertOrUpdate(storageKeyA, singleton, clientAId)
        database.delete(storageKeyA, clientAId)

        yield()

        clientA.eventMutex.withLock {
            assertThat(clientA.updates)
                .containsExactly(FakeDatabaseClient.Update(singleton, 1, clientAId))
            assertThat(clientA.deletes)
                .containsExactly(clientAId)
        }
        clientB.eventMutex.withLock {
            assertThat(clientB.updates).isEmpty()
            assertThat(clientB.deletes).isEmpty()
        }
    }

    private fun newSchema(
        hash: String,
        fields: SchemaFields = SchemaFields(emptyMap(), emptyMap())
    ) = Schema(
        names = emptyList(),
        fields = fields,
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

        private val CREATION_TIMESTAMP = 99L
        private val EXPIRATION_TIMESTAMP = 999L

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

private class FakeDatabaseClient(override val storageKey: StorageKey) : DatabaseClient {
    val eventMutex = Mutex()
    val updates by guardedBy(eventMutex, mutableListOf<Update>())
    val deletes by guardedBy(eventMutex, mutableListOf<Int?>())

    override suspend fun onDatabaseUpdate(
        data: DatabaseData,
        version: Int,
        originatingClientId: Int?
    ) = eventMutex.withLock {
        updates.add(Update(data, version, originatingClientId))
        Unit
    }

    override suspend fun onDatabaseDelete(originatingClientId: Int?) = eventMutex.withLock {
        deletes.add(originatingClientId)
        Unit
    }

    data class Update(val data: DatabaseData, val version: Int, val originatingClientId: Int?)
}
