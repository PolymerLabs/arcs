/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.type

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/**
 * Tests for [Type].
 *
 * TODO: Write up most of the tests from type-test.ts
 */
@RunWith(JUnit4::class)
class TypeTest {
  @Test
  fun unwrapPair_returnsOriginal_whenTagsAreUnequal() {
    val expected = Pair(TestType(Tag.Entity), TestType(Tag.Arc))
    assertThat(Type.unwrapPair(expected)).isEqualTo(expected)
  }

  @Test
  fun unwrapPair_returnsOriginal_whenAnyAreNotTypeContainers() {
    val container = TestTypeContainer(Tag.Slot, containedType = TestType(Tag.Arc))
    val standalone = TestType(Tag.Slot)

    var expected: Pair<Type, Type> = Pair(container, standalone)
    assertThat(Type.unwrapPair(expected)).isEqualTo(expected)

    expected = Pair(standalone, container)
    assertThat(Type.unwrapPair(expected)).isEqualTo(expected)
  }

  @Test
  fun unwrapPair_digsDeeper_whenBothAreContainers() {
    val typeA = TestType(Tag.Singleton)
    val typeB = TestType(Tag.Collection)

    val containerA = TestTypeContainer(Tag.Collection, containedType = typeA)
    val containerB = TestTypeContainer(Tag.Collection, containedType = typeB)

    val expected: Pair<Type, Type> = Pair(typeA, typeB)
    assertThat(Type.unwrapPair(Pair(containerA, containerB))).isEqualTo(expected)
  }

  @Test
  fun canMergeConstraints_returnsTrue_whenBothAreNotBothTypesOfHolder() {
    var typeA: Type = TestType(Tag.Handle)
    var typeB: Type = TestType(Tag.Handle)

    assertThat(Type.canMergeConstraints(typeA, typeB)).isTrue()

    typeA = CanReadType(null, false)
    typeB = CanWriteType(null, false)

    assertThat(Type.canMergeConstraints(typeA, typeB)).isTrue()

    typeA = CanReadWriteType(null, canMergeSubset = false, canMergeSuperset = true)
    typeB = CanWriteType(null, canMerge = true)

    assertThat(Type.canMergeConstraints(typeA, typeB)).isTrue()
  }

  @Test
  fun canMergeConstraints_returnsFalse_ifSubSupTags_areNotEqual() {
    val typeA: Type = CanReadWriteType(
      TestType(Tag.Handle),
      canMergeSubset = true,
      canMergeSuperset = true
    )
    val typeB: Type = CanReadWriteType(
      TestType(Tag.Collection),
      canMergeSubset = true,
      canMergeSuperset = true
    )

    assertThat(Type.canMergeConstraints(typeA, typeB)).isFalse()
  }

  @Test
  fun canMergeConstraints_returnsFalse_eitherSubAndSup_cannotMerge() {
    0.until(14).forEach { i ->
      // Use the bits in ints 0-14 as flags, ensuring that all situations where not all values are
      // true return false.
      val typeA =
        CanReadWriteType(
          TestType(Tag.Arc),
          canMergeSubset = i and 1 != 0,
          canMergeSuperset = i and 2 != 0
        )
      val typeB =
        CanReadWriteType(
          TestType(Tag.Arc),
          canMergeSubset = i and 4 != 0,
          canMergeSuperset = i and 8 != 0
        )

      assertThat(Type.canMergeConstraints(typeA, typeB)).isFalse()
    }
  }

  @Test
  fun canMergeConstraints_returnsTrue_whenBothCanMergeBothWays() {
    val typeA =
      CanReadWriteType(
        TestType(Tag.Arc),
        canMergeSubset = true,
        canMergeSuperset = true
      )
    val typeB =
      CanReadWriteType(
        TestType(Tag.Arc),
        canMergeSubset = true,
        canMergeSuperset = true
      )

    assertThat(Type.canMergeConstraints(typeA, typeB)).isTrue()
  }

  private open class TestType(override val tag: Tag) : Type {
    override fun toLiteral(): TypeLiteral = Literal(tag)
    class Literal(override val tag: Tag) : TypeLiteral
  }

  private class TestTypeContainer(
    tag: Tag,
    override val containedType: TestType
  ) : TestType(tag), Type.TypeContainer<TestType>

  private class CanReadType(
    override val canReadSubset: Type?,
    val canMerge: Boolean
  ) : TestType(Tag.Handle), Type.CanReadSubsetHolder {
    override fun canMergeCanReadSubsetWith(other: Type.CanReadSubsetHolder) = canMerge
  }

  private class CanWriteType(
    override val canWriteSuperset: Type?,
    val canMerge: Boolean
  ) : TestType(Tag.Handle), Type.CanWriteSupersetHolder {
    override fun canMergeCanWriteSupersetWith(other: Type.CanWriteSupersetHolder) = canMerge
  }

  private class CanReadWriteType(
    val subSupSet: Type?,
    val canMergeSubset: Boolean,
    val canMergeSuperset: Boolean
  ) : TestType(Tag.Handle), Type.CanReadWriteHolder {
    override val canReadSubset: Type? = subSupSet
    override val canWriteSuperset: Type? = subSupSet

    override fun canMergeCanReadSubsetWith(other: Type.CanReadSubsetHolder) = canMergeSubset
    override fun canMergeCanWriteSupersetWith(other: Type.CanWriteSupersetHolder) = canMergeSuperset
  }
}
