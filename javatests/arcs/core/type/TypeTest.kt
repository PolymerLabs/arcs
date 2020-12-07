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

package arcs.core.type

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.test.assertFailsWith

/**
 * Tests for [Type].
 */
@RunWith(JUnit4::class)
class TypeTest {
  @Test
  fun isAtLeastAsSpecificAs_differentTags_false() {
    assertThat(TestType(Tag.Singleton).isAtLeastAsSpecificAs(TestType(Tag.Collection))).isFalse()
  }

  @Test
  fun isAtLeastAsSpecificAs_sameTags_unsupported() {
    assertFailsWith<UnsupportedOperationException> {
      TestType(Tag.Singleton).isAtLeastAsSpecificAs(TestType(Tag.Singleton))
    }
  }

  @Test
  fun toStringWithOptions() {
    val options = Type.ToStringOptions(hideFields = false, pretty = false)
    val optionsHideFields = Type.ToStringOptions(hideFields = true, pretty = false)
    val optionsPretty = Type.ToStringOptions(hideFields = false, pretty = true)
    val optionsHideFieldsPretty = Type.ToStringOptions(hideFields = true, pretty = true)

    assertThat(TestType(Tag.Singleton).toStringWithOptions(options)).isEqualTo("Singleton")
    assertThat(TestType(Tag.Singleton).toStringWithOptions(optionsHideFields))
      .isEqualTo("Singleton")
    assertThat(TestType(Tag.Singleton).toStringWithOptions(optionsPretty)).isEqualTo("Singleton")
    assertThat(TestType(Tag.Singleton).toStringWithOptions(optionsHideFieldsPretty))
      .isEqualTo("Singleton")
    assertThat(TestType(Tag.Reference).toStringWithOptions(options)).isEqualTo("Reference")
    assertThat(TestType(Tag.Entity).toStringWithOptions(options)).isEqualTo("Entity")
  }

  @Test
  fun toStringWithOptions_options() {
    val type = object : TestType(Tag.Collection) {
      override fun toStringWithOptions(options: Type.ToStringOptions): String {
        val hideFields = if (options.hideFields) "hide" else "show"
        val pretty = if (options.pretty) "pretty" else "normal"
        return "${this.tag} // $hideFields // $pretty"
      }
    }

    assertThat(type.toStringWithOptions(Type.ToStringOptions(hideFields = false, pretty = false)))
      .isEqualTo("Collection // show // normal")
    assertThat(type.toStringWithOptions(Type.ToStringOptions(hideFields = true, pretty = false)))
      .isEqualTo("Collection // hide // normal")
    assertThat(type.toStringWithOptions(Type.ToStringOptions(hideFields = false, pretty = true)))
      .isEqualTo("Collection // show // pretty")
    assertThat(type.toStringWithOptions(Type.ToStringOptions(hideFields = true, pretty = true)))
      .isEqualTo("Collection // hide // pretty")
  }

  @Test
  fun unwrapPair_returnsOriginal_whenTagsAreUnequal() {
    val expected = Pair(TestType(Tag.Entity), TestType(Tag.Count))
    assertThat(Type.unwrapPair(expected)).isEqualTo(expected)
  }

  @Test
  fun unwrapPair_returnsOriginal_whenAnyAreNotTypeContainers() {
    val container = TestTypeContainer(Tag.Collection, containedType = TestType(Tag.Count))
    val standalone = TestType(Tag.Collection)

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

  private open class TestType(override val tag: Tag) : Type

  private class TestTypeContainer(
    tag: Tag,
    override val containedType: TestType
  ) : TestType(tag), Type.TypeContainer<TestType>
}
