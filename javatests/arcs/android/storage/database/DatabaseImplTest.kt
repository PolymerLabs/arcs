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
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.common.map
import arcs.core.data.Entity
import arcs.core.data.FieldType
import arcs.core.data.PrimitiveType
import arcs.core.data.Schema
import arcs.core.data.SchemaDescription
import arcs.core.data.SchemaFields
import arcs.core.storage.StorageKey
import arcs.core.testutil.assertSuspendingThrows
import arcs.core.testutil.assertThrows
import com.google.common.truth.Truth.assertThat
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

    @Before
    fun setUp() {
        database = DatabaseImpl(ApplicationProvider.getApplicationContext(), "test.sqlite3")
    }

    @After
    fun tearDown() {
        database.reset()
        database.close()
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

        assertThat(database.getSchemaTypeId(schema)).isEqualTo(FIRST_ENTITY_TYPE_ID)

        // Repeating should give the same result.
        assertThat(database.getSchemaTypeId(schema)).isEqualTo(FIRST_ENTITY_TYPE_ID)

        assertThat(database.getTypeId(FieldType.EntityRef("abc")))
            .isEqualTo(FIRST_ENTITY_TYPE_ID)
    }

    @Test
    fun getSchemaTypeId_multipleNewSchemas() = runBlockingTest {
        val schema1 = newSchema("first")
        val schema2 = newSchema("second")
        val expectedTypeId1 = FIRST_ENTITY_TYPE_ID
        val expectedTypeId2 = FIRST_ENTITY_TYPE_ID + 1

        assertThat(database.getSchemaTypeId(schema1)).isEqualTo(expectedTypeId1)
        assertThat(database.getTypeId(FieldType.EntityRef("first")))
            .isEqualTo(expectedTypeId1)

        assertThat(database.getSchemaTypeId(schema2)).isEqualTo(expectedTypeId2)
        assertThat(database.getTypeId(FieldType.EntityRef("second")))
            .isEqualTo(expectedTypeId2)
    }

    @Test
    fun getSchemaTypeId_withPrimitiveFields() = runBlockingTest {
        val schema = newSchema("abc", SchemaFields(
            singletons = mapOf("text" to FieldType.Text, "bool" to FieldType.Boolean),
            collections = mapOf("num" to FieldType.Number)
        ))

        val typeId = database.getSchemaTypeId(schema)

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
        val schemaTypeId1 = database.getSchemaTypeId(schema1)

        // Creates new IDs for each field.
        val fields1 = database.getSchemaFields(schemaTypeId1)
        assertThat(fields1).containsExactly(
            "text", DatabaseImpl.SchemaField("text", 1L, TEXT_TYPE_ID),
            "bool", DatabaseImpl.SchemaField("bool", 2L, BOOLEAN_TYPE_ID),
            "num", DatabaseImpl.SchemaField("num", 3L, NUMBER_TYPE_ID)
        )

        // Re-running with the same schema doesn't create new field IDs
        assertThat(database.getSchemaFields(schemaTypeId1)).isEqualTo(fields1)

        // Running on a different schema creates new field IDs.
        val schema2 = schema1.copy(hash = "xyz")
        val schemaTypeId2 = database.getSchemaTypeId(schema2)
        val fields2 = database.getSchemaFields(schemaTypeId2)
        assertThat(fields2).containsExactly(
            "text", DatabaseImpl.SchemaField("text", 4L, TEXT_TYPE_ID),
            "bool", DatabaseImpl.SchemaField("bool", 5L, BOOLEAN_TYPE_ID),
            "num", DatabaseImpl.SchemaField("num", 6L, NUMBER_TYPE_ID)
        )
    }

    @Test
    fun getSchemaFieldIds_emptySchema() = runBlockingTest {
        val schema = newSchema("abc")
        val schemaTypeId = database.getSchemaTypeId(schema)
        assertThat(database.getSchemaFields(schemaTypeId)).isEmpty()
    }

    @Test
    fun getSchemaFieldIds_unknownSchemaId() = runBlockingTest {
        val fieldIds = database.getSchemaFields(987654L)
        assertThat(fieldIds).isEmpty()
    }

    @Test
    fun getStorageKeyId_newKeys() = runBlockingTest {
        assertThat(database.getStorageKeyId(DummyKey("key1"))).isEqualTo(1L)
        assertThat(database.getStorageKeyId(DummyKey("key2"))).isEqualTo(2L)
        assertThat(database.getStorageKeyId(DummyKey("key3"))).isEqualTo(3L)
    }

    @Test
    fun getStorageKeyId_existingKey() = runBlockingTest {
        assertThat(database.getStorageKeyId(DummyKey("key"))).isEqualTo(1L)
        assertThat(database.getStorageKeyId(DummyKey("key"))).isEqualTo(1L)
    }

    @Test
    fun getPrimitiveValue_boolean() = runBlockingTest {
        // Test value -> ID.
        assertThat(database.getPrimitiveValueId(true, BOOLEAN_TYPE_ID)).isEqualTo(1)
        assertThat(database.getPrimitiveValueId(false, BOOLEAN_TYPE_ID)).isEqualTo(0)

        val exception1 = assertThrows(IllegalArgumentException::class) {
            database.getPrimitiveValueId("not a bool", BOOLEAN_TYPE_ID)
        }
        assertThat(exception1).hasMessageThat().isEqualTo("Expected value to be a Boolean.")

        // Test ID -> value.
        assertThat(database.getPrimitiveValue(1, BOOLEAN_TYPE_ID)).isEqualTo(true)
        assertThat(database.getPrimitiveValue(0, BOOLEAN_TYPE_ID)).isEqualTo(false)

        val exception2 = assertThrows(IllegalArgumentException::class) {
            database.getPrimitiveValue(2, BOOLEAN_TYPE_ID)
        }
        assertThat(exception2).hasMessageThat().isEqualTo("Expected 2 to be a Boolean (0 or 1).")
    }

    @Test
    fun getPrimitiveValue_text() = runBlockingTest {
        // Test value -> ID.
        assertThat(database.getPrimitiveValueId("aaa", TEXT_TYPE_ID)).isEqualTo(1)
        assertThat(database.getPrimitiveValueId("bbb", TEXT_TYPE_ID)).isEqualTo(2)
        assertThat(database.getPrimitiveValueId("ccc", TEXT_TYPE_ID)).isEqualTo(3)
        assertThat(database.getPrimitiveValueId("aaa", TEXT_TYPE_ID)).isEqualTo(1)

        val exception1 = assertThrows(IllegalArgumentException::class) {
            database.getPrimitiveValueId(123.0, TEXT_TYPE_ID)
        }
        assertThat(exception1).hasMessageThat().isEqualTo("Expected value to be a String.")

        // Test ID -> value.
        assertThat(database.getPrimitiveValue(1, TEXT_TYPE_ID)).isEqualTo("aaa")
        assertThat(database.getPrimitiveValue(2, TEXT_TYPE_ID)).isEqualTo("bbb")
        assertThat(database.getPrimitiveValue(3, TEXT_TYPE_ID)).isEqualTo("ccc")

        val exception2 = assertThrows(IllegalArgumentException::class) {
            database.getPrimitiveValue(4, TEXT_TYPE_ID)
        }
        assertThat(exception2).hasMessageThat().isEqualTo("Unknown primitive with ID 4.")
    }

    @Test
    fun getPrimitiveValue_number() = runBlockingTest {
        // Test value -> ID.
        assertThat(database.getPrimitiveValueId(111.0, NUMBER_TYPE_ID)).isEqualTo(1)
        assertThat(database.getPrimitiveValueId(222.0, NUMBER_TYPE_ID)).isEqualTo(2)
        assertThat(database.getPrimitiveValueId(333.0, NUMBER_TYPE_ID)).isEqualTo(3)
        assertThat(database.getPrimitiveValueId(111.0, NUMBER_TYPE_ID)).isEqualTo(1)

        val exception1 = assertThrows(IllegalArgumentException::class) {
            database.getPrimitiveValueId("not a number", NUMBER_TYPE_ID)
        }
        assertThat(exception1).hasMessageThat().isEqualTo("Expected value to be a Double.")

        // Test ID -> value.
        assertThat(database.getPrimitiveValue(1, NUMBER_TYPE_ID)).isEqualTo(111.0)
        assertThat(database.getPrimitiveValue(2, NUMBER_TYPE_ID)).isEqualTo(222.0)
        assertThat(database.getPrimitiveValue(3, NUMBER_TYPE_ID)).isEqualTo(333.0)

        val exception2 = assertThrows(IllegalArgumentException::class) {
            database.getPrimitiveValue(4, NUMBER_TYPE_ID)
        }
        assertThat(exception2).hasMessageThat().isEqualTo("Unknown primitive with ID 4.")
    }

    @Test
    fun getPrimitiveValue_unknownTypeId() = runBlockingTest {
        // Test value -> ID.
        val exception1 = assertThrows(IllegalArgumentException::class) {
            database.getPrimitiveValueId("aaa", 987654L)
        }
        assertThat(exception1).hasMessageThat().isEqualTo("Not a primitive type ID: 987654")

        // Test ID -> value.
        val exception2 = assertThrows(IllegalArgumentException::class) {
            database.getPrimitiveValue(1, 987654L)
        }
        assertThat(exception2).hasMessageThat().isEqualTo("Not a primitive type ID: 987654")
    }

    @Test
    fun insertAndGet_entity_newEmptyEntity() = runBlockingTest {
        val key = DummyKey("key")
        val schema = newSchema("hash")
        val entity = Entity("entity", schema, mutableMapOf())

        database.insertOrUpdate(key, entity)
        val entityOut = database.getEntity(key, schema).entity

        assertThat(entityOut).isEqualTo(entity)
    }

    @Test
    fun insertAndGet_entity_newEntityWithPrimitiveFields() = runBlockingTest {
        val key = DummyKey("key")
        val schema = newSchema("hash", SchemaFields(
            singletons = mapOf(
                "text" to FieldType.Text,
                "bool" to FieldType.Boolean,
                "num" to FieldType.Number
            ),
            collections = emptyMap()
        ))
        val entity = Entity(
            "entity",
            schema,
            mutableMapOf(
                "text" to "abc",
                "bool" to true,
                "num" to 123.0
            )
        )

        database.insertOrUpdate(key, entity)
        val entityOut = database.getEntity(key, schema).entity

        assertThat(entityOut).isEqualTo(entity)
    }

    @Test
    fun get_entity_unknownStorageKey() = runBlockingTest {
        val exception = assertThrows(IllegalArgumentException::class) {
            database.getEntity(DummyKey("nope"), newSchema("hash"))
        }
        assertThat(exception).hasMessageThat().isEqualTo(
            "Entity at storage key nope://nope does not exist."
        )
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

private class DummyKey(val key: String) : StorageKey(key) {
    override fun toKeyString(): String = key
    override fun childKeyWithComponent(component: String): StorageKey = this
}
