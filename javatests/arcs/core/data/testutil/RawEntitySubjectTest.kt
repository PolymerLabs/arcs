package arcs.core.data.testutil

import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.testutil.RawEntitySubject.Companion.assertThat
import arcs.core.data.testutil.RawEntitySubject.Companion.rawEntities
import arcs.core.data.util.ReferencableList
import arcs.core.data.util.toReferencable
import com.google.common.truth.ExpectFailure.assertThat
import com.google.common.truth.ExpectFailure.expectFailureAbout
import com.google.common.truth.SimpleSubjectBuilder
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class RawEntitySubjectTest {
  @Test
  fun isEqualTo_null_fails() {
    expectFailure {
      that(ENTITY).isEqualTo(null)
    }
  }

  @Test
  fun isEqualTo_self_passes() {
    assertThat(ENTITY).isEqualTo(ENTITY)
    assertThat(ENTITY.copy()).isEqualTo(ENTITY)
  }

  @Test
  fun isEqualTo_differentId_fails() {
    val expected = ENTITY.copy(id = "id1")
    val actual = ENTITY.copy(id = "id2")

    val failure = expectFailure { that(actual).isEqualTo(expected) }

    failure.expectDiff("rawEntity.id", expected = "id1", actual = "id2")
  }

  @Test
  fun isEqualTo_differentCreationTimestamp_fails() {
    val expected = ENTITY.copy(creationTimestamp = 111)
    val actual = ENTITY.copy(creationTimestamp = 222)

    val failure = expectFailure { that(actual).isEqualTo(expected) }

    failure.expectDiff("rawEntity.creationTimestamp", expected = "111", actual = "222")
  }

  @Test
  fun isEqualTo_differentExpirationTimestamp_fails() {
    val expected = ENTITY.copy(expirationTimestamp = 111)
    val actual = ENTITY.copy(expirationTimestamp = 222)

    val failure = expectFailure { that(actual).isEqualTo(expected) }

    failure.expectDiff("rawEntity.expirationTimestamp", expected = "111", actual = "222")
  }

  @Test
  fun isEqualTo_sameSingletonFields_passes() {
    val expected = ENTITY.copy(singletons = mapOf("a" to VALUE1, "b" to VALUE2))
    val actual = expected.copy()

    assertThat(actual).isEqualTo(expected)
  }

  @Test
  fun isEqualTo_differentSingletonFields_fails() {
    val expected = ENTITY.copy(singletons = mapOf("a" to VALUE1))
    val actual = expected.copy(singletons = mapOf("a" to VALUE2))

    val failure = expectFailure { that(actual).isEqualTo(expected) }

    failure.expectDiff(
      "rawEntity.singletons[a]",
      expected = VALUE1.toString(),
      actual = VALUE2.toString()
    )
  }

  @Test
  fun isEqualTo_extraSingletonField_fails() {
    val expected = ENTITY.copy(singletons = emptyMap())
    val actual = ENTITY.copy(singletons = mapOf("a" to VALUE1))

    val failure = expectFailure { that(actual).isEqualTo(expected) }

    failure.expectDiff(
      "rawEntity.singletons[a]",
      expected = "<absent>",
      actual = VALUE1.toString()
    )
  }

  @Test
  fun isEqualTo_missingSingletonField_fails() {
    val expected = ENTITY.copy(singletons = mapOf("a" to VALUE1))
    val actual = ENTITY.copy(singletons = emptyMap())

    val failure = expectFailure { that(actual).isEqualTo(expected) }

    failure.expectDiff(
      "rawEntity.singletons[a]",
      expected = VALUE1.toString(),
      actual = "<absent>"
    )
  }

  @Test
  fun isEqualTo_sameCollectionFields_passes() {
    val expected = ENTITY.copy(collections = mapOf("a" to setOf(VALUE1), "b" to setOf(VALUE2)))
    val actual = expected.copy()

    assertThat(actual).isEqualTo(expected)
  }

  @Test
  fun isEqualTo_differentCollectionFields_differentValue_fails() {
    val expected = ENTITY.copy(collections = mapOf("a" to setOf(VALUE1)))
    val actual = expected.copy(collections = mapOf("a" to setOf(VALUE2)))

    val failure = expectFailure { that(actual).isEqualTo(expected) }

    failure.expectDiff(
      "rawEntity.collections[a][0]",
      expected = VALUE1.toString(),
      actual = VALUE2.toString()
    )
  }

  @Test
  fun isEqualTo_differentCollectionFields_additionalValue_fails() {
    val expected = ENTITY.copy(collections = mapOf("a" to setOf(VALUE1)))
    val actual = expected.copy(collections = mapOf("a" to setOf(VALUE1, VALUE2)))

    val failure = expectFailure { that(actual).isEqualTo(expected) }

    failure.expectDiff(
      "rawEntity.collections[a][1]",
      expected = "<absent>",
      actual = VALUE2.toString()
    )
  }

  @Test
  fun isEqualTo_extraCollectionField_fails() {
    val expected = ENTITY.copy(collections = emptyMap())
    val actual = ENTITY.copy(collections = mapOf("a" to emptySet()))

    val failure = expectFailure { that(actual).isEqualTo(expected) }

    failure.expectDiff(
      "rawEntity.collections[a]",
      expected = "<absent>",
      actual = "[]"
    )
  }

  @Test
  fun isEqualTo_missingCollectionField_fails() {
    val expected = ENTITY.copy(collections = mapOf("a" to emptySet()))
    val actual = ENTITY.copy(collections = emptyMap())

    val failure = expectFailure { that(actual).isEqualTo(expected) }

    failure.expectDiff(
      "rawEntity.collections[a]",
      expected = "[]",
      actual = "<absent>"
    )
  }

  @Test
  fun isEqualTo_nestedRawEntityInSingletonField() {
    fun createNestedEntity(id: String): RawEntity {
      val deepInnerEntity = ENTITY.copy(id = id)
      val innerEntity = ENTITY.copy(singletons = mapOf("deep" to deepInnerEntity))
      return ENTITY.copy(singletons = mapOf("inner" to innerEntity))
    }
    val expected = createNestedEntity("id1")
    val actual = createNestedEntity("id2")

    val failure = expectFailure { that(actual).isEqualTo(expected) }

    failure.expectDiff(
      "rawEntity.singletons[inner].singletons[deep].id",
      expected = "id1",
      actual = "id2"
    )
  }

  @Test
  fun isEqualTo_nestedRawEntityInCollectionField() {
    fun createNestedEntity(id: String): RawEntity {
      val deepInnerEntity = ENTITY.copy(id = id)
      val innerEntity = ENTITY.copy(collections = mapOf("deep" to setOf(VALUE1, deepInnerEntity)))
      return ENTITY.copy(collections = mapOf("inner" to setOf(innerEntity)))
    }
    val expected = createNestedEntity("id1")
    val actual = createNestedEntity("id2")

    val failure = expectFailure { that(actual).isEqualTo(expected) }

    failure.expectDiff(
      "rawEntity.collections[inner][0].collections[deep][1].id",
      expected = "id1",
      actual = "id2"
    )
  }

  @Test
  fun isEqualTo_referencableListWithDifferentItemType_fails() {
    val expected = ENTITY.copy(
      singletons = mapOf("a" to ReferencableList(listOf(VALUE1, VALUE2), FieldType.BigInt))
    )
    val actual = ENTITY.copy(
      singletons = mapOf("a" to ReferencableList(listOf(VALUE1, VALUE2), FieldType.Duration))
    )

    val failure = expectFailure { that(actual).isEqualTo(expected) }

    failure.expectDiff(
      "rawEntity.singletons[a].itemType",
      expected = "BigInt",
      actual = "Duration"
    )
  }

  @Test
  fun isEqualTo_referencableListWithDifferentItems_fails() {
    val expected = ENTITY.copy(
      singletons = mapOf("a" to ReferencableList(listOf(VALUE1, VALUE1), FieldType.BigInt))
    )
    val actual = ENTITY.copy(
      singletons = mapOf("a" to ReferencableList(listOf(VALUE1, VALUE2), FieldType.BigInt))
    )

    val failure = expectFailure { that(actual).isEqualTo(expected) }

    failure.expectDiff(
      "rawEntity.singletons[a][1]",
      expected = VALUE1.toString(),
      actual = VALUE2.toString()
    )
  }

  private companion object {
    private fun expectFailure(
      callback: (SimpleSubjectBuilder<RawEntitySubject, RawEntity>).() -> Unit
    ): AssertionError {
      return expectFailureAbout(rawEntities(), callback)
    }

    private val ENTITY = RawEntity(id = "id", creationTimestamp = 987, expirationTimestamp = 654)

    private val VALUE1 = "value1".toReferencable()
    private val VALUE2 = "value2".toReferencable()

    private fun AssertionError.expectDiff(field: String, expected: String, actual: String) {
      assertThat(this).factValue("for field").isEqualTo(field)
      assertThat(this).factValue("expected").isEqualTo(expected)
      assertThat(this).factValue("but was").isEqualTo(actual)
    }
  }
}
