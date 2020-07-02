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
import arcs.android.common.forSingleResult
import arcs.android.common.getNullableBoolean
import arcs.android.common.map
import arcs.android.storage.database.DatabaseImpl.FieldClass
import arcs.core.common.Referencable
import arcs.core.crdt.VersionMap
import arcs.core.data.FieldType
import arcs.core.data.PrimitiveType
import arcs.core.data.RawEntity
import arcs.core.data.RawEntity.Companion.UNINITIALIZED_TIMESTAMP
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.data.util.toReferencable
import arcs.core.entity.SchemaRegistry
import arcs.core.storage.Reference
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyParser
import arcs.core.storage.database.DatabaseClient
import arcs.core.storage.database.DatabaseData
import arcs.core.storage.database.ReferenceWithVersion
import arcs.core.storage.testutil.DummyStorageKey
import arcs.core.testutil.assertSuspendingThrows
import arcs.core.util.guardedBy
import arcs.jvm.util.JvmTime
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assertWithMessage
import java.math.BigInteger
import java.time.Duration
import kotlin.test.assertFailsWith
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
            database.getTypeIdForTest(FieldType.EntityRef("shouldnotexistanywhere"))
        }
        assertThat(exception)
            .hasMessageThat()
            .contains("Unknown Schema with hash:")
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
            "text", DatabaseImpl.SchemaField("text", 1L, TEXT_TYPE_ID, isCollection = FieldClass.Singleton),
            "bool", DatabaseImpl.SchemaField("bool", 2L, BOOLEAN_TYPE_ID, isCollection = FieldClass.Singleton),
            "num", DatabaseImpl.SchemaField("num", 3L, NUMBER_TYPE_ID, isCollection = FieldClass.Collection)
        )

        // Re-running with the same schema doesn't create new field IDs
        assertThat(database.getSchemaFields(schemaTypeId1, db)).isEqualTo(fields1)

        // Running on a different schema creates new field IDs.
        val schema2 = schema1.copy(hash = "xyz")
        val schemaTypeId2 = database.getSchemaTypeId(schema2, db)
        val fields2 = database.getSchemaFields(schemaTypeId2, db)
        assertThat(fields2).containsExactly(
            "text", DatabaseImpl.SchemaField("text", 4L, TEXT_TYPE_ID, isCollection = FieldClass.Singleton),
            "bool", DatabaseImpl.SchemaField("bool", 5L, BOOLEAN_TYPE_ID, isCollection = FieldClass.Singleton),
            "num", DatabaseImpl.SchemaField("num", 6L, NUMBER_TYPE_ID, isCollection = FieldClass.Collection)
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
    fun createEntityStorageKeyId_versionNumberMustBeOneLarger() = runBlockingTest {
        val key = DummyStorageKey("key")
        val entityId = "entity-id"
        val typeId = 123L
        val originalStorageKeyId = database.createEntityStorageKeyId(
            key,
            entityId,
            CREATION_TIMESTAMP,
            EXPIRATION_TIMESTAMP,
            typeId,
            VERSION_MAP,
            10,
            db
        )
        assertThat(originalStorageKeyId).isNotNull()

        // Same version number is rejected.
        assertThat(
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
        ).isNull()

        // Smaller version number is rejected.
        assertThat(
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
        ).isNull()

        // Increasing version number by more than 1 is rejected.
        assertThat(
            database.createEntityStorageKeyId(
                key,
                entityId,
                CREATION_TIMESTAMP,
                EXPIRATION_TIMESTAMP,
                typeId,
                VERSION_MAP,
                12,
                db
            )
        ).isNull()

        // Increasing version number by 1 is ok.
        val newStorageKeyId = database.createEntityStorageKeyId(
            key,
            entityId,
            CREATION_TIMESTAMP,
            EXPIRATION_TIMESTAMP,
            typeId,
            VERSION_MAP,
            11,
            db
        )
        assertThat(newStorageKeyId).isNotNull()
        // TODO: If the storage key is the same, there's no need to delete the old one and create a
        // new one.
        assertThat(newStorageKeyId).isNotEqualTo(originalStorageKeyId)
    }

    @Test
    fun insertAndGet_entity_newEmptyEntity() = runBlockingTest {
        database.insertOrUpdateEntity(STORAGE_KEY, EMPTY_ENTITY)
        val entityOut = database.getEntity(STORAGE_KEY, EMPTY_SCHEMA)

        assertThat(entityOut).isEqualTo(EMPTY_ENTITY)
    }

    @Test
    fun insertAndGet_entity_newEntityWithPrimitiveFields() = runBlockingTest {
        val key = DummyStorageKey("key")

        val inlineSchema = newSchema(
            "inlineHash",
            SchemaFields(
                singletons = mapOf(
                    "inlineText" to FieldType.Text,
                    "inlineNumber" to FieldType.Number
                ),
                collections = mapOf(
                    "inlineTextCollection" to FieldType.Text
                )
            )
        )

        val schema = newSchema(
            "hash",
            SchemaFields(
                singletons = mapOf(
                    "text" to FieldType.Text,
                    "bool" to FieldType.Boolean,
                    "num" to FieldType.Number,
                    "byte" to FieldType.Byte,
                    "short" to FieldType.Short,
                    "int" to FieldType.Int,
                    "long" to FieldType.Long,
                    "char" to FieldType.Char,
                    "float" to FieldType.Float,
                    "double" to FieldType.Double,
                    "txtlst" to FieldType.ListOf(FieldType.Text),
                    "lnglst" to FieldType.ListOf(FieldType.Long),
                    "bigint" to FieldType.BigInt,
                    "inlined" to FieldType.InlineEntity("inlineHash")
                ),
                collections = mapOf(
                    "texts" to FieldType.Text,
                    "bools" to FieldType.Boolean,
                    "nums" to FieldType.Number,
                    "bytes" to FieldType.Byte,
                    "shorts" to FieldType.Short,
                    "ints" to FieldType.Int,
                    "longs" to FieldType.Long,
                    "chars" to FieldType.Char,
                    "floats" to FieldType.Float,
                    "doubles" to FieldType.Double,
                    "bigints" to FieldType.BigInt
                )
            )
        )

        val inlineEntity = RawEntity(
            "",
            mapOf(
                "inlineText" to "inlineABC".toReferencable(),
                "inlineNumber" to 131313.0.toReferencable()
            ),
            mapOf(
                "inlineTextCollection" to setOf("A".toReferencable(), "B".toReferencable())
            )
        )

        val entity = DatabaseData.Entity(
            RawEntity(
                "entity",
                mapOf(
                    "text" to "abc".toReferencable(),
                    "bool" to true.toReferencable(),
                    "num" to 123.0.toReferencable(),
                    "byte" to 42.toByte().toReferencable(),
                    "short" to 382.toShort().toReferencable(),
                    "int" to 1000000000.toReferencable(),
                    // This number is not representable as a double
                    "long" to  1000000000000000001L.toReferencable(),
                    "char" to 'A'.toReferencable(),
                    "float" to 34.567f.toReferencable(),
                    "double" to 4e100.toReferencable(),
                    "txtlst" to listOf("this", "is", "a", "list").map { it.toReferencable() }.toReferencable(FieldType.ListOf(FieldType.Text)),
                    "lnglst" to listOf(1L, 2L, 4L, 4L, 3L).map { it.toReferencable() }.toReferencable(FieldType.ListOf(FieldType.Long)),
                    "bigint" to BigInteger.valueOf(123).toReferencable(),
                    "inlined" to inlineEntity
                ),
                mapOf(
                    "texts" to setOf("abc".toReferencable(), "def".toReferencable()),
                    "bools" to setOf(true.toReferencable(), false.toReferencable()),
                    "nums" to setOf(123.0.toReferencable(), 456.0.toReferencable()),
                    "bytes" to setOf(100.toByte().toReferencable(), 27.toByte().toReferencable()),
                    "shorts" to setOf(129.toShort().toReferencable(), 30000.toShort().toReferencable()),
                    "ints" to setOf(1000000000.toReferencable(), 28.toReferencable()),
                    "longs" to setOf(1000000000000000002L.toReferencable(), 1000000000000000003L.toReferencable()),
                    "chars" to listOf('a', 'r', 'c', 's').map { it.toReferencable() }.toSet(),
                    "floats" to setOf(1.1f.toReferencable(), 100.101f.toReferencable()),
                    "doubles" to setOf(1.0.toReferencable(), 2e80.toReferencable()),
                    "bigints" to setOf(BigInteger.valueOf(123).toReferencable(), BigInteger.valueOf(678).toReferencable())
                )
            ),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )

        database.insertOrUpdateEntity(key, entity)
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

        database.insertOrUpdateEntity(key, entity)
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
        database.insertOrUpdateEntity(DummyStorageKey("alice-key"), alice)
        database.insertOrUpdateEntity(DummyStorageKey("bob-key"), bob)
        database.insertOrUpdateEntity(DummyStorageKey("charlie-key"), charlie)

        database.insertOrUpdateEntity(key, parentEntity)
        val entityOut = database.getEntity(key, schema)

        assertThat(entityOut).isEqualTo(parentEntity)
    }

    @Test
    fun insertAndGet_entity_updateExistingEntity() = runBlockingTest {
        val key = DummyStorageKey("key")
        val childSchema = newSchema("child")
        database.getSchemaTypeId(childSchema, db)
        val inlineSchema = newSchema(
            "inlineHash",
            SchemaFields(
                singletons = mapOf(
                    "text" to FieldType.Text,
                    "num" to FieldType.Number
                ),
                collections = emptyMap()
            )
        )
        val schema = newSchema(
            "hash",
            SchemaFields(
                singletons = mapOf(
                    "text" to FieldType.Text,
                    "bool" to FieldType.Boolean,
                    "num" to FieldType.Number,
                    "ref" to FieldType.EntityRef("child"),
                    "inline" to FieldType.InlineEntity("inlineHash")
                ),
                collections = mapOf(
                    "texts" to FieldType.Text,
                    "bools" to FieldType.Boolean,
                    "nums" to FieldType.Number,
                    "refs" to FieldType.EntityRef("child")
                )
            )
        )
        val inlineEntity = RawEntity(
            "",
            singletons = mapOf(
                "text" to "qqq".toReferencable(),
                "num" to 555.0.toReferencable()
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
                    ),
                    "inline" to inlineEntity
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
        val inlineEntity2 = RawEntity(
            "",
            singletons = mapOf(
                "text" to "rrr".toReferencable(),
                "num" to 666.0.toReferencable()
            )
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
                    ),
                    "inline" to inlineEntity2
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

        database.insertOrUpdateEntity(key, entity1)
        database.insertOrUpdateEntity(key, entity2)
        val entityOut = database.getEntity(key, schema)

        assertThat(entityOut).isEqualTo(entity2)
    }

    @Test
    fun insertAndGet_entity_singletonField_isMissing() = runBlockingTest {
        val key = DummyStorageKey("key")
        val childSchema = newSchema("child")
        database.getSchemaTypeId(childSchema, db)
        val schema = newSchema(
            "hash",
            SchemaFields(
                singletons = mapOf("text" to FieldType.Text),
                collections = mapOf()
            )
        )
        val entity = DatabaseData.Entity(
            RawEntity("entity", mapOf()),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )

        database.insertOrUpdateEntity(key, entity)
        val entityOut = database.getEntity(key, schema)
        assertThat(entityOut!!.rawEntity.singletons).containsExactly("text", null)
    }

    @Test
    fun insertAndGet_entity_singletonField_isNull() = runBlockingTest {
        val key = DummyStorageKey("key")
        val childSchema = newSchema("child")
        database.getSchemaTypeId(childSchema, db)
        val schema = newSchema(
            "hash",
            SchemaFields(
                singletons = mapOf("text" to FieldType.Text),
                collections = mapOf()
            )
        )
        val entity = DatabaseData.Entity(
            RawEntity("entity", mapOf("text" to null)),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )

        database.insertOrUpdateEntity(key, entity)
        val entityOut = database.getEntity(key, schema)
        assertThat(entityOut).isEqualTo(entity)
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
            EMPTY_RAW_ENTITY,
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )

        database.insertOrUpdateEntity(key, entity)
        val entityOut = database.getEntity(key, schema)
        assertThat(entityOut!!.rawEntity.collections).containsExactly(
            "texts", emptySet<Referencable>(),
            "refs", emptySet<Referencable>()
        )
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

        database.insertOrUpdateEntity(key, entity)
        val entityOut = database.getEntity(key, schema)
        assertThat(entityOut).isEqualTo(entity)
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
            database.insertOrUpdateEntity(
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
            database.insertOrUpdateEntity(
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
                ReferenceWithVersion(
                    Reference("ref1", backingKey, VersionMap("ref1" to 1)),
                    VersionMap("actor" to 1)
                ),
                ReferenceWithVersion(
                    Reference("ref2", backingKey, VersionMap("ref2" to 2)),
                    VersionMap("actor" to 2)
                )
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
            ReferenceWithVersion(
                Reference("ref", backingKey, VersionMap("ref" to 1)),
                VersionMap("actor" to 1)
            ),
            ReferenceWithVersion(
                Reference("ref-to-remove", backingKey, VersionMap("ref-to-remove" to 2)),
                VersionMap("actor" to 2)
            )
        )
        val inputCollection1 = DatabaseData.Collection(
            values = values,
            schema = schema,
            databaseVersion = 1,
            versionMap = VERSION_MAP
        )
        database.insertOrUpdate(collectionKey, inputCollection1)

        // Test removal of old elements.
        values.removeIf { it.reference.id == "ref-to-remove" }
        val inputCollection2 = inputCollection1.copy(values = values, databaseVersion = 2)
        database.insertOrUpdate(collectionKey, inputCollection2)
        assertThat(database.getCollection(collectionKey, schema)).isEqualTo(inputCollection2)

        // Test addition of new elements.
        values.add(ReferenceWithVersion(
            Reference("new-ref", backingKey, VersionMap("new-ref" to 3)),
            VersionMap( "actor" to 3)
        ))
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
                ReferenceWithVersion(
                    Reference("ref", DummyStorageKey("backing"), VersionMap("ref" to 1)),
                    VersionMap("actor" to 1)
                )
            ),
            schema = newSchema("hash"),
            databaseVersion = 2,
            versionMap = VERSION_MAP
        )
        assertThat(database.insertOrUpdate(key, collection)).isTrue()

        assertThat(database.insertOrUpdate(key, collection.copy(databaseVersion = 1)))
            .isFalse()
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
            value = null,
            schema = schema,
            databaseVersion = 1,
            versionMap = VERSION_MAP
        )

        database.insertOrUpdateSingleton(key, inputSingleton)
        val outputSingleton = database.getSingleton(key, schema)

        assertThat(outputSingleton).isEqualTo(inputSingleton)
    }

    @Test
    fun insertAndGet_singleton_newWithRef() = runBlockingTest {
        val singletonKey = DummyStorageKey("singleton")
        val backingKey = DummyStorageKey("backing")
        val schema = newSchema("hash")
        val inputSingleton = DatabaseData.Singleton(
            value = ReferenceWithVersion(
                Reference("ref", backingKey, VersionMap("ref" to 1)),
                VersionMap("actor" to 1)
            ),
            schema = schema,
            databaseVersion = 1,
            versionMap = VERSION_MAP
        )

        database.insertOrUpdateSingleton(singletonKey, inputSingleton)
        val outputSingleton = database.getSingleton(singletonKey, schema)

        assertThat(outputSingleton).isEqualTo(inputSingleton)
    }

    @Test
    fun insertAndGet_singleton_canChangeValues() = runBlockingTest {
        val singletonKey = DummyStorageKey("singleton")
        val backingKey = DummyStorageKey("backing")
        val schema = newSchema("hash")
        val inputSingleton1 = DatabaseData.Singleton(
            value = ReferenceWithVersion(
                Reference("ref", backingKey, VersionMap("ref" to 1)),
                VersionMap("actor" to 1)
            ),
            schema = schema,
            databaseVersion = 1,
            versionMap = VERSION_MAP
        )
        database.insertOrUpdateSingleton(singletonKey, inputSingleton1)

        // Test can change timestamps.
        val inputSingleton2 = inputSingleton1.copy(
            value = ReferenceWithVersion(
                Reference("ref", backingKey, VersionMap("ref" to 1), 1, 2),
                VersionMap("actor" to 1)
            ),
            databaseVersion = 2
        )
        database.insertOrUpdateSingleton(singletonKey, inputSingleton2)
        assertThat(database.getSingleton(singletonKey, schema)).isEqualTo(inputSingleton2)

        // Test can change reference.
        val inputSingleton3 = inputSingleton1.copy(
            value = ReferenceWithVersion(
                Reference("new-ref", backingKey, VersionMap("new-ref" to 2)),
                VersionMap("actor" to 2)
            ),
            databaseVersion = 3
        )
        database.insertOrUpdateSingleton(singletonKey, inputSingleton3)
        assertThat(database.getSingleton(singletonKey, schema)).isEqualTo(inputSingleton3)

        // Test can clear value.
        val inputSingleton4 = inputSingleton3.copy(value = null, databaseVersion = 4)
        database.insertOrUpdateSingleton(singletonKey, inputSingleton4)
        assertThat(database.getSingleton(singletonKey, schema)).isEqualTo(inputSingleton4)
    }

    @Test
    fun insertAndGet_singleton_mustIncrementVersion() = runBlockingTest {
        val key = DummyStorageKey("singleton")
        val singleton = DatabaseData.Singleton(
            value = ReferenceWithVersion(
                Reference("ref", DummyStorageKey("backing"), VersionMap("ref" to 1)),
                VersionMap("actor" to 1)
            ),
            schema = newSchema("hash"),
            databaseVersion = 2,
            versionMap = VERSION_MAP
        )
        assertThat(database.insertOrUpdate(key, singleton, originatingClientId = null)).isTrue()

        assertThat(
            database.insertOrUpdate(
                key,
                singleton.copy(databaseVersion = 1),
                originatingClientId = null
            )
        ).isFalse()
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
        database.insertOrUpdateEntity(entityKey, entity)

        val exception1 = assertFailsWith<IllegalArgumentException> {
            database.getCollection(entityKey, schema)
        }
        assertThat(exception1).hasMessageThat().isEqualTo(
            "Expected storage key dummy://entity to be a Collection but was a Entity."
        )

        val exception2 = assertFailsWith<IllegalArgumentException> {
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

        val exception1 = assertFailsWith<IllegalArgumentException> {
            database.getSingleton(collectionKey, schema)
        }
        assertThat(exception1).hasMessageThat().isEqualTo(
            "Expected storage key dummy://collection to be a Singleton but was a Collection."
        )

        val exception2 = assertFailsWith<IllegalArgumentException> {
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
            value = null,
            schema = schema,
            databaseVersion = 1,
            versionMap = VERSION_MAP
        )
        database.insertOrUpdateSingleton(singletonKey, singleton)

        val exception1 = assertFailsWith<IllegalArgumentException> {
            database.getCollection(singletonKey, schema)
        }
        assertThat(exception1).hasMessageThat().isEqualTo(
            "Expected storage key dummy://singleton to be a Collection but was a Singleton."
        )

        val exception2 = assertFailsWith<IllegalArgumentException> {
            database.getEntity(singletonKey, schema)
        }
        assertThat(exception2).hasMessageThat().isEqualTo(
            "Expected storage key dummy://singleton to be an Entity but was a Singleton."
        )
    }

    @Test
    fun insertAndGet_roundTrip_double() = runBlockingTest {
        val largeDouble = 12345678901234567890.0
        val storageKey = DummyStorageKey("entity")
        val schema = newSchema(
            "hash",
            SchemaFields(
                singletons = mapOf("x" to FieldType.Number),
                collections = emptyMap()
            )
        )
        val entity = DatabaseData.Entity(
            RawEntity(
                "entity",
                singletons = mapOf("x" to largeDouble.toReferencable())
            ),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )

        database.insertOrUpdateEntity(storageKey, entity)
        val entityOut = database.getEntity(storageKey, schema)

        assertThat(entityOut).isEqualTo(entity)
        val x = entityOut!!.rawEntity.singletons["x"]
        assertThat(x).isInstanceOf(ReferencablePrimitive::class.java)
        assertThat((x as ReferencablePrimitive<*>).value).isEqualTo(largeDouble)
    }

    @Test
    fun removeAllEntities() = runBlockingTest {
        val schema = newSchema(
            "hash",
            SchemaFields(
                singletons = mapOf("text" to FieldType.Text),
                collections = mapOf("nums" to FieldType.Number)
            )
        )
        val collectionKey = DummyStorageKey("collection")
        val backingKey = DummyStorageKey("backing")
        val entity1Key = DummyStorageKey("backing/entity1")
        val entity2Key = DummyStorageKey("backing/entity2")

        val entity1 = DatabaseData.Entity(
            RawEntity(
                "entity1",
                mapOf("text" to "abc".toReferencable()),
                mapOf("nums" to setOf(123.0.toReferencable(), 456.0.toReferencable())),
                1L,
                12L
            ),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )
        val entity2 = DatabaseData.Entity(
            RawEntity(
                "entity2",
                mapOf("text" to "def".toReferencable()),
                mapOf("nums" to setOf(123.0.toReferencable(), 789.0.toReferencable())),
                3L,
                12L
            ),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )
        val collection = DatabaseData.Collection(
            values = setOf(
                ReferenceWithVersion(
                    Reference("entity1", backingKey, VersionMap("ref1" to 1)),
                    VersionMap("actor" to 1)
                ),
                ReferenceWithVersion(
                    Reference("entity2", backingKey, VersionMap("ref2" to 2)),
                    VersionMap("actor" to 2)
                )
            ),
            schema = schema,
            databaseVersion = FIRST_VERSION_NUMBER,
            versionMap = VERSION_MAP
        )

        database.insertOrUpdate(entity1Key, entity1)
        database.insertOrUpdate(entity2Key, entity2)
        database.insertOrUpdate(collectionKey, collection)

        database.removeAllEntities()

        assertThat(database.getEntity(entity1Key, schema))
            .isEqualTo(DatabaseData.Entity(
                RawEntity(
                    "entity1",
                    mapOf("text" to null),
                    mapOf("nums" to emptySet()),
                    1L,
                    12L
                ),
                schema,
                FIRST_VERSION_NUMBER,
                VERSION_MAP
            ))
        assertThat(database.getEntity(entity2Key, schema))
            .isEqualTo(DatabaseData.Entity(
                RawEntity(
                    "entity2",
                    mapOf("text" to null),
                    mapOf("nums" to emptySet()),
                    3L,
                    12L
                ),
                schema,
                FIRST_VERSION_NUMBER,
                VERSION_MAP
            ))
        assertThat(database.getCollection(collectionKey, schema))
            .isEqualTo(collection.copy(values = setOf()))
    }

    @Test
    fun removeEntitiesCreatedBetween() = runBlockingTest {
        val schema = newSchema(
            "hash",
            SchemaFields(
                singletons = mapOf("text" to FieldType.Text),
                collections = mapOf("nums" to FieldType.Number)
            )
        )
        val collectionKey = DummyStorageKey("collection")
        val backingKey = DummyStorageKey("backing")
        val entity1Key = DummyStorageKey("backing/entity1")
        val entity2Key = DummyStorageKey("backing/entity2")
        val entity3Key = DummyStorageKey("backing/entity3")

        val entity1 = DatabaseData.Entity(
            RawEntity(
                "entity1",
                mapOf("text" to "abc".toReferencable()),
                mapOf("nums" to setOf(123.0.toReferencable(), 456.0.toReferencable())),
                1L, //Creation time
                12L
            ),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )
        val entity2 = DatabaseData.Entity(
            RawEntity(
                "entity2",
                mapOf("text" to "def".toReferencable()),
                mapOf("nums" to setOf(123.0.toReferencable(), 789.0.toReferencable())),
                3L, //Creation time
                12L
            ),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )
        val entity3 = DatabaseData.Entity(
            RawEntity(
                "entity3",
                mapOf("text" to "ghi".toReferencable()),
                mapOf("nums" to setOf(111.0.toReferencable(), 789.0.toReferencable())),
                5L, //Creation time
                12L
            ),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )
        val collection = DatabaseData.Collection(
            values = setOf(
                ReferenceWithVersion(
                    Reference("entity1", backingKey, VersionMap("ref1" to 1)),
                    VersionMap("actor" to 1)
                ),
                ReferenceWithVersion(
                    Reference("entity2", backingKey, VersionMap("ref2" to 2)),
                    VersionMap("actor" to 2)
                ),
                ReferenceWithVersion(
                    Reference("entity3", backingKey, VersionMap("ref3" to 3)),
                    VersionMap("actor" to 3)
                )
            ),
            schema = schema,
            databaseVersion = FIRST_VERSION_NUMBER,
            versionMap = VERSION_MAP
        )

        database.insertOrUpdate(entity1Key, entity1)
        database.insertOrUpdate(entity2Key, entity2)
        database.insertOrUpdate(entity3Key, entity3)
        database.insertOrUpdate(collectionKey, collection)

        database.removeEntitiesCreatedBetween(2, 4)

        // Entity2 should be the only one cleared.
        assertThat(database.getEntity(entity2Key, schema))
            .isEqualTo(DatabaseData.Entity(
                RawEntity(
                    "entity2",
                    mapOf("text" to null),
                    mapOf("nums" to emptySet()),
                    3L,
                    12L
                ),
                schema,
                FIRST_VERSION_NUMBER,
                VERSION_MAP
            ))
        assertThat(database.getEntity(entity1Key, schema)).isEqualTo(entity1)
        assertThat(database.getEntity(entity3Key, schema)).isEqualTo(entity3)

        val newValues = setOf(
            ReferenceWithVersion(
                Reference("entity1", backingKey, VersionMap("ref1" to 1)),
                VersionMap("actor" to 1)
            ),
            ReferenceWithVersion(
                Reference("entity3", backingKey, VersionMap("ref3" to 3)),
                VersionMap("actor" to 3)
            )
        )
        assertThat(database.getCollection(collectionKey, schema))
            .isEqualTo(collection.copy(values = newValues))
    }

    @Test
    fun garbageCollection() = runBlockingTest {
        val schema = newSchema("hash")
        val backingKey = DummyStorageKey("backing")
        var version = 1
        fun entity(id: String, creationDaysAgo: Long) = DatabaseData.Entity(
            RawEntity(
                id,
                singletons = mapOf(),
                collections = mapOf(),
                creationTimestamp = JvmTime.currentTimeMillis - Duration.ofDays(creationDaysAgo).toMillis()
            ),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )
        suspend fun updateCollection(vararg entities: DatabaseData.Entity) {
            val values = entities.map { 
                ReferenceWithVersion(
                    Reference(it.rawEntity.id, backingKey, VersionMap("ref" to 1)),
                    VersionMap("actor" to 1))
            }
            val collection = DatabaseData.Collection(
                values = values.toSet(),
                schema = schema,
                databaseVersion = version++,
                versionMap = VERSION_MAP
            )
            database.insertOrUpdate(DummyStorageKey("collection"), collection)
        }

        val entityInCollectionKey = DummyStorageKey("backing/entityInCollection")
        val entityInCollection = entity("entityInCollection", 10)
        val orphanEntityKey = DummyStorageKey("backing/orphan")
        val orphanEntity = entity("orphan", 10)
        val recentEntityKey = DummyStorageKey("backing/recent")
        val recentEntity = entity("recent", 1)
        val lateRefdEntityKey = DummyStorageKey("backing/lateRefd")
        val lateRefdEntity = entity("lateRefd", 10)
        database.insertOrUpdate(entityInCollectionKey, entityInCollection)
        database.insertOrUpdate(orphanEntityKey, orphanEntity)
        database.insertOrUpdate(recentEntityKey, recentEntity)
        database.insertOrUpdate(lateRefdEntityKey, lateRefdEntity)
        updateCollection(entityInCollection)

        database.runGarbageCollection()

        assertThat(database.getEntity(recentEntityKey, schema)).isEqualTo(recentEntity)
        assertThat(database.getEntity(entityInCollectionKey, schema)).isEqualTo(entityInCollection)
        // After first round both orphanEntity and lateRefdEntityKey should be marked as
        // orphan, but not deleted yet.
        assertThat(database.getEntity(orphanEntityKey, schema)).isEqualTo(orphanEntity)
        assertThat(database.getEntity(lateRefdEntityKey, schema)).isEqualTo(lateRefdEntity)
        assertThat(readOrphanField(orphanEntityKey)).isTrue()
        assertThat(readOrphanField(lateRefdEntityKey)).isTrue()
        assertThat(readOrphanField(recentEntityKey)).isFalse()
        assertThat(readOrphanField(entityInCollectionKey)).isFalse()

        // Now add lateRefdEntity to the collection (in between GC runs).
        updateCollection(entityInCollection, lateRefdEntity)

        database.runGarbageCollection()

        assertThat(database.getEntity(recentEntityKey, schema)).isEqualTo(recentEntity)
        assertThat(database.getEntity(entityInCollectionKey, schema)).isEqualTo(entityInCollection)
        assertThat(database.getEntity(lateRefdEntityKey, schema)).isEqualTo(lateRefdEntity)
        // orphanEntity should have been deleted (orphan on two consecutive runs)
        assertThat(database.getEntity(orphanEntityKey, schema)).isEqualTo(null)
        // lateRefdEntity is no longer orphan.
        assertThat(readOrphanField(lateRefdEntityKey)).isFalse()
        assertThat(readOrphanField(recentEntityKey)).isFalse()
        assertThat(readOrphanField(entityInCollectionKey)).isFalse()
    }

    @Test
    fun garbageCollectionEntityWithNestedEntityRemovedFromCollection() = runBlockingTest {
        val schema = newSchema(
            "hash",
            SchemaFields(
                collections = mapOf("refs" to FieldType.EntityRef("hash")),
                singletons = mapOf("text" to FieldType.Text)
            )
        )
        val backingKey = DummyStorageKey("backing")
        val entityKey = DummyStorageKey("backing/entity")
        val nestedKey = DummyStorageKey("backing/nested")
        var version = 1
        val nested = DatabaseData.Entity(
            RawEntity(
                "nested",
                singletons = mapOf("text" to "abc".toReferencable()),
                collections = mapOf("refs" to setOf()),
                creationTimestamp = JvmTime.currentTimeMillis - Duration.ofDays(10).toMillis()
            ),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )
        val entity = DatabaseData.Entity(
            RawEntity(
                "entity",
                singletons = mapOf("text" to "def".toReferencable()),
                collections = mapOf("refs" to setOf(Reference("nested", backingKey, VERSION_MAP))),
                creationTimestamp = JvmTime.currentTimeMillis - Duration.ofDays(10).toMillis()
            ),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )
        suspend fun updateCollection(vararg entities: DatabaseData.Entity) {
            val values = entities.map { ReferenceWithVersion(
                Reference(it.rawEntity.id, backingKey, VersionMap("ref" to 1)),
                VersionMap("actor" to 1)
            ) }
            val collection = DatabaseData.Collection(
                values = values.toSet(),
                schema = schema,
                databaseVersion = version++,
                versionMap = VERSION_MAP
            )
            database.insertOrUpdate(DummyStorageKey("collection"), collection)
        }

        database.insertOrUpdate(nestedKey, nested)
        database.insertOrUpdate(entityKey, entity)
        // Insert in collection.
        updateCollection(entity)
        // Remove from collection.
        updateCollection()

        // First run, entity is detected as orphan.
        database.runGarbageCollection()
        assertThat(database.getEntity(entityKey, schema)).isEqualTo(entity)
        assertThat(readOrphanField(entityKey)).isTrue()

        // Second run, entity is removed, nested entity is still in the db.
        database.runGarbageCollection()
        assertThat(database.getEntity(entityKey, schema)).isEqualTo(null)
        assertThat(database.getEntity(nestedKey, schema)).isEqualTo(nested)

        // Next run, nested is marked as orphan.
        database.runGarbageCollection()
        assertThat(readOrphanField(nestedKey)).isTrue()

        // Finally, nested gets removed.
        database.runGarbageCollection()
        assertThat(database.getEntity(nestedKey, schema)).isEqualTo(null)
    }

    @Test
    fun garbageCollectionEntityWithNestedEntityRemovedFromSingleton() = runBlockingTest {
        val schema = newSchema(
            "hash",
            SchemaFields(
                collections = mapOf("texts" to FieldType.Text),
                singletons = mapOf("ref" to FieldType.EntityRef("hash"))
            )
        )
        val backingKey = DummyStorageKey("backing")
        val entityKey = DummyStorageKey("backing/entity")
        val nestedKey = DummyStorageKey("backing/nested")
        var version = 1
        val nested = DatabaseData.Entity(
            RawEntity(
                "nested",
                singletons = mapOf("ref" to null),
                collections = mapOf("texts" to setOf("abc".toReferencable())),
                creationTimestamp = JvmTime.currentTimeMillis - Duration.ofDays(10).toMillis()
            ),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )
        val entity = DatabaseData.Entity(
            RawEntity(
                "entity",
                singletons = mapOf("ref" to Reference("nested", backingKey, VERSION_MAP)),
                collections = mapOf("texts" to setOf("def".toReferencable())),
                creationTimestamp = JvmTime.currentTimeMillis - Duration.ofDays(10).toMillis()
            ),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )
        suspend fun updateSingleton(entity: DatabaseData.Entity?) {
            val ref = entity?.let{ReferenceWithVersion(
                Reference(it.rawEntity.id, backingKey, VersionMap("ref" to 1)),
                VersionMap("actor" to 1)
            )}
            val singleton = DatabaseData.Singleton(
                value = ref,
                schema = schema,
                databaseVersion = version++,
                versionMap = VERSION_MAP
            )
            database.insertOrUpdate(DummyStorageKey("singleton"), singleton)
        }

        database.insertOrUpdate(nestedKey, nested)
        database.insertOrUpdate(entityKey, entity)
        // Insert in singleton.
        updateSingleton(entity)
        // Remove from singleton.
        updateSingleton(null)

        // First run, entity is detected as orphan.
        database.runGarbageCollection()
        assertThat(database.getEntity(entityKey, schema)).isEqualTo(entity)
        assertThat(readOrphanField(entityKey)).isTrue()

        // Second run, entity is removed, nested entity is still in the db.
        database.runGarbageCollection()
        assertThat(database.getEntity(entityKey, schema)).isEqualTo(null)
        assertThat(database.getEntity(nestedKey, schema)).isEqualTo(nested)

        // Next run, nested is marked as orphan.
        database.runGarbageCollection()
        assertThat(readOrphanField(nestedKey)).isTrue()

        // Finally, nested gets removed.
        database.runGarbageCollection()
        assertThat(database.getEntity(nestedKey, schema)).isEqualTo(null)
    }

    @Test
    fun removeExpiredEntities_entityIsCleared() = runBlockingTest {
        val schema = newSchema(
            "hash",
            SchemaFields(
                singletons = mapOf(
                    "text" to FieldType.Text,
                    "long" to FieldType.Long,
                    "float" to FieldType.Float,
                    "textlist" to FieldType.ListOf(FieldType.Text),
                    "bigint" to FieldType.BigInt
                ),
                collections = mapOf(
                    "nums" to FieldType.Number,
                    "chars" to FieldType.Char,
                    "bigints" to FieldType.BigInt
                )
            )
        )
        val collectionKey = DummyStorageKey("collection")
        val backingKey = DummyStorageKey("backing")
        val entityKey = DummyStorageKey("backing/entity")
        val entity2Key = DummyStorageKey("backing/entity2")
        val expiredEntityKey = DummyStorageKey("backing/expiredEntity")

        // An expired entity.
        val timeInPast = JvmTime.currentTimeMillis - 10000
        val expiredEntity = DatabaseData.Entity(
            RawEntity(
                "expiredEntity",
                mapOf(
                    "text" to "abc".toReferencable(),
                    "long" to 1000000000000000001L.toReferencable(),
                    "float" to 3.412f.toReferencable(),
                    "textlist" to listOf("abc", "abcd", "def", "ghi").map { it.toReferencable() }.toReferencable(FieldType.ListOf(FieldType.Text)),
                    "bigint" to BigInteger.valueOf(1000).toReferencable()
                ),
                mapOf(
                    "nums" to setOf(123.0.toReferencable(), 456.0.toReferencable()),
                    "chars" to listOf('A', 'R', 'C', 'S', '!').map { it.toReferencable() }.toSet(),
                    "bigints" to setOf(BigInteger("12345678901234567890").toReferencable(), BigInteger.valueOf(3).toReferencable())
                ),
                11L,
                timeInPast // expirationTimestamp, in the past.
            ),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )
        // Add a not-yet-expired entity.
        val entity = DatabaseData.Entity(
            RawEntity(
                "entity",
                mapOf(
                    "text" to "def".toReferencable(),
                    "long" to 1L.toReferencable(),
                    "float" to 42.0f.toReferencable(),
                    "textlist" to listOf("abcd", "abcd").map { it.toReferencable() }.toReferencable(FieldType.ListOf(FieldType.Text)),
                    "bigint" to BigInteger.valueOf(2000).toReferencable()
                ),
                mapOf(
                    "nums" to setOf(123.0.toReferencable(), 789.0.toReferencable()),
                    "chars" to listOf('R', 'O', 'C', 'K', 'S').map { it.toReferencable() }.toSet(),
                    "bigints" to setOf(BigInteger("44412345678901234567890").toReferencable(), BigInteger.valueOf(5).toReferencable())
                ),
                11L,
                JvmTime.currentTimeMillis + 10000 // expirationTimestamp, in the future.
            ),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )
        // Add an entity with no expiration.
        val entity2 = DatabaseData.Entity(
            RawEntity(
                "entity2",
                mapOf(
                    "text" to "def".toReferencable(),
                    "long" to 10L.toReferencable(),
                    "float" to 37.5f.toReferencable(),
                    "textlist" to listOf("def", "def").map { it.toReferencable() }.toReferencable(FieldType.ListOf(FieldType.Text)),
                    "bigint" to BigInteger.valueOf(3000).toReferencable()
                ),
                mapOf(
                    "nums" to setOf(123.0.toReferencable(), 789.0.toReferencable()),
                    "chars" to listOf('H', 'e', 'l', 'L', 'o').map { it.toReferencable() }.toSet(),
                    "bigints" to setOf(BigInteger("33344412345678901234567890").toReferencable(), BigInteger.valueOf(7).toReferencable())
                ),
                11L,
                UNINITIALIZED_TIMESTAMP // no expirationTimestamp
            ),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )

        // Add all of them to a collection.
        val values = setOf(
            ReferenceWithVersion(
                Reference("entity", backingKey, VersionMap("ref" to 1)),
                VersionMap("actor" to 1)
            ),
            ReferenceWithVersion(
                Reference("expiredEntity", backingKey, VersionMap("ref-to-remove" to 2)),
                VersionMap("actor" to 2)
            ),
            ReferenceWithVersion(
                Reference("entity2", backingKey, VersionMap("ref" to 1)),
                VersionMap("actor" to 3)
            )
        )
        val collection = DatabaseData.Collection(
            values = values,
            schema = schema,
            databaseVersion = FIRST_VERSION_NUMBER,
            versionMap = VERSION_MAP
        )

        database.insertOrUpdate(expiredEntityKey, expiredEntity)
        database.insertOrUpdate(entityKey, entity)
        database.insertOrUpdate(entity2Key, entity2)
        database.insertOrUpdate(collectionKey, collection)

        // Add clients to verify updates.
        val collectionClient = FakeDatabaseClient(collectionKey)
        database.addClient(collectionClient)
        val entityClient = FakeDatabaseClient(entityKey)
        database.addClient(entityClient)
        val expiredEntityClient = FakeDatabaseClient(expiredEntityKey)
        database.addClient(expiredEntityClient)

        database.removeExpiredEntities()

        // Check the expired entity fields have been cleared (only a tombstone is left).
        assertThat(database.getEntity(expiredEntityKey, schema))
            .isEqualTo(DatabaseData.Entity(
                RawEntity(
                    "expiredEntity",
                    mapOf(
                        "text" to null,
                        "long" to null,
                        "float" to null,
                        "textlist" to null,
                        "bigint" to null
                    ),
                    mapOf("nums" to emptySet(), "chars" to emptySet(), "bigints" to emptySet()),
                    11L,
                    timeInPast
                ),
                schema,
                FIRST_VERSION_NUMBER,
                VERSION_MAP
            ))

        // Check the other entities have not been modified.
        assertThat(database.getEntity(entityKey, schema)).isEqualTo(entity)
        assertThat(database.getEntity(entity2Key, schema)).isEqualTo(entity2)

        // Check the collection only contain the non expired entities.
        val newValues = setOf(
            ReferenceWithVersion(
                Reference("entity", backingKey, VersionMap("ref" to 1)),
                VersionMap("actor" to 1)
            ),
            ReferenceWithVersion(
                Reference("entity2", backingKey, VersionMap("ref" to 1)),
                VersionMap("actor" to 3)
            )
        )
        assertThat(database.getCollection(collectionKey, schema))
            .isEqualTo(collection.copy(values = newValues))

        // Check unused values have been deleted from the global table as well, it should contain
        // only values referenced from the two entities (eight values each).
        assertTableIsSize("field_values", 16)

        // Check collection entries have been cleared. For each remaining entity there should only
        // be twelve values (two for the nums collection, five for the chars collection, 
        // two for the text list, two for the bigint list, one for the membership of the entity).
        assertTableIsSize("collection_entries", 24)

        // Check the collections for chars/nums in expiredEntity is gone (7 collections left are
        // nums for the two entities, chars for the two entities, strings for the two entities,
        // bigints for the two entities, and the entity collection).
        assertTableIsSize("collections", 9)

        // Check the expired entity ref is gone.
        assertThat(readEntityRefsEntityId()).containsExactly("entity", "entity2")

        // Check unused primitive values have been removed.
        assertThat(readTextPrimitiveValues()).containsExactly(
            "abcd",
            "def",
            "2000",
            "44412345678901234567890",
            "5",
            "3000",
            "33344412345678901234567890",
            "7"
        )
        
        assertThat(readNumberPrimitiveValues()).containsExactly(123.0, 789.0, 42.0, 37.5)

        // Check the corrent clients were notified.
        collectionClient.eventMutex.withLock {
            assertThat(collectionClient.deletes).containsExactly(null)
        }
        expiredEntityClient.eventMutex.withLock {
            assertThat(expiredEntityClient.deletes).containsExactly(null)
        }
        entityClient.eventMutex.withLock {
            assertThat(entityClient.deletes).isEmpty()
        }
    }

    @Test
    fun removeExpiredEntities_inlineDataIsRemoved() = runBlockingTest {
        val inlineInlineSchema = newSchema(
            "inlineInlineHash",
            SchemaFields(
                singletons = mapOf(
                    "text" to FieldType.Text
                ),
                collections = emptyMap()
            )
        )
        val inlineSchema = newSchema(
            "inlineHash",
            SchemaFields(
                singletons = mapOf(
                    "text" to FieldType.Text,
                    "num" to FieldType.Number,
                    "int" to FieldType.Int,
                    "textlist" to FieldType.ListOf(FieldType.Text),
                    "inline" to FieldType.InlineEntity("inlineInlineHash")
                ),
                collections = mapOf(
                    "texts" to FieldType.Text,
                    "nums" to FieldType.Number,
                    "ints" to FieldType.Int
                )
            )
        )
        val schema = newSchema(
            "hash",
            SchemaFields(
                singletons = mapOf(
                    "inline" to FieldType.InlineEntity("inlineHash")
                ),
                collections = emptyMap()
            )
        )
        val entityKey = DummyStorageKey("backing/entity")

        val inlineInlineEntity = RawEntity(
            "",
            mapOf("text" to "SO INLINE".toReferencable()),
            emptyMap()
        )

        val inlineEntity = RawEntity(
            "",
            mapOf(
                "text" to "this is some text".toReferencable(),
                "num" to 42.0.toReferencable(),
                "int" to 37.toReferencable(),
                "textlist" to listOf("what", "does", "the", "fox", "say").map {
                    it.toReferencable()
                }.toReferencable(FieldType.ListOf(FieldType.Text)),
                "inline" to inlineInlineEntity
            ),
            mapOf(
                "texts" to listOf("hovercraft", "full", "of", "eels").map { it.toReferencable() }.toSet(),
                "nums" to listOf(43.0, 33.0, 23.0).map { it.toReferencable() }.toSet(),
                "ints" to listOf(1, 2, 3, 4).map { it.toReferencable() }.toSet()
            )
        )
        
        val timeInPast = JvmTime.currentTimeMillis - 10000 // expirationTimestamp, in the past.

        val entity = DatabaseData.Entity(
            RawEntity(
                "entity",
                mapOf(
                    "inline" to inlineEntity
                ),
                emptyMap(),
                11L,
                timeInPast
            ),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )

        database.insertOrUpdate(entityKey, entity)
        assertThat(database.getEntity(entityKey, schema)).isEqualTo(entity)

        database.removeExpiredEntities()

        // Check the expired entity fields have been cleared (only a tombstone is left).
        assertThat(database.getEntity(entityKey, schema))
            .isEqualTo(DatabaseData.Entity(
                RawEntity(
                    "entity",
                    mapOf(
                        "inline" to null
                    ),
                    emptyMap(),
                    11L,
                    timeInPast
                ),
                schema,
                FIRST_VERSION_NUMBER,
                VERSION_MAP
            ))

        // Check unused values have been deleted from the global table as well, there should be no
        // values left.
        assertTableIsSize("field_values", 0)

        // Check collection entries have been cleared.
        assertTableIsSize("collection_entries", 0)

        // Check the collections for chars/nums are gone.
        assertTableIsSize("collections", 0)

        assertTableIsSize("entities", 1)

        assertTableIsSize("text_primitive_values", 0)

        assertTableIsSize("number_primitive_values", 0)
    }

    @Test
    fun removeExpiredEntities_entityInSingleton() = runBlockingTest {
        val schema = newSchema(
            "hash",
            SchemaFields(
                singletons = mapOf("text" to FieldType.Text),
                collections = mapOf("nums" to FieldType.Number)
            )
        )
        val singletonKey = DummyStorageKey("singleton")
        val backingKey = DummyStorageKey("backing")
        val entityKey = DummyStorageKey("backing/entity")
        val expiredEntityKey = DummyStorageKey("backing/expiredEntity")

        // An expired entity.
        val timeInPast = JvmTime.currentTimeMillis - 10000
        val expiredEntity = DatabaseData.Entity(
            RawEntity(
                "expiredEntity",
                mapOf("text" to "abc".toReferencable()),
                mapOf("nums" to setOf(123.0.toReferencable(), 456.0.toReferencable())),
                11L,
                timeInPast // expirationTimestamp, in the past.
            ),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )
        // A non-expired entity.
        val entity = DatabaseData.Entity(
            RawEntity(
                "entity",
                mapOf("text" to "def".toReferencable()),
                mapOf("nums" to setOf(123.0.toReferencable(), 789.0.toReferencable())),
                11L,
                JvmTime.currentTimeMillis + 10000 // expirationTimestamp, in the future.
            ),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )
        // Singleton with expired entity.
        var singleton = DatabaseData.Singleton(
            value = ReferenceWithVersion(
                Reference("expiredEntity", backingKey, VersionMap("ref-to-remove" to 2)),
                VersionMap("actor" to 2)
            ),
            schema = schema,
            databaseVersion = FIRST_VERSION_NUMBER,
            versionMap = VERSION_MAP
        )

        database.insertOrUpdate(expiredEntityKey, expiredEntity)
        database.insertOrUpdate(entityKey, entity)
        database.insertOrUpdate(singletonKey, singleton)

        // Add clients to verify updates.
        val singletonClient = FakeDatabaseClient(singletonKey)
        database.addClient(singletonClient)
        val entityClient = FakeDatabaseClient(entityKey)
        database.addClient(entityClient)
        val expiredEntityClient = FakeDatabaseClient(expiredEntityKey)
        database.addClient(expiredEntityClient)

        database.removeExpiredEntities()

        val nullEntity = DatabaseData.Entity(
            RawEntity(
                "expiredEntity",
                mapOf("text" to null),
                mapOf("nums" to emptySet()),
                11L,
                timeInPast
            ),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )

        // Check the expired entity fields have been cleared (only a tombstone is left).
        assertThat(database.getEntity(expiredEntityKey, schema)).isEqualTo(nullEntity)

        // Check the other entity has not been modified.
        assertThat(database.getEntity(entityKey, schema)).isEqualTo(entity)

        // Check the singleton now contains null.
        assertThat(database.getSingleton(singletonKey, schema))
            .isEqualTo(singleton.copy(value = null))

        // Check the corrent clients were notified.
        singletonClient.eventMutex.withLock {
            assertThat(singletonClient.deletes).containsExactly(null)
        }
        expiredEntityClient.eventMutex.withLock {
            assertThat(expiredEntityClient.deletes).containsExactly(null)
        }
        entityClient.eventMutex.withLock {
            assertThat(entityClient.deletes).isEmpty()
        }

        // Change the singleton to point to the non expired entity.
        singleton = singleton.copy(
            value = ReferenceWithVersion(
                Reference("entity", backingKey, VersionMap("ref" to 1)),
                VersionMap("actor" to 2)
            ),
            databaseVersion = FIRST_VERSION_NUMBER+1
        )
        database.insertOrUpdate(singletonKey, singleton)

        database.removeExpiredEntities()

        // Nothing should change.
        assertThat(database.getSingleton(singletonKey, schema)).isEqualTo(singleton)
        assertThat(database.getEntity(expiredEntityKey, schema)).isEqualTo(nullEntity)
        assertThat(database.getEntity(entityKey, schema)).isEqualTo(entity)
    }

    @Test
    fun removeExpiredEntities_twoEntitiesExpired() = runBlockingTest {
        val schema = newSchema(
            "hash",
            SchemaFields(
                singletons = mapOf("text" to FieldType.Text),
                collections = mapOf("nums" to FieldType.Number)
            )
        )
        val collectionKey = DummyStorageKey("collection")
        val backingKey = DummyStorageKey("backing")
        val entity1Key = DummyStorageKey("backing/entity1")
        val entity2Key = DummyStorageKey("backing/entity2")

        val timeInPast = JvmTime.currentTimeMillis - 10000
        val entity1 = DatabaseData.Entity(
            RawEntity(
                "entity1",
                mapOf("text" to "abc".toReferencable()),
                mapOf("nums" to setOf(123.0.toReferencable(), 456.0.toReferencable())),
                11L,
                timeInPast // expirationTimestamp, in the past.
            ),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )
        val entity2 = DatabaseData.Entity(
            RawEntity(
                "entity2",
                mapOf("text" to "def".toReferencable()),
                mapOf("nums" to setOf(123.0.toReferencable(), 789.0.toReferencable())),
                11L,
                timeInPast // expirationTimestamp, in the past.
            ),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )
        // Add both of them to a collection.
        val values = setOf(
            ReferenceWithVersion(
                Reference("entity1", backingKey, VersionMap("ref1" to 1)),
                VersionMap("actor" to 1)
            ),
            ReferenceWithVersion(
                Reference("entity2", backingKey, VersionMap("ref2" to 2)),
                VersionMap("actor" to 2)
            )
        )
        val collection = DatabaseData.Collection(
            values = values,
            schema = schema,
            databaseVersion = FIRST_VERSION_NUMBER,
            versionMap = VERSION_MAP
        )

        database.insertOrUpdate(entity1Key, entity1)
        database.insertOrUpdate(entity2Key, entity2)
        database.insertOrUpdate(collectionKey, collection)

        database.removeExpiredEntities()

        // Check the expired entities fields have been cleared (only a tombstone is left).
        assertThat(database.getEntity(entity1Key, schema))
            .isEqualTo(DatabaseData.Entity(
                RawEntity(
                    "entity1",
                    mapOf("text" to null),
                    mapOf("nums" to emptySet()),
                    11L,
                    timeInPast
                ),
                schema,
                FIRST_VERSION_NUMBER,
                VERSION_MAP
            ))
        assertThat(database.getEntity(entity2Key, schema))
            .isEqualTo(DatabaseData.Entity(
                RawEntity(
                    "entity2",
                    mapOf("text" to null),
                    mapOf("nums" to emptySet()),
                    11L,
                    timeInPast
                ),
                schema,
                FIRST_VERSION_NUMBER,
                VERSION_MAP
            ))

        // Check the collection is empty.
        assertThat(database.getCollection(collectionKey, schema))
            .isEqualTo(collection.copy(values = setOf()))

        // Check unused values have been deleted from the global table as well.
        assertTableIsEmpty("field_values")

        // Check collection entries have been cleared.
        assertTableIsEmpty("collection_entries")

        // Check the collections for nums are gone (the collection left is the entity collection).
        assertTableIsSize("collections", 1)

        // Check the entity refs are gone.
        assertTableIsEmpty("entity_refs")

        // Check unused primitive values have been removed.
        assertTableIsEmpty("text_primitive_values")
        assertTableIsEmpty("number_primitive_values")
    }

    @Test
    fun removeExpiredReference() = runBlockingTest {
        val schema = newSchema(
            "hash",
            SchemaFields(singletons = mapOf("text" to FieldType.Text), collections = mapOf())
        )
        val collectionKey = DummyStorageKey("collection")
        val backingKey = DummyStorageKey("backing")
        val entityKey = DummyStorageKey("backing/entity")
        val entity2Key = DummyStorageKey("backing/entity2")

        val entity = DatabaseData.Entity(
            RawEntity(
                "entity",
                mapOf("text" to "abc".toReferencable()),
                mapOf(),
                11L,
                JvmTime.currentTimeMillis + 10000 // expirationTimestamp, in the future.
            ),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )
        val entity2 = DatabaseData.Entity(
            RawEntity(
                "entity2",
                mapOf("text" to "abc".toReferencable()),
                mapOf(),
                11L,
                JvmTime.currentTimeMillis + 10000 // expirationTimestamp, in the future.
            ),
            schema,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )
        val timeInPast = JvmTime.currentTimeMillis - 10000
        val expiredRef = ReferenceWithVersion(
            Reference("entity", backingKey, VersionMap("ref" to 1), 11L, timeInPast),
            VersionMap("actor" to 1)
        )
        val okRef = ReferenceWithVersion(
            Reference("entity2", backingKey, VersionMap("ref" to 1), 12L),
            VersionMap("actor" to 2)
        ) // no expiration
        val collection = DatabaseData.Collection(
            values = setOf(expiredRef, okRef),
            schema = schema,
            databaseVersion = FIRST_VERSION_NUMBER,
            versionMap = VERSION_MAP
        )
        database.insertOrUpdate(entityKey, entity)
        database.insertOrUpdate(entity2Key, entity2)
        database.insertOrUpdate(collectionKey, collection)

        // Add client to verify updates.
        val collectionClient = FakeDatabaseClient(collectionKey)
        database.addClient(collectionClient)

        database.removeExpiredEntities()

        // Check the entity itself has not been modified.
        assertThat(database.getEntity(entityKey, schema)).isEqualTo(entity)
        assertThat(database.getEntity(entity2Key, schema)).isEqualTo(entity2)

        // Check the collection only contain the non-expired reference.
        assertThat(database.getCollection(collectionKey, schema))
            .isEqualTo(collection.copy(values = setOf(okRef)))

        // Check the expired entity ref is gone.
        assertThat(readEntityRefsEntityId()).containsExactly("entity2")

        // Check the corresponding collection entry is gone.
        assertTableIsSize("collection_entries", 1)

        // Check the client was notified.
        collectionClient.eventMutex.withLock {
            assertThat(collectionClient.deletes).containsExactly(null)
        }
    }

    @Test
    fun delete_entity_getsRemoved() = runBlockingTest {
        val entityKey = DummyStorageKey("entity")
        database.insertOrUpdateEntity(entityKey, EMPTY_ENTITY)

        database.delete(entityKey)

        assertTableIsEmpty("storage_keys")
        assertTableIsEmpty("entities")
        assertTableIsEmpty("field_values")
        assertThat(database.getEntity(entityKey, EMPTY_SCHEMA)).isNull()
    }

    @Test
    fun delete_entityWithCollectionFields_getsRemoved() = runBlockingTest {
        val entity = DatabaseData.Entity(
            RawEntity(
                "entity",
                mapOf("text" to "def".toReferencable()),
                mapOf("nums" to setOf(123.0.toReferencable(), 789.0.toReferencable()))
            ),
            newSchema(
                "hash",
                SchemaFields(
                    singletons = mapOf("text" to FieldType.Text),
                    collections = mapOf("nums" to FieldType.Number)
                )
            ),
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )
        val entityKey = DummyStorageKey("entity")
        database.insertOrUpdateEntity(entityKey, entity)

        database.delete(entityKey)

        assertTableIsEmpty("storage_keys")
        assertTableIsEmpty("entities")
        assertTableIsEmpty("field_values")
        assertTableIsEmpty("collections")
        assertTableIsEmpty("collection_entries")
        assertThat(database.getEntity(entityKey, EMPTY_SCHEMA)).isNull()
    }

    @Test
    fun delete_entity_otherEntitiesUnaffected() = runBlockingTest {
        val keyToKeep = DummyStorageKey("key-to-keep")
        val keyToDelete = DummyStorageKey("key-to-delete")
        database.insertOrUpdateEntity(keyToKeep, EMPTY_ENTITY)
        database.insertOrUpdateEntity(keyToDelete, EMPTY_ENTITY)

        database.delete(keyToDelete)

        assertThat(database.getEntity(keyToKeep, EMPTY_SCHEMA)).isEqualTo(EMPTY_ENTITY)
        assertThat(database.getEntity(keyToDelete, EMPTY_SCHEMA)).isNull()
    }

    @Test
    fun delete_collection_getsRemoved() = runBlockingTest {
        val collectionKey = DummyStorageKey("collection")
        val backingKey = DummyStorageKey("backing")
        val schema = newSchema("hash")
        val collection = DatabaseData.Collection(
            values = setOf(ReferenceWithVersion(
                Reference("ref1", backingKey, VersionMap("ref1" to 1)),
                VersionMap("actor" to 1)
            )),
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
            values = setOf(ReferenceWithVersion(
                Reference("ref1", backingKey, VersionMap("ref1" to 1)),
                VersionMap("actor" to 1)
            )),
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
            value = ReferenceWithVersion(
                Reference("ref1", backingKey, VersionMap("ref1" to 1)),
                VersionMap("actor" to 1)
            ),
            schema = schema,
            databaseVersion = 1,
            versionMap = VERSION_MAP
        )
        database.insertOrUpdateSingleton(singletonKey, singleton)

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
        val reference = ReferenceWithVersion(
            Reference("ref1", backingKey, VersionMap("ref1" to 1)),
            VersionMap("actor" to 1)
        )
        val singleton = DatabaseData.Singleton(reference, schema, 1, VERSION_MAP)
        database.insertOrUpdateSingleton(keyToKeep, singleton)
        database.insertOrUpdateSingleton(keyToDelete, singleton)

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

        val reference = ReferenceWithVersion(
            Reference("ref1", backingKey, VersionMap("ref1" to 1)),
            VersionMap("actor" to 1)
        )
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

        val reference = ReferenceWithVersion(
            Reference("ref1", backingKey, VersionMap("ref1" to 1)),
            VersionMap("actor" to 1)
        )
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

    @Test
    fun canAddAndRemoveClientsDuringClientCallback() = runBlockingTest {
        val otherClient = FakeDatabaseClient(STORAGE_KEY)
        val testClient = object : DatabaseClient {
            override val storageKey = STORAGE_KEY
            var updateWasCalled = false
            var deleteWasCalled = false
            var extraClientId: Int? = null

            override suspend fun onDatabaseUpdate(
                data: DatabaseData,
                version: Int,
                originatingClientId: Int?
            ) {
                updateWasCalled = true
                extraClientId = database.addClient(otherClient)
            }

            override suspend fun onDatabaseDelete(originatingClientId: Int?) {
                deleteWasCalled = true
                database.removeClient(extraClientId!!)
            }
        }

        // Add a bunch of fake clients before and after the one we're testing.
        repeat(5) { database.addClient(FakeDatabaseClient(STORAGE_KEY)) }
        database.addClient(testClient)
        repeat(5) { database.addClient(FakeDatabaseClient(STORAGE_KEY)) }

        // Issue an update and check it worked.
        database.insertOrUpdate(STORAGE_KEY, EMPTY_ENTITY)
        assertThat(testClient.updateWasCalled).isTrue()
        assertThat(testClient.extraClientId).isNotNull()

        // Issue a delete and check it worked.
        database.delete(STORAGE_KEY, originatingClientId = null)
        assertThat(testClient.deleteWasCalled).isTrue()
    }

    /** Returns a list of all the rows in the 'fields' table. */
    private fun readFieldsTable() =
        database.readableDatabase.rawQuery("SELECT * FROM fields", emptyArray()).map(::FieldRow)

    private fun readTextPrimitiveValues(): Set<String> =
        database.readableDatabase.rawQuery("SELECT value FROM text_primitive_values", emptyArray())
            .map { it.getString(0) }
            .toSet()

    private fun readNumberPrimitiveValues(): Set<Double> =
        database.readableDatabase.rawQuery("SELECT value FROM number_primitive_values", emptyArray())
            .map { it.getDouble(0) }
            .toSet()

    private fun readEntityRefsEntityId(): Set<String> =
        database.readableDatabase.rawQuery("SELECT entity_id FROM entity_refs", emptyArray())
            .map { it.getString(0) }
            .toSet()

    private fun assertTableIsSize(tableName: String, size: Int) {
        database.readableDatabase.rawQuery("SELECT * FROM $tableName", arrayOf()).use {
            assertWithMessage("Expected table $tableName to be of size ${size}, but found ${it.count} rows.")
                .that(it.count)
                .isEqualTo(size)
        }
    }

    private fun readOrphanField(entityStorageKey: StorageKey): Boolean =
        database.readableDatabase.rawQuery(
            """
                SELECT orphan
                FROM entities
                LEFT JOIN storage_keys ON entities.storage_key_id = storage_keys.id
                WHERE storage_key = ?
            """.trimIndent(),
            arrayOf(entityStorageKey.toString())
        ).forSingleResult { it.getNullableBoolean(0) } ?: false

    private fun assertTableIsEmpty(tableName: String) {
        assertTableIsSize(tableName, 0)
    }

    companion object {
        /** The first free Type ID after all primitive types have been assigned. */
        private const val FIRST_ENTITY_TYPE_ID = DatabaseImpl.REFERENCE_TYPE_SENTINEL + 1

        private const val FIRST_VERSION_NUMBER = 1
        private val VERSION_MAP = VersionMap("first" to 1, "second" to 2)

        private val TEXT_TYPE_ID = PrimitiveType.Text.ordinal.toLong()
        private val BOOLEAN_TYPE_ID = PrimitiveType.Boolean.ordinal.toLong()
        private val NUMBER_TYPE_ID = PrimitiveType.Number.ordinal.toLong()

        private val CREATION_TIMESTAMP = 99L
        private val EXPIRATION_TIMESTAMP = 999L

        private val STORAGE_KEY = DummyStorageKey("key")
        private val EMPTY_SCHEMA = newSchema("empty")
        private val EMPTY_RAW_ENTITY = RawEntity("empty-entity", emptyMap(), emptyMap())
        private val EMPTY_ENTITY = DatabaseData.Entity(
            EMPTY_RAW_ENTITY,
            EMPTY_SCHEMA,
            FIRST_VERSION_NUMBER,
            VERSION_MAP
        )
    }
}

private fun newSchema(
    hash: String,
    fields: SchemaFields = SchemaFields(emptyMap(), emptyMap())
) = Schema(
    names = emptySet(),
    fields = fields,
    hash = hash
).also { SchemaRegistry.register(it) }

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
