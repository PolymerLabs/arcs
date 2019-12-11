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

package arcs.core.type

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

    private open class TestType(override val tag: Tag) : Type {
        override fun toLiteral(): TypeLiteral = Literal(tag)
        class Literal(override val tag: Tag) : TypeLiteral
    }

    private class TestTypeContainer(
        tag: Tag,
        override val containedType: TestType
    ) : TestType(tag), Type.TypeContainer<TestType>
}
