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

import arcs.core.data.AccessPath
import arcs.core.data.expression.PaxelParser
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

private fun String.asField() = AccessPath.Selector.Field(this)
private fun List<String>.asFields() = this.map { it.asField() }.toList()

@RunWith(JUnit4::class)
class ExpressionClaimDeducerTest {

    @Test
    fun single_variable() {
        val expr = PaxelParser.parse("x")

        val actual = expr.accept(ExpressionClaimDeducer())

        assertThat(actual).isEmpty()
    }

    @Test
    fun variable_field_access() {
        val expr = PaxelParser.parse("x.foo")

        val actual = expr.accept(ExpressionClaimDeducer())

        assertThat(actual).isEmpty()
    }

    @Test
    fun variable_field_access_nested() {
        val expr = PaxelParser.parse("x.foo.bar")

        val actual = expr.accept(ExpressionClaimDeducer())

        assertThat(actual).isEmpty()
    }

    @Test
    fun new() {
        val expr = PaxelParser.parse("new Object {foo: x, bar: y}")

        val actual = expr.accept(ExpressionClaimDeducer())

        assertThat(actual).isEqualTo(
            mapOf(
                listOf("foo".asField()) to setOf(listOf("x".asField())),
                listOf("bar".asField()) to setOf(listOf("y".asField()))
            )
        )
    }

    @Test
    fun new_field_access() {
        val expr = PaxelParser.parse("new Object {foo: input.foo, bar: input.foo.bar}")

        val actual = expr.accept(ExpressionClaimDeducer())

        assertThat(actual).isEqualTo(
            mapOf(
                listOf("foo".asField()) to setOf(
                    listOf("input", "foo").asFields()
                ),
                listOf("bar".asField()) to setOf(
                    listOf("input", "foo", "bar").asFields()
                )
            )
        )
    }

    @Test
    fun sum_variables() {
        val expr = PaxelParser.parse("x + y")

        val actual = expr.accept(ExpressionClaimDeducer())

        assertThat(actual).isEmpty()
    }

    @Test
    fun sum_variables_field_access() {
        val expr = PaxelParser.parse("x.foo + y.foo.bar")

        val actual = expr.accept(ExpressionClaimDeducer())

        assertThat(actual).isEmpty()
    }

    @Test
    fun new_field_access_binexpr() {
        val expr = PaxelParser.parse("new Object {foo: input.foo, bar: input.foo.bar + input.foo}")

        val actual = expr.accept(ExpressionClaimDeducer())

        assertThat(actual).isEqualTo(
            mapOf(
                listOf("foo".asField()) to setOf(listOf("input", "foo").asFields()),
                listOf("bar".asField()) to setOf(
                    listOf("input", "foo", "bar").asFields(),
                    listOf("input", "foo").asFields()
                )
            )
        )
    }
}
