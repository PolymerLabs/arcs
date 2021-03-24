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
import arcs.core.data.Capability.Ttl
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaRegistry
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.data.util.toReferencable
import arcs.core.entity.testutil.DummyEntity
import arcs.core.entity.testutil.DummyVariableEntity
import arcs.core.entity.testutil.InlineDummyEntity
import arcs.core.storage.RawReference
import arcs.core.storage.testutil.DummyStorageKey
import arcs.core.util.ArcsDuration
import arcs.core.util.ArcsInstant
import arcs.core.util.BigInt
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
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
    SchemaRegistry.register(InlineDummyEntity.SCHEMA)
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

    val e = assertFailsWith<IllegalArgumentException> {
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

    val e = assertFailsWith<IllegalArgumentException> {
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

    val e = assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("text", true)
    }
    assertThat(e).hasMessageThat().isEqualTo(
      "Expected String for DummyEntity.text, but received true."
    )
  }

  @Test
  fun singletonFields_byte() {
    assertThat(entity.byte).isNull()
    entity.byte = 8
    assertThat(entity.byte).isEqualTo(8)
    assertThat(entity.byte).isInstanceOf(java.lang.Byte::class.java)

    assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("byte", "abc")
    }.also {
      assertThat(it).hasMessageThat().isEqualTo(
        "Expected Byte for DummyEntity.byte, but received abc."
      )
    }
    assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("byte", 12.0)
    }.also {
      assertThat(it).hasMessageThat().isEqualTo(
        "Expected Byte for DummyEntity.byte, but received 12.0."
      )
    }
    assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("byte", 500)
    }.also {
      assertThat(it).hasMessageThat().isEqualTo(
        "Expected Byte for DummyEntity.byte, but received 500."
      )
    }
  }

  @Test
  fun singletonFields_short() {
    assertThat(entity.short).isNull()
    entity.short = 16
    assertThat(entity.short).isEqualTo(16)
    assertThat(entity.short).isInstanceOf(java.lang.Short::class.java)

    assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("short", "abc")
    }.also {
      assertThat(it).hasMessageThat().isEqualTo(
        "Expected Short for DummyEntity.short, but received abc."
      )
    }
    assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("short", 12.0)
    }.also {
      assertThat(it).hasMessageThat().isEqualTo(
        "Expected Short for DummyEntity.short, but received 12.0."
      )
    }
    assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("short", Short.MAX_VALUE + 1)
    }.also {
      assertThat(it).hasMessageThat().isEqualTo(
        "Expected Short for DummyEntity.short, but received ${Short.MAX_VALUE + 1}."
      )
    }
  }

  @Test
  fun singletonFields_int() {
    assertThat(entity.int).isNull()
    entity.int = 16
    assertThat(entity.int).isEqualTo(16)
    assertThat(entity.int).isInstanceOf(java.lang.Integer::class.java)

    assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("int", "abc")
    }.also {
      assertThat(it).hasMessageThat().isEqualTo(
        "Expected Int for DummyEntity.int, but received abc."
      )
    }
    assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("int", 12.0)
    }.also {
      assertThat(it).hasMessageThat().isEqualTo(
        "Expected Int for DummyEntity.int, but received 12.0."
      )
    }
    assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("int", Int.MAX_VALUE + 1L)
    }.also {
      assertThat(it).hasMessageThat().isEqualTo(
        "Expected Int for DummyEntity.int, but received ${Int.MAX_VALUE + 1L}."
      )
    }
  }

  @Test
  fun singletonFields_long() {
    assertThat(entity.long).isNull()
    entity.long = 16L
    assertThat(entity.long).isEqualTo(16L)
    assertThat(entity.long).isInstanceOf(java.lang.Long::class.java)

    assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("long", "abc")
    }.also {
      assertThat(it).hasMessageThat().isEqualTo(
        "Expected Long for DummyEntity.long, but received abc."
      )
    }
    assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("long", 12.0)
    }.also {
      assertThat(it).hasMessageThat().isEqualTo(
        "Expected Long for DummyEntity.long, but received 12.0."
      )
    }
  }

  @Test
  fun singletonFields_instant() {
    val millis = 1600000L
    assertThat(entity.instant).isNull()
    entity.instant = ArcsInstant.ofEpochMilli(millis)
    assertThat(entity.instant).isEqualTo(ArcsInstant.ofEpochMilli(millis))
    assertThat(entity.instant).isInstanceOf(ArcsInstant::class.java)

    assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("instant", "abc")
    }.also {
      assertThat(it).hasMessageThat().isEqualTo(
        "Expected Instant for DummyEntity.instant, but received abc."
      )
    }
  }

  @Test
  fun singletonFields_char() {
    assertThat(entity.char).isNull()
    entity.char = 'b'
    assertThat(entity.char).isEqualTo('b')
    assertThat(entity.char).isInstanceOf(java.lang.Character::class.java)

    assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("char", "abc")
    }.also {
      assertThat(it).hasMessageThat().isEqualTo(
        "Expected Char for DummyEntity.char, but received abc."
      )
    }
    assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("char", false)
    }.also {
      assertThat(it).hasMessageThat().isEqualTo(
        "Expected Char for DummyEntity.char, but received false."
      )
    }
  }

  @Test
  fun singletonFields_float() {
    assertThat(entity.float).isNull()
    entity.float = 16.0f
    assertThat(entity.float).isEqualTo(16.0f)
    assertThat(entity.float).isInstanceOf(java.lang.Float::class.java)

    assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("float", "abc")
    }.also {
      assertThat(it).hasMessageThat().isEqualTo(
        "Expected Float for DummyEntity.float, but received abc."
      )
    }
  }

  @Test
  fun singletonFields_double() {
    assertThat(entity.double).isNull()
    entity.double = 16.0
    assertThat(entity.double).isEqualTo(16.0)
    assertThat(entity.double).isInstanceOf(java.lang.Double::class.java)

    assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("double", "abc")
    }.also {
      assertThat(it).hasMessageThat().isEqualTo(
        "Expected Double for DummyEntity.double, but received abc."
      )
    }
  }

  @Test
  fun singletonFields_bigInt() {
    val int = BigInt.valueOf("999912345678901234567890")
    assertThat(entity.bigInt).isNull()
    entity.bigInt = int
    assertThat(entity.bigInt).isEqualTo(int)
    assertThat(entity.bigInt).isInstanceOf(BigInt::class.java)

    assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("bigInt", "abc")
    }.also {
      assertThat(it).hasMessageThat().isEqualTo(
        "Expected BigInt for DummyEntity.bigInt, but received abc."
      )
    }
  }

  @Test
  fun singletonFields_duration() {
    val duration = ArcsDuration.ofMillis(99991234)
    assertThat(entity.duration).isNull()
    entity.duration = duration
    assertThat(entity.duration).isEqualTo(duration)

    assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("duration", "abc")
    }.also {
      assertThat(it).hasMessageThat().isEqualTo(
        "Expected Duration for DummyEntity.duration, but received abc."
      )
    }
  }

  @Test
  fun singletonFields_ref() {
    assertThat(entity.ref).isNull()
    val ref = createReference("foo")
    entity.ref = ref
    assertThat(entity.ref).isEqualTo(ref)

    val e = assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("ref", true)
    }
    assertThat(e).hasMessageThat().isEqualTo(
      "Expected Reference for DummyEntity.ref, but received true."
    )

    val id = "ImproperFoo"
    val improperRef = Reference<InlineDummyEntity>(
      InlineDummyEntity.Companion,
      RawReference(id, DummyStorageKey(id), VersionMap("id" to 1))
    )

    assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("ref", improperRef)
    }.also {
      assertThat(it).hasMessageThat().isEqualTo(
        "Expected Reference type to have schema hash ${DummyEntity.Companion.SCHEMA_HASH} " +
          "but had schema hash ${InlineDummyEntity.Companion.SCHEMA_HASH}."
      )
    }
  }

  @Test
  fun singletonFields_hardRef() {
    assertThat(entity.hardRef).isNull()
    val ref = createReference("foo")
    entity.hardRef = ref
    assertThat(entity.hardRef).isEqualTo(ref)
    assertThat(entity.hardRef!!.isHardReference).isTrue()
  }

  @Test
  fun singletonFields_primitiveList() {
    assertThat(entity.primList).isNull()
    entity.primList = listOf(1.0, 2.0, 3.0)
    assertThat(entity.primList).isEqualTo(listOf(1.0, 2.0, 3.0))

    val e = assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("primList", 42)
    }
    assertThat(e).hasMessageThat().isEqualTo(
      "Expected list for DummyEntity.primList, but received 42."
    )

    val f = assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("primList", listOf("forty two"))
    }
    assertThat(f).hasMessageThat().isEqualTo(
      "Expected Double for member of DummyEntity.primList, but received forty two."
    )
  }

  @Test
  fun singletonFields_referenceList() {
    assertThat(entity.refList).isNull()
    val ref1 = createReference("foo")
    val ref2 = createReference("bar")
    entity.refList = listOf(ref1, ref2, ref1)
    assertThat(entity.refList).isEqualTo(listOf(ref1, ref2, ref1))

    val e = assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("refList", 42)
    }
    assertThat(e).hasMessageThat().isEqualTo(
      "Expected list for DummyEntity.refList, but received 42."
    )

    val f = assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("refList", listOf("forty two"))
    }
    assertThat(f).hasMessageThat().isEqualTo(
      "Expected Reference for member of DummyEntity.refList, but received forty two."
    )
  }

  @Test
  fun singletonFields_inlineEntity() {
    val inlineDummy = InlineDummyEntity()
    assertThat(inlineDummy.text).isNull()
    inlineDummy.text = "foobar"
    assertThat(inlineDummy.text).isEqualTo("foobar")

    assertThat(entity.inlineEntity).isNull()
    entity.inlineEntity = inlineDummy
    assertThat(entity.inlineEntity).isEqualTo(inlineDummy)
    assertThat(entity.inlineEntity).isInstanceOf(InlineDummyEntity::class.java)

    assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("inlineEntity", "abc")
    }.also {
      assertThat(it).hasMessageThat().isEqualTo(
        "Expected EntityBase for #entityClassName.inlineEntity, but received abc."
      )
    }
    assertFailsWith<IllegalArgumentException> {
      entity.setSingletonValueForTest("inlineEntity", DummyEntity())
    }.also {
      assertThat(it).hasMessageThat().isEqualTo(
        "Expected EntityBase type to have schema hash ${InlineDummyEntity.SCHEMA_HASH} but had " +
          "schema hash ${DummyEntity.SCHEMA_HASH}."
      )
    }
  }

  @Test
  fun singletonFields_getInvalidFieldName() {
    val e = assertFailsWith<InvalidFieldNameException> {
      entity.getSingletonValueForTest("not_a_real_field")
    }
    assertThat(e).hasMessageThat().isEqualTo(
      "DummyEntity does not have a singleton field called \"not_a_real_field\"."
    )
  }

  @Test
  fun singletonFields_setInvalidFieldName() {
    val e = assertFailsWith<InvalidFieldNameException> {
      entity.setSingletonValueForTest("not_a_real_field", "x")
    }
    assertThat(e).hasMessageThat().isEqualTo(
      "DummyEntity does not have a singleton field called \"not_a_real_field\"."
    )
  }

  @Test
  fun singletonField_hasField() {
    assertThat(entity.hasSingletonFieldForTest("char")).isTrue()
    assertThat(entity.hasSingletonFieldForTest("not_a_real_field")).isFalse()
  }

  @Test
  fun collectionFields_boolean() {
    assertThat(entity.bools).isEmpty()
    entity.bools = setOf(true)
    assertThat(entity.bools).containsExactly(true)

    val e = assertFailsWith<IllegalArgumentException> {
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

    val e = assertFailsWith<IllegalArgumentException> {
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

    val e = assertFailsWith<IllegalArgumentException> {
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

    val e = assertFailsWith<IllegalArgumentException> {
      entity.setCollectionValueForTest("refs", setOf(ref1, "a"))
    }
    assertThat(e).hasMessageThat().isEqualTo(
      "Expected Reference for DummyEntity.refs, but received a."
    )
  }

  @Test
  fun collectionFields_getInvalidFieldName() {
    val e = assertFailsWith<InvalidFieldNameException> {
      entity.getCollectionValueForTest("not_a_real_field")
    }
    assertThat(e).hasMessageThat().isEqualTo(
      "DummyEntity does not have a collection field called \"not_a_real_field\"."
    )
  }

  @Test
  fun collectionFields_setInvalidFieldName() {
    val e = assertFailsWith<InvalidFieldNameException> {
      entity.setCollectionValueForTest("not_a_real_field", setOf("x"))
    }
    assertThat(e).hasMessageThat().isEqualTo(
      "DummyEntity does not have a collection field called \"not_a_real_field\"."
    )
  }

  @Test
  fun collectionFields_hasField() {
    assertThat(entity.hasCollectionFieldForTest("bools")).isTrue()
    assertThat(entity.hasCollectionFieldForTest("not_a_real_field")).isFalse()
  }

  @Test
  fun serializeRoundTrip() {
    val inlineDummyEntity = InlineDummyEntity().apply { text = "foobar" }
    with(entity) {
      text = "abc"
      num = 12.0
      byte = 8
      short = 12
      int = 16
      long = 16L
      instant = ArcsInstant.ofEpochMilli(6666666666)
      duration = ArcsDuration.ofMillis(6666666666)
      char = 'p'
      float = 12.0f
      double = 16.0
      bigInt = BigInt.valueOf("6666666666666666666666666666666")
      bool = true
      nullableBool = true
      nullableDouble = null
      ref = createReference("foo")
      primList = listOf(1.0, 4.0, 4.0, 1.0)
      refList = listOf(createReference("foo"), createReference("bar"), createReference("foo"))
      inlineEntity = inlineDummyEntity
      inlineList = listOf(inlineDummyEntity)
      inlines = setOf(inlineDummyEntity)
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
    assertThat(deserialized.inlineEntity).isEqualTo(inlineDummyEntity)
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

    val e = assertFailsWith<IllegalArgumentException> {
      DummyEntity().deserializeForTest(rawEntity)
    }
    assertThat(e).hasMessageThat().isEqualTo(
      "Expected RawReference but was Primitive(def)."
    )
  }

  @Test
  fun deserialize_unknownHash() {
    val rawEntity = RawEntity(
      singletons = mapOf(
        "ref" to RawReference("id", DummyStorageKey("key"), version = null)
      ),
      collections = mapOf()
    )

    val e = assertFailsWith<IllegalArgumentException> {
      // Call deserialize super method, and don't give the right nestedEntitySpecs map.
      DummyEntity().deserialize(rawEntity, nestedEntitySpecs = emptyMap())
    }
    assertThat(e).hasMessageThat().isEqualTo(
      "Unknown schema with hash abcdef."
    )
  }

  @Test
  fun deserialize_referencablePrimitive_wrongType() {
    val rawEntity = RawEntity(
      singletons = mapOf(
        "num" to listOf(5.0.toReferencable()).toReferencable(FieldType.ListOf(FieldType.Number))
      ),
      collections = mapOf()
    )

    assertFailsWith<IllegalArgumentException> {
      DummyEntity().deserialize(rawEntity, nestedEntitySpecs = emptyMap())
    }.also {
      assertThat(it).hasMessageThat().isEqualTo(
        "Expected ReferencablePrimitive but was List([Primitive(5.0)])."
      )
    }
  }

  @Test
  fun deserialize_referencablePrimitive_isNotNull() {
    val rawEntity = RawEntity(
      singletons = mapOf(
        "num" to ReferencablePrimitive<Double?>(Double::class, null)
      ),
      collections = mapOf()
    )

    assertFailsWith<IllegalArgumentException> {
      DummyEntity().deserialize(rawEntity, nestedEntitySpecs = emptyMap())
    }.also {
      assertThat(it).hasMessageThat().isEqualTo(
        "ReferencablePrimitive encoded an unexpected null value."
      )
    }
  }

  @Test
  fun deserialize_list() {
    val rawEntity = RawEntity(
      singletons = mapOf(
        "primList" to 5.0.toReferencable()
      ),
      collections = mapOf()
    )

    val e = assertFailsWith<IllegalArgumentException> {
      DummyEntity().deserialize(rawEntity, nestedEntitySpecs = emptyMap())
    }
    assertThat(e).hasMessageThat().isEqualTo(
      "Expected ReferencableList but was Primitive(5.0)."
    )
  }

  @Test
  fun deserialize_nestedInlineEntitySpecs_wrongMap() {
    val rawEntity = RawEntity(
      singletons = mapOf(
        "ref" to RawReference("id", DummyStorageKey("key"), version = null)
      ),
      collections = mapOf()
    )

    val e = assertFailsWith<IllegalArgumentException> {
      // Call deserialize super method, and don't give the right nestedEntitySpecs map.
      DummyEntity().deserialize(
        rawEntity,
        nestedEntitySpecs = mapOf(InlineDummyEntity.SCHEMA_HASH to InlineDummyEntity.Companion)
      )
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

    // Different Creation Times
    val entity3 = EntityBase(
      "Foo",
      DummyEntity.SCHEMA,
      creationTimestamp = 1605222647172
    )
    val entity4 = EntityBase("Foo", DummyEntity.SCHEMA)
    assertThat(entity3).isNotEqualTo(entity4)

    // Different Expiration Times
    val entity5 = EntityBase(
      "Foo",
      DummyEntity.SCHEMA,
      expirationTimestamp = 1605222647172
    )
    val entity6 = EntityBase("Foo", DummyEntity.SCHEMA)
    assertThat(entity5).isNotEqualTo(entity6)
  }

  @Test
  fun hashCode_equality() {
    val entity1 = EntityBase("Foo", DummyEntity.SCHEMA)
    val entity2 = EntityBase("Foo", DummyEntity.SCHEMA)
    assertThat(entity1.hashCode()).isEqualTo(entity1.hashCode())
    assertThat(entity1.hashCode()).isEqualTo(entity2.hashCode())

    // Different name.
    assertThat(entity1.hashCode()).isNotEqualTo(EntityBase("Bar", DummyEntity.SCHEMA).hashCode())

    // Different schema.
    assertThat(entity1.hashCode()).isNotEqualTo(
      EntityBase(
        "Foo",
        Schema(emptySet(), SchemaFields(emptyMap(), emptyMap()), "hash")
      ).hashCode()
    )

    // Different ID.
    entity2.ensureEntityFields(Id.Generator.newForTest("session"), "handle", FakeTime())
    assertThat(entity1.hashCode()).isNotEqualTo(entity2.hashCode())

    // Different Creation Times
    val entity3 = EntityBase(
      "Foo",
      DummyEntity.SCHEMA,
      creationTimestamp = 1605222647172
    )
    val entity4 = EntityBase("Foo", DummyEntity.SCHEMA)
    assertThat(entity3.hashCode()).isNotEqualTo(entity4.hashCode())

    // Different Expiration Times
    val entity5 = EntityBase(
      "Foo",
      DummyEntity.SCHEMA,
      expirationTimestamp = 1605222647172
    )
    val entity6 = EntityBase("Foo", DummyEntity.SCHEMA)
    assertThat(entity5.hashCode()).isNotEqualTo(entity6.hashCode())
  }

  @Test
  fun equality_separateSubclassesWithSameDataAreEqual() {
    val entity1 = object : EntityBase("Foo", DummyEntity.SCHEMA) {}
    val entity2 = object : EntityBase("Foo", DummyEntity.SCHEMA) {}
    assertThat(entity1).isEqualTo(entity2)
  }

  @Test
  fun reset() {
    with(entity) {
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
    entity.ensureEntityFields(
      Id.Generator.newForTest("session1"),
      "handle2",
      FakeTime(10),
      Ttl.Minutes(1)
    )
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
  fun cannotSetFutureCreationTimestamp() {
    val idGenerator = Id.Generator.newForTest("session1")
    val time = FakeTime().also { it.millis = 100 }

    // In the past, ok.
    val entity = EntityBase("Foo", DummyEntity.SCHEMA, creationTimestamp = 20)
    entity.ensureEntityFields(idGenerator, "handle", time, Ttl.Minutes(1))
    assertThat(entity.creationTimestamp).isEqualTo(20)

    // In the future, not ok.
    val entity2 = EntityBase("Foo", DummyEntity.SCHEMA, creationTimestamp = 120)
    val e = assertFailsWith<IllegalArgumentException> {
      entity2.ensureEntityFields(idGenerator, "handle", time, Ttl.Minutes(1))
    }
    assertThat(e).hasMessageThat().isEqualTo(
      "Cannot set a future creationTimestamp=120."
    )
  }

  @Test
  fun testToString() {
    with(entity) {
      text = "abc"
      num = 12.0
      bool = true
      primList = listOf(1.0, 1.0)
      texts = setOf("aa", "bb")
      nums = setOf(1.0, 2.0)
      bools = setOf(true, false)
    }
    assertThat(entity.toString()).isEqualTo(
      "DummyEntity(bigInt = null, bool = true, bools = [true, false], byte = null, char = null, " +
        "double = null, duration = null, float = null, hardRef = null, inlineEntity = null, " +
        "inlineList = null, inlines = [], instant = null, int = null, long = null, " +
        "nullableBool = null, nullableDouble = null, num = 12.0, nums = [1.0, 2.0], " +
        "primList = [1.0, 1.0], ref = null, refList = null, refs = [], short = null, " +
        "text = abc, texts = [aa, bb])"
    )
  }

  @Test
  fun entityBaseSpec_registersSchema() {
    SchemaRegistry.clearForTest()

    EntityBaseSpec(DummyEntity.SCHEMA)

    val schema = SchemaRegistry.getSchema(DummyEntity.SCHEMA_HASH)

    assertThat(schema).isEqualTo(DummyEntity.SCHEMA)
  }

  @Test
  fun entityBaseSpec_deserialize() {
    with(entity) {
      text = "abc"
      num = 12.0
      byte = 8
      short = 12
      int = 16
      long = 16L
      instant = ArcsInstant.ofEpochMilli(6666666666)
      duration = ArcsDuration.ofMillis(6666666666)
      char = 'p'
      float = 12.0f
      double = 16.0
      bigInt = BigInt.valueOf("6666666666666666666666666666666")
      bool = true
      ref = createReference("foo")
      primList = listOf(1.0, 4.0, 4.0, 1.0)
      refList = listOf(createReference("foo"), createReference("bar"), createReference("foo"))
      texts = setOf("aa", "bb")
      nums = setOf(1.0, 2.0)
      bools = setOf(true, false)
      refs = setOf(createReference("ref1"), createReference("ref2"))
    }

    val rawEntity = entity.serialize()
    val deserialized = EntityBaseSpec(DummyEntity.SCHEMA).deserialize(rawEntity)

    assertThat(deserialized.serialize()).isEqualTo(entity.serialize())
  }

  @Test
  fun entityBaseSpec_deserializeInlineEntities() {
    val inlineDummyEntity = InlineDummyEntity().apply { text = "foobar" }
    with(entity) {
      text = "abc"
      num = 12.0
      byte = 8
      short = 12
      int = 16
      long = 16L
      instant = ArcsInstant.ofEpochMilli(6666666666)
      duration = ArcsDuration.ofMillis(6666666666)
      char = 'p'
      float = 12.0f
      double = 16.0
      bigInt = BigInt.valueOf("6666666666666666666666666666666")
      bool = true
      ref = createReference("foo")
      primList = listOf(1.0, 4.0, 4.0, 1.0)
      refList = listOf(createReference("foo"), createReference("bar"), createReference("foo"))
      inlineEntity = inlineDummyEntity
      inlineList = listOf(inlineDummyEntity)
      inlines = setOf(inlineDummyEntity)
      texts = setOf("aa", "bb")
      nums = setOf(1.0, 2.0)
      bools = setOf(true, false)
      refs = setOf(createReference("ref1"), createReference("ref2"))
    }

    val rawEntity = entity.serialize()
    val deserialized = EntityBaseSpec(DummyEntity.SCHEMA).deserialize(
      rawEntity,
      mapOf(
        DummyEntity.SCHEMA_HASH to DummyEntity.Companion,
        InlineDummyEntity.SCHEMA_HASH to InlineDummyEntity.Companion
      )
    )

    assertThat(deserialized.serialize()).isEqualTo(entity.serialize())
  }

  @Test
  fun entityBaseSpec_deserializeInlineEntities_throwsError() {
    val inlineDummyEntity = InlineDummyEntity()
    inlineDummyEntity.text = "foobar"
    entity.inlineEntity = inlineDummyEntity

    val rawEntity = entity.serialize()

    assertFailsWith<IllegalArgumentException> {
      EntityBaseSpec(DummyEntity.SCHEMA).deserialize(rawEntity)
    }.also {
      assertThat(it).hasMessageThat().isEqualTo(
        "Unknown schema with hash ${InlineDummyEntity.SCHEMA_HASH}."
      )
    }
  }

  @Test
  fun propertyDelegationForHelperClasses() {
    val entity1 = testWrapper(
      DummyEntity().apply {
        text = "abc"
        nums = setOf(5.0)
        int = 6
      }
    )
    assertThat(entity1.text).isEqualTo("abc!!")
    assertThat(entity1.nums).isEqualTo(setOf(5.0, 8.0))
    assertThat(entity1.int).isEqualTo(6)

    val entity2 = testWrapper(
      DummyVariableEntity().apply {
        text = "abc"
        nums = setOf(5.0)
        bools = setOf(true)
      }
    )
    assertThat(entity2.text).isEqualTo("abc!!")
    assertThat(entity2.nums).isEqualTo(setOf(5.0, 8.0))
    assertThat(entity2.bools).isEqualTo(setOf(true))
  }

  class Wrapper(val e: EntityBase) {
    var text: String by SingletonProperty(e)
    var nums: Set<Double> by CollectionProperty(e)
  }

  // Tests that the Wrapper class can read and modify the underlying entity via field accessors.
  private fun <T : EntityBase> testWrapper(entity: T): T {
    val w = Wrapper(entity)
    w.text += "!!"
    w.nums += 8.0
    assertThat(w.text).isEqualTo("abc!!")
    assertThat(w.nums).isEqualTo(setOf(5.0, 8.0))
    return entity
  }

  private fun createReference(id: String) = Reference(
    DummyEntity,
    RawReference(id, DummyStorageKey(id), VersionMap("id" to 1))
  )
}
