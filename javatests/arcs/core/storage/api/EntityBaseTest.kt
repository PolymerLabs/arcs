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

package arcs.core.storage.api

import arcs.core.common.Id
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.testutil.assertThrows
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@Suppress("UNCHECKED_CAST")
class EntityBaseTest {
    private lateinit var entity: EntityBaseForTest

    @Before
    fun setUp() {
        entity = EntityBaseForTest()
    }

    @Test
    fun singletonFields_boolean() {
        assertThat(entity.bool).isNull()
        entity.bool = true
        assertThat(entity.bool).isTrue()

        val e = assertThrows(IllegalArgumentException::class) {
            entity.setSingletonValueForTest("bool", 1.0)
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Expected Boolean for MyEntity.bool, but received 1.0."
        )
    }

    @Test
    fun singletonFields_number() {
        assertThat(entity.num).isNull()
        entity.num = 12.0
        assertThat(entity.num).isEqualTo(12.0)

        val e = assertThrows(IllegalArgumentException::class) {
            entity.setSingletonValueForTest("num", "abc")
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Expected Double for MyEntity.num, but received abc."
        )
    }

    @Test
    fun singletonFields_text() {
        assertThat(entity.text).isNull()
        entity.text = "abc"
        assertThat(entity.text).isEqualTo("abc")

        val e = assertThrows(IllegalArgumentException::class) {
            entity.setSingletonValueForTest("text", true)
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Expected String for MyEntity.text, but received true."
        )
    }

    @Test
    fun singletonFields_getInvalidFieldName() {
        val e = assertThrows(InvalidFieldNameException::class) {
            entity.getSingletonValueForTest("not_a_real_field")
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "MyEntity does not have a singleton field called \"not_a_real_field\"."
        )
    }

    @Test
    fun singletonFields_setInvalidFieldName() {
        val e = assertThrows(InvalidFieldNameException::class) {
            entity.setSingletonValueForTest("not_a_real_field", "x")
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "MyEntity does not have a singleton field called \"not_a_real_field\"."
        )
    }

    @Test
    fun collectionFields_boolean() {
        assertThat(entity.bools).isEmpty()
        entity.bools = setOf(true)
        assertThat(entity.bools).containsExactly(true)

        val e = assertThrows(IllegalArgumentException::class) {
            entity.setCollectionValueForTest("bools", setOf(true, 1.0))
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Expected Boolean for MyEntity.bools, but received 1.0."
        )
    }

    @Test
    fun collectionFields_number() {
        assertThat(entity.nums).isEmpty()
        entity.nums = setOf(1.0, 2.0)
        assertThat(entity.nums).containsExactly(1.0, 2.0)

        val e = assertThrows(IllegalArgumentException::class) {
            entity.setCollectionValueForTest("nums", setOf(1.0, "abc"))
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Expected Double for MyEntity.nums, but received abc."
        )
    }

    @Test
    fun collectionFields_text() {
        assertThat(entity.texts).isEmpty()
        entity.texts = setOf("a", "b")
        assertThat(entity.texts).containsExactly("a", "b")

        val e = assertThrows(IllegalArgumentException::class) {
            entity.setCollectionValueForTest("texts", setOf("a", true))
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Expected String for MyEntity.texts, but received true."
        )
    }

    @Test
    fun collectionFields_getInvalidFieldName() {
        val e = assertThrows(InvalidFieldNameException::class) {
            entity.getCollectionValueForTest("not_a_real_field")
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "MyEntity does not have a collection field called \"not_a_real_field\"."
        )
    }

    @Test
    fun collectionFields_setInvalidFieldName() {
        val e = assertThrows(InvalidFieldNameException::class) {
            entity.setCollectionValueForTest("not_a_real_field", setOf("x"))
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "MyEntity does not have a collection field called \"not_a_real_field\"."
        )
    }

    @Test
    fun serializeRoundTrip() {
        with (entity) {
            text = "abc"
            num = 12.0
            bool = true
            texts = setOf("aa", "bb")
            nums = setOf(1.0, 2.0)
            bools = setOf(true, false)
        }

        val rawEntity = entity.serialize()
        val deserialized = EntityBaseForTest()
        deserialized.deserializeForTest(rawEntity)

        assertThat(deserialized).isEqualTo(entity)
        assertThat(deserialized.serialize()).isEqualTo(rawEntity)
    }

    @Test
    fun equality() {
        val entity1 = EntityBase(ENTITY_CLASS_NAME, SCHEMA)
        val entity2 = EntityBase(ENTITY_CLASS_NAME, SCHEMA)
        assertThat(entity1).isEqualTo(entity1)
        assertThat(entity1).isEqualTo(entity2)

        // Different name.
        assertThat(entity1).isNotEqualTo(EntityBase("x", SCHEMA))

        // Different schema.
        assertThat(entity1).isNotEqualTo(
            EntityBase(
                ENTITY_CLASS_NAME,
                Schema(emptyList(), SchemaFields(emptyMap(), emptyMap()), "hash")
            )
        )

        // Different ID.
        entity2.ensureIdentified(Id.Generator.newForTest("session"), "handle")
        assertThat(entity1).isNotEqualTo(entity2)
    }

    @Test
    fun equality_separateSubclassesWithSameDataAreEqual() {
        val entity1 = object : EntityBase("Foo", SCHEMA) {}
        val entity2 = object : EntityBase("Foo", SCHEMA) {}
        assertThat(entity1).isEqualTo(entity2)
    }

    @Test
    fun reset() {
        with (entity) {
            text = "abc"
            num = 12.0
            bool = true
            texts = setOf("aa", "bb")
            nums = setOf(1.0, 2.0)
            bools = setOf(true, false)
        }

        entity.reset()

        assertThat(entity).isEqualTo(EntityBaseForTest())
    }

    @Test
    fun ensureIdentified() {
        // ID starts off null.
        assertThat(entity.entityId).isNull()

        // Calling once generates a new ID.
        entity.ensureIdentified(Id.Generator.newForTest("session1"), "handle2")
        val id = entity.entityId
        assertThat(id).isNotNull()
        assertThat(id).isNotEmpty()

        // Calling again doesn't change the value.
        entity.ensureIdentified(Id.Generator.newForTest("session2"), "handle2")
        assertThat(entity.entityId).isEqualTo(id)
    }

    /**
     * Subclasses [EntityBase] and makes its protected methods public, so that we can call them
     * in the test. Also adds convenient getters and setters for entity fields, similar to what a
     * code-generated subclass would do.
     */
    private class EntityBaseForTest : EntityBase(ENTITY_CLASS_NAME, SCHEMA) {
        var bool: Boolean?
            get() = getSingletonValue("bool") as Boolean?
            set(value) = setSingletonValue("bool", value)

        var num: Double?
            get() = getSingletonValue("num") as Double?
            set(value) = setSingletonValue("num", value)

        var text: String?
            get() = getSingletonValue("text") as String?
            set(value) = setSingletonValue("text", value)

        var bools: Set<Boolean>
            get() = getCollectionValue("bools") as Set<Boolean>
            set(values) = setCollectionValue("bools", values)

        var nums: Set<Double>
            get() = getCollectionValue("nums") as Set<Double>
            set(values) = setCollectionValue("nums", values)

        var texts: Set<String>
            get() = getCollectionValue("texts") as Set<String>
            set(values) = setCollectionValue("texts", values)

        fun getSingletonValueForTest(field: String) = super.getSingletonValue(field)

        fun getCollectionValueForTest(field: String) = super.getCollectionValue(field)

        fun setSingletonValueForTest(field: String, value: Any?) =
            super.setSingletonValue(field, value)

        fun setCollectionValueForTest(field: String, values: Set<Any>) =
            super.setCollectionValue(field, values)

        fun deserializeForTest(rawEntity: RawEntity) = super.deserialize(rawEntity)
    }

    companion object {
        private const val ENTITY_CLASS_NAME = "MyEntity"

        private val SCHEMA = Schema(
            names = listOf(SchemaName(ENTITY_CLASS_NAME)),
            fields = SchemaFields(
                singletons = mapOf(
                    "text" to FieldType.Text,
                    "num" to FieldType.Number,
                    "bool" to FieldType.Boolean
                ),
                collections = mapOf(
                    "texts" to FieldType.Text,
                    "nums" to FieldType.Number,
                    "bools" to FieldType.Boolean
                )
            ),
            hash = "hash"
        )
    }
}
