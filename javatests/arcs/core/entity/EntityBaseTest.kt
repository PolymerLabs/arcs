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

package arcs.core.entity

import arcs.core.common.Id
import arcs.core.crdt.VersionMap
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.Ttl
import arcs.core.data.util.toReferencable
import arcs.core.storage.testutil.DummyStorageKey
import arcs.core.storage.Reference as StorageReference
import arcs.core.testutil.assertThrows
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@Suppress("UNCHECKED_CAST")
class EntityBaseTest {
    private lateinit var entity: DummyEntity

    @Before
    fun setUp() {
        SchemaRegistry.register(DummyEntity.SCHEMA)
        entity = DummyEntity()
    }

    @After
    fun tearDown() {
        SchemaRegistry.clearForTest()
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
            "Expected Boolean for DummyEntity.bool, but received 1.0."
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
            "Expected Double for DummyEntity.num, but received abc."
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
            "Expected String for DummyEntity.text, but received true."
        )
    }

    @Test
    fun singletonFields_ref() {
        assertThat(entity.ref).isNull()
        val ref = createReference("foo")
        entity.ref = ref
        assertThat(entity.ref).isEqualTo(ref)

        val e = assertThrows(IllegalArgumentException::class) {
            entity.setSingletonValueForTest("ref", true)
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Expected Reference for DummyEntity.ref, but received true."
        )
    }

    @Test
    fun singletonFields_getInvalidFieldName() {
        val e = assertThrows(InvalidFieldNameException::class) {
            entity.getSingletonValueForTest("not_a_real_field")
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "DummyEntity does not have a singleton field called \"not_a_real_field\"."
        )
    }

    @Test
    fun singletonFields_setInvalidFieldName() {
        val e = assertThrows(InvalidFieldNameException::class) {
            entity.setSingletonValueForTest("not_a_real_field", "x")
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "DummyEntity does not have a singleton field called \"not_a_real_field\"."
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
            "Expected Boolean for DummyEntity.bools, but received 1.0."
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
            "Expected Double for DummyEntity.nums, but received abc."
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
            "Expected String for DummyEntity.texts, but received true."
        )
    }

    @Test
    fun collectionFields_ref() {
        assertThat(entity.refs).isEmpty()
        val ref1 = createReference("ref1")
        val ref2 = createReference("ref2")
        entity.refs = setOf(ref1, ref2)
        assertThat(entity.refs).containsExactly(ref1, ref2)

        val e = assertThrows(IllegalArgumentException::class) {
            entity.setCollectionValueForTest("refs", setOf(ref1, "a"))
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Expected Reference for DummyEntity.refs, but received a."
        )
    }

    @Test
    fun collectionFields_getInvalidFieldName() {
        val e = assertThrows(InvalidFieldNameException::class) {
            entity.getCollectionValueForTest("not_a_real_field")
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "DummyEntity does not have a collection field called \"not_a_real_field\"."
        )
    }

    @Test
    fun collectionFields_setInvalidFieldName() {
        val e = assertThrows(InvalidFieldNameException::class) {
            entity.setCollectionValueForTest("not_a_real_field", setOf("x"))
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "DummyEntity does not have a collection field called \"not_a_real_field\"."
        )
    }

    @Test
    fun serializeRoundTrip() {
        with (entity) {
            text = "abc"
            num = 12.0
            bool = true
            ref = createReference("foo")
            texts = setOf("aa", "bb")
            nums = setOf(1.0, 2.0)
            bools = setOf(true, false)
            refs = setOf(createReference("ref1"), createReference("ref2"))
        }

        val rawEntity = entity.serialize()
        val deserialized = DummyEntity()
        deserialized.deserializeForTest(rawEntity)

        assertThat(deserialized).isEqualTo(entity)
        assertThat(deserialized.serialize()).isEqualTo(rawEntity)
    }

    @Test
    fun deserialize_typeSlicing() {
        val rawEntity = RawEntity(
            singletons = mapOf(
                "text" to "abc".toReferencable(),
                "some-other-singleton-field" to "def".toReferencable()
            ),
            collections = mapOf(
                "nums" to setOf(11.0.toReferencable(), 22.0.toReferencable()),
                "some-other-collection-field" to setOf(33.0.toReferencable(), 44.0.toReferencable())
            )
        )
        val deserialized = DummyEntity()

        deserialized.deserializeForTest(rawEntity)

        val expected = DummyEntity().apply {
            text = "abc"
            nums = setOf(11.0, 22.0)
        }
        assertThat(deserialized).isEqualTo(expected)
    }

    @Test
    fun deserialize_wrongType() {
        val rawEntity = RawEntity(
            singletons = mapOf(
                "ref" to "def".toReferencable()
            ),
            collections = mapOf()
        )

        val e = assertThrows(IllegalArgumentException::class) {
            DummyEntity().deserializeForTest(rawEntity)
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Expected Reference but was Primitive(def)."
        )
    }

    @Test
    fun deserialize_unknownHash() {
        val rawEntity = RawEntity(
            singletons = mapOf(
                "ref" to StorageReference("id", DummyStorageKey("key"), version = null)
            ),
            collections = mapOf()
        )

        val e = assertThrows(IllegalArgumentException::class) {
            // Call deserialize super method, and don't give the right nestedEntitySpecs map.
            DummyEntity().deserialize(rawEntity, nestedEntitySpecs = emptyMap())
        }
        assertThat(e).hasMessageThat().isEqualTo(
            "Unknown schema with hash abcdef."
        )
    }

    @Test
    fun equality() {
        val entity1 = EntityBase("Foo", DummyEntity.SCHEMA)
        val entity2 = EntityBase("Foo", DummyEntity.SCHEMA)
        assertThat(entity1).isEqualTo(entity1)
        assertThat(entity1).isEqualTo(entity2)

        // Different name.
        assertThat(entity1).isNotEqualTo(EntityBase("Bar", DummyEntity.SCHEMA))

        // Different schema.
        assertThat(entity1).isNotEqualTo(
            EntityBase(
                "Foo",
                Schema(emptySet(), SchemaFields(emptyMap(), emptyMap()), "hash")
            )
        )

        // Different ID.
        entity2.ensureEntityFields(Id.Generator.newForTest("session"), "handle", FakeTime())
        assertThat(entity1).isNotEqualTo(entity2)
    }

    @Test
    fun equality_separateSubclassesWithSameDataAreEqual() {
        val entity1 = object : EntityBase("Foo", DummyEntity.SCHEMA) {}
        val entity2 = object : EntityBase("Foo", DummyEntity.SCHEMA) {}
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

        assertThat(entity).isEqualTo(DummyEntity())
    }

    @Test
    fun ensureEntityFields() {
        // ID starts off null.
        assertThat(entity.entityId).isNull()

        // Calling once generates a new ID.
        entity.ensureEntityFields(Id.Generator.newForTest("session1"), "handle2", FakeTime(10), Ttl.Minutes(1))
        val id = entity.entityId
        assertThat(id).isNotNull()
        assertThat(id).isNotEmpty()

        val serialized = entity.serialize()
        assertThat(serialized.creationTimestamp).isEqualTo(10)
        assertThat(serialized.expirationTimestamp).isEqualTo(60010)

        // Calling again doesn't change the value.
        entity.ensureEntityFields(Id.Generator.newForTest("session2"), "handle2", FakeTime(20))
        assertThat(entity.entityId).isEqualTo(id)
        assertThat(entity.serialize().creationTimestamp).isEqualTo(10)
    }

    @Test
    fun testToString() {
        with (entity) {
            text = "abc"
            num = 12.0
            bool = true
            texts = setOf("aa", "bb")
            nums = setOf(1.0, 2.0)
            bools = setOf(true, false)
        }
        assertThat(entity.toString()).isEqualTo(
            "DummyEntity(bool = true, bools = [true, false], num = 12.0, nums = [1.0, 2.0], " +
                "ref = null, refs = [], text = abc, texts = [aa, bb])"
        )
    }

    private fun createReference(id: String) = Reference(
        DummyEntity,
        StorageReference(id, DummyStorageKey(id), VersionMap("id" to 1))
    )
}
