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
import arcs.core.data.FieldType
import arcs.core.data.PrimitiveType
import arcs.core.data.Schema
import arcs.core.data.SchemaDescription
import arcs.core.data.SchemaFields
import arcs.core.storage.StorageKey
import arcs.core.testutil.assertSuspendingThrows
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

    /** The first free Type ID after all primitive types have been assigned. */
    private val FIRST_ENTITY_TYPE_ID = 3

    @Before
    fun setUp() {
        database = DatabaseImpl(ApplicationProvider.getApplicationContext(), "test.sqlite3")
    }

    @After
    fun tearDown() {
        database.reset()
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
            FieldRow(1, PrimitiveType.Text.ordinal.toLong(), typeId, "text"),
            FieldRow(2, PrimitiveType.Boolean.ordinal.toLong(), typeId, "bool"),
            FieldRow(3, PrimitiveType.Number.ordinal.toLong(), typeId, "num")
        )
    }

    @Test
    fun getSchemaFieldIds() = runBlockingTest {
        val schema1 = newSchema("abc", SchemaFields(
            singletons = mapOf("text" to FieldType.Text, "bool" to FieldType.Boolean),
            collections = mapOf("num" to FieldType.Number)
        ))
        val schemaTypeId1 = database.getSchemaTypeId(schema1)

        // Creates new IDs for each field.
        val fieldIds1 = database.getSchemaFieldIds(schemaTypeId1)
        assertThat(fieldIds1).containsExactly(
            "text", 1L,
            "bool", 2L,
            "num", 3L
        )

        // Re-running with the same schema doesn't create new field IDs
        assertThat(database.getSchemaFieldIds(schemaTypeId1)).isEqualTo(fieldIds1)

        // Running on a different schema creates new field IDs.
        val schema2 = schema1.copy(hash = "xyz")
        val schemaTypeId2 = database.getSchemaTypeId(schema2)
        val fieldIds2 = database.getSchemaFieldIds(schemaTypeId2)
        assertThat(fieldIds2).containsExactly(
            "text", 4L,
            "bool", 5L,
            "num", 6L
        )
    }

    @Test
    fun getSchemaFieldIds_emptySchema() = runBlockingTest {
        val schema = newSchema("abc")
        val schemaTypeId = database.getSchemaTypeId(schema)
        assertThat(database.getSchemaFieldIds(schemaTypeId)).isEmpty()
    }

    @Test
    fun getSchemaFieldIds_unknownSchemaId() = runBlockingTest {
        val fieldIds = database.getSchemaFieldIds(987654L)
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
