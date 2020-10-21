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
class ExpressionDataFlowAnalyzerTest {

  @Test
  fun literal_number() {
    val expr = PaxelParser.parse("5")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(DependencyNode.LITERAL)
  }

  @Test
  fun literal_text() {
    val expr = PaxelParser.parse("'hello'")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(DependencyNode.LITERAL)
  }

  @Test
  fun literal_boolean() {
    val expr = PaxelParser.parse("false")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(DependencyNode.LITERAL)
  }

  @Test
  fun literal_null() {
    val expr = PaxelParser.parse("null")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(DependencyNode.LITERAL)
  }

  @Test
  fun single_variable() {
    val expr = PaxelParser.parse("x")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(DependencyNode.PrimitiveValue("x"))
  }

  @Test
  fun sum_variable_literal() {
    val expr = PaxelParser.parse("x + 1")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(DependencyNode.DerivedFrom(DependencyNode.PrimitiveValue("x")))
  }

  @Test
  fun variable_field_access() {
    val expr = PaxelParser.parse("x.foo")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(DependencyNode.PrimitiveValue("x", "foo"))
  }

  @Test
  fun variable_field_access_nested() {
    val expr = PaxelParser.parse("x.foo.bar")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(DependencyNode.PrimitiveValue("x", "foo", "bar"))
  }

  @Test
  fun variable_field_access_binop() {
    val expr = PaxelParser.parse("x.foo.bar + y.foo.bar.baz + z.baz.bar")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.DerivedFrom(
        DependencyNode.PrimitiveValue("x", "foo", "bar"),
        DependencyNode.PrimitiveValue("y", "foo", "bar", "baz"),
        DependencyNode.PrimitiveValue("z", "baz", "bar")
      )
    )
  }

  @Test
  fun literal_binop() {
    val expr = PaxelParser.parse("1 + 2 + 3 + 4 + 5")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(DependencyNode.LITERAL)
  }

  @Test
  fun variable_field_access_binop_literals() {
    val expr = PaxelParser.parse("x.foo.bar + y.foo.bar.baz + z.baz.bar + 10 + 20")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.DerivedFrom(
        DependencyNode.PrimitiveValue("x", "foo", "bar"),
        DependencyNode.PrimitiveValue("y", "foo", "bar", "baz"),
        DependencyNode.PrimitiveValue("z", "baz", "bar")
      )
    )
  }

  @Test
  fun new() {
    val expr = PaxelParser.parse("new Object {foo: x, bar: y}")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.AggregateValue(
        "foo" to DependencyNode.PrimitiveValue("x"),
        "bar" to DependencyNode.PrimitiveValue("y")
      )
    )
  }

  @Test
  fun new_field_access() {
    val expr = PaxelParser.parse("new Object {foo: input.foo, bar: input.foo.bar}")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.AggregateValue(
        "foo" to DependencyNode.PrimitiveValue("input", "foo"),
        "bar" to DependencyNode.PrimitiveValue("input", "foo", "bar")
      )
    )
  }

  @Test
  fun sum_variables() {
    val expr = PaxelParser.parse("x + y")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.DerivedFrom(
        DependencyNode.PrimitiveValue("x"),
        DependencyNode.PrimitiveValue("y")
      )
    )
  }

  @Test
  fun product_same_variable() {
    val expr = PaxelParser.parse("x * x")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(DependencyNode.DerivedFrom(listOf("x")))
  }

  @Test
  fun new_field_access_binexpr() {
    val expr = PaxelParser.parse("new Object {foo: input.foo, bar: input.foo.bar + input.foo}")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.AggregateValue(
        "foo" to DependencyNode.PrimitiveValue("input", "foo"),
        "bar" to
          DependencyNode.DerivedFrom(
            DependencyNode.PrimitiveValue("input", "foo", "bar"),
            DependencyNode.PrimitiveValue("input", "foo")
          )
      )
    )
  }

  @Test
  fun field_access_nested_expr() {
    val expr = PaxelParser.parse("(new Foo {x: foo, y: bar}).x")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(DependencyNode.PrimitiveValue("foo"))
  }

  @Test
  fun field_access_nested_multi_field_expr() {
    val expr = PaxelParser.parse("(new Foo {a: foo.x + foo.y, b: foo.y + foo.z}).a")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.DerivedFrom(
        DependencyNode.PrimitiveValue("foo", "x"),
        DependencyNode.PrimitiveValue("foo", "y")
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

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.AggregateValue(
        "a" to DependencyNode.AggregateValue(
          "x" to DependencyNode.PrimitiveValue("cat"),
          "y" to DependencyNode.PrimitiveValue("dog")
        ),
        "b" to DependencyNode.PrimitiveValue("foo"),
        "c" to DependencyNode.LITERAL
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

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.AggregateValue(
        "x" to DependencyNode.AggregateValue(
          "y" to DependencyNode.AggregateValue(
            "z" to DependencyNode.AggregateValue(
              "a" to DependencyNode.PrimitiveValue("foo")
            )
          )
        )
      )
    )
  }

  @Test
  fun from_select() {
    val expr = PaxelParser.parse("from f in foo select f")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(DependencyNode.PrimitiveValue("foo"))
  }

  @Test
  fun from_select_field() {
    val expr = PaxelParser.parse("from f in foo.input.baz select f.x.bar")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(DependencyNode.PrimitiveValue("foo", "input", "baz", "x", "bar"))
  }

  @Test
  fun from_select_binop() {
    val expr = PaxelParser.parse("from f in foo select f.x + f.y")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.DerivedFrom(
        DependencyNode.PrimitiveValue("foo", "x"),
        DependencyNode.PrimitiveValue("foo", "y")
      )
    )
  }

  @Test
  fun from_select_new() {
    val expr = PaxelParser.parse("from f in foo select new Bar {x: f.x}")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.AggregateValue(
        "x" to DependencyNode.PrimitiveValue("foo", "x")
      )
    )
  }

  @Test
  fun field_access_preserved_with_substitutions() {
    val expr = PaxelParser.parse(
      """
      from x in foo
      from y in bar
      from z in baz
      select x.y.z
      """.trimIndent()
    )

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(DependencyNode.PrimitiveValue("foo", "y", "z"))
  }

  @Test
  fun nested_from_select_new() {
    val expr = PaxelParser.parse(
      """
      from x in foo
      from y in bar
      from z in baz
      select new Bla {
        a: x.a,
        b: y.b,
        c: z.c
      }
      """.trimIndent()
    )

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.AggregateValue(
        "a" to DependencyNode.PrimitiveValue("foo", "a"),
        "b" to DependencyNode.PrimitiveValue("bar", "b"),
        "c" to DependencyNode.PrimitiveValue("baz", "c")
      )
    )
  }
}
