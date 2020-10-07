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
class ExpressionClaimDeducerTest {

  @Test
  fun literal_number() {
    val expr = PaxelParser.parse("5")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(Deduction.Empty)
  }

  @Test
  fun literal_text() {
    val expr = PaxelParser.parse("'hello'")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(Deduction.Empty)
  }

  @Test
  fun literal_boolean() {
    val expr = PaxelParser.parse("false")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(Deduction.Empty)
  }

  @Test
  fun literal_null() {
    val expr = PaxelParser.parse("null")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(Deduction.Empty)
  }

  @Test
  fun single_variable() {
    val expr = PaxelParser.parse("x")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction.Equal("x")
    )
  }

  @Test
  fun sum_variable_literal() {
    val expr = PaxelParser.parse("x + 1")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction.Derive(listOf("x"))
    )
  }

  @Test
  fun variable_field_access() {
    val expr = PaxelParser.parse("x.foo")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction.Equal("x", "foo")
    )
  }

  @Test
  fun variable_field_access_nested() {
    val expr = PaxelParser.parse("x.foo.bar")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction.Equal("x", "foo", "bar")
    )
  }

  @Test
  fun variable_field_access_binop() {
    val expr = PaxelParser.parse("x.foo.bar + y.foo.bar.baz + z.baz.bar")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction.Derive(
        listOf("x", "foo", "bar"),
        listOf("y", "foo", "bar", "baz"),
        listOf("z", "baz", "bar")
      )
    )
  }

  @Test
  fun literal_binop() {
    val expr = PaxelParser.parse("1 + 2 + 3 + 4 + 5")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction.Empty
    )
  }

  @Test
  fun variable_field_access_binop_literals() {
    val expr = PaxelParser.parse("x.foo.bar + y.foo.bar.baz + z.baz.bar + 10 + 20")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction.Derive(
        listOf("x", "foo", "bar"),
        listOf("y", "foo", "bar", "baz"),
        listOf("z", "baz", "bar")
      )
    )
  }

  @Test
  fun new() {
    val expr = PaxelParser.parse("new Object {foo: x, bar: y}")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction.Scope(
        "foo" to Deduction.Equal("x"),
        "bar" to Deduction.Equal("y")
      )
    )
  }

  @Test
  fun new_field_access() {
    val expr = PaxelParser.parse("new Object {foo: input.foo, bar: input.foo.bar}")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction.Scope(
        "foo" to Deduction.Equal("input", "foo"),
        "bar" to Deduction.Equal("input", "foo", "bar")
      )
    )
  }

  @Test
  fun sum_variables() {
    val expr = PaxelParser.parse("x + y")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction.Derive(
        listOf("x"),
        listOf("y")
      )
    )
  }

  @Test
  fun new_field_access_binexpr() {
    val expr = PaxelParser.parse("new Object {foo: input.foo, bar: input.foo.bar + input.foo}")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction.Scope(
        "foo" to Deduction.Equal("input", "foo"),
        "bar" to
          Deduction.Derive(
            listOf("input", "foo", "bar"),
            listOf("input", "foo")
          )
      )
    )
  }

  @Test
  fun field_access_nested_expr() {
    val expr = PaxelParser.parse("(new Foo {x: foo, y: bar}).x")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction.Scope(
        "x" to Deduction.Equal("foo")
      )
    )
  }

  @Test
  fun field_access_nested_multi_field_expr() {
    val expr = PaxelParser.parse("(new Foo {a: foo.x + foo.y, b: foo.y + foo.z}).a")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction.Scope(
        "a" to Deduction.Derive(
          listOf("foo", "x"),
          listOf("foo", "y")
        )
      )
    )
  }

  @Test
  fun new_nested() {
    val expr = PaxelParser.parse(
      """
      new Foo {
        a: new Bar {
          x: cat,
          y: dog
        },
        b: foo,
        c: 5
      }
      """.trimIndent())

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction.Scope(
        "a" to Deduction.Scope(
          "x" to Deduction.Equal("cat"),
          "y" to Deduction.Equal("dog")
        ),
        "b" to Deduction.Equal("foo"),
        "c" to Deduction.Empty
      )
    )
  }

  @Test
  fun new_deeply_nested() {
    val expr = PaxelParser.parse(
      """
      new Foo {
        x: new Bar {
          y: new Baz {
            z: new Buz {
              a: foo
            }
          }
        }
      }
      """.trimIndent()
    )

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction.Scope(
        "x" to Deduction.Scope(
          "y" to Deduction.Scope(
            "z" to Deduction.Scope(
              "a" to Deduction.Equal("foo")
            )
          )
        )
      )
    )
  }

  @Test
  fun from_select() {
    val expr = PaxelParser.parse("from f in foo select f")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction.Equal("foo")
    )
  }

  @Test
  fun from_select_field() {
    val expr = PaxelParser.parse("from f in foo.input.baz select f.x.bar")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction.Equal("foo", "input", "baz", "x", "bar")
    )
  }

  @Test
  fun from_select_binop() {
    val expr = PaxelParser.parse("from f in foo select f.x + f.y")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction.Derive(
        listOf("foo", "x"),
        listOf("foo", "y")
      )
    )
  }

  @Test
  fun from_select_new() {
    val expr = PaxelParser.parse("from f in foo select new Bar {x: f.x}")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction.Scope(
        "x" to Deduction.Equal("foo", "x")
      )
    )
  }
}
