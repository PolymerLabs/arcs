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
package arcs.core.analysis

import arcs.core.data.expression.PaxelParser
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class ExpressionPathAccumulatorTest {

    @Test
    fun single_variable() {
        val expr = PaxelParser.parse("x")

        val actual = expr.accept(ExpressionPathAccumulator())

        assertThat(actual).isEqualTo(listOf(listOf("x")))
    }

    @Test
    fun variable_field_access() {
        val expr = PaxelParser.parse("x.foo")

        val actual = expr.accept(ExpressionPathAccumulator())

        assertThat(actual).isEqualTo(listOf(listOf("x", "foo")))
    }

    @Test
    fun variable_field_access_nested() {
        val expr = PaxelParser.parse("x.foo.bar")

        val actual = expr.accept(ExpressionPathAccumulator())

        assertThat(actual).isEqualTo(listOf(listOf("x", "foo", "bar")))
    }

    @Test
    fun new() {
        val expr = PaxelParser.parse("new Object {foo: x, bar: y}")

        val actual = expr.accept(ExpressionPathAccumulator())

        assertThat(actual).isEqualTo(listOf(listOf("x"), listOf("y")))
    }

    @Test
    fun new_field_access() {
        val expr = PaxelParser.parse("new Object {foo: input.foo, bar: input.foo.bar}")

        val actual = expr.accept(ExpressionPathAccumulator())

        assertThat(actual).isEqualTo(listOf(
            listOf("input", "foo"),
            listOf("input", "foo", "bar")
        ))
    }

    @Test
    fun sum_variables() {
        val expr = PaxelParser.parse("x + y")

        val actual = expr.accept(ExpressionPathAccumulator())

        assertThat(actual).isEqualTo(listOf(listOf("x"), listOf("y")))
    }

    @Test
    fun sum_variables_field_access() {
        val expr = PaxelParser.parse("x.foo + y.foo.bar")

        val actual = expr.accept(ExpressionPathAccumulator())

        assertThat(actual).isEqualTo(listOf(
            listOf("x", "foo"),
            listOf("y", "foo", "bar")
        ))
    }

    @Test
    fun new_field_access_binexpr() {
        val expr = PaxelParser.parse("new Object {foo: input.foo, bar: input.foo.bar + input.foo}")

        val actual = expr.accept(ExpressionPathAccumulator())

        assertThat(actual).isEqualTo(listOf(
            listOf("input", "foo"),
            listOf("input", "foo", "bar"),
            listOf("input", "foo")
        ))
    }
}
