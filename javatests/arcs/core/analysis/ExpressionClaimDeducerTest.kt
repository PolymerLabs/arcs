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

    assertThat(actual).isEqualTo(Deduction())
  }

  @Test
  fun literal_text() {
    val expr = PaxelParser.parse("'hello'")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(Deduction())
  }

  @Test
  fun literal_boolean() {
    val expr = PaxelParser.parse("false")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(Deduction())
  }

  @Test
  fun literal_null() {
    val expr = PaxelParser.parse("null")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(Deduction())
  }

  @Test
  fun single_variable() {
    val expr = PaxelParser.parse("x")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction(context = Deduction.Analysis.Paths(listOf("x")))
    )
  }

  @Test
  fun variable_field_access() {
    val expr = PaxelParser.parse("x.foo")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction(context = Deduction.Analysis.Paths(listOf("x", "foo")))
    )
  }

  @Test
  fun variable_field_access_nested() {
    val expr = PaxelParser.parse("x.foo.bar")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction(context = Deduction.Analysis.Paths(listOf("x", "foo", "bar")))
    )
  }

  @Test
  fun variable_field_access_binop() {
    val expr = PaxelParser.parse("x.foo.bar + y.foo.bar.baz + z.baz.bar")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction(context = Deduction.Analysis.Paths(
        listOf("x", "foo", "bar"),
        listOf("y", "foo", "bar", "baz"),
        listOf("z", "baz", "bar")
      ))
    )
  }

  @Test
  fun variable_field_access_binop_literals() {
    val expr = PaxelParser.parse("x.foo.bar + y.foo.bar.baz + z.baz.bar + 10 + 20")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction(context = Deduction.Analysis.Paths(
        listOf("x", "foo", "bar"),
        listOf("y", "foo", "bar", "baz"),
        listOf("z", "baz", "bar")
      ))
    )
  }

  @Test
  fun new() {
    val expr = PaxelParser.parse("new Object {foo: x, bar: y}")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction(
        scope = Deduction.Analysis.Scope(
          "foo" to listOf(
            Deduction.Analysis.Derive(
              Deduction.Analysis.Paths(listOf("x"))
            )
          ),
          "bar" to listOf(
            Deduction.Analysis.Derive(
              Deduction.Analysis.Paths(listOf("y"))
            )
          )
        ),
        context = Deduction.Analysis.Paths(
          listOf("x"),
          listOf("y")
        )
      )
    )
  }

  @Test
  fun new_field_access() {
    val expr = PaxelParser.parse("new Object {foo: input.foo, bar: input.foo.bar}")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction(
        scope = Deduction.Analysis.Scope(
          "foo" to listOf(
            Deduction.Analysis.Derive(
              Deduction.Analysis.Paths(listOf("input", "foo"))
            )
          ),
          "bar" to listOf(
            Deduction.Analysis.Derive(
              Deduction.Analysis.Paths(listOf("input", "foo", "bar"))
            )
          )
        ),
        context = Deduction.Analysis.Paths(
          listOf("input", "foo"),
          listOf("input", "foo", "bar")
        )
      )
    )
  }

  @Test
  fun sum_variables() {
    val expr = PaxelParser.parse("x + y")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction(context = Deduction.Analysis.Paths(
        listOf("x"),
        listOf("y")
      ))
    )
  }

  @Test
  fun sum_variables_field_access() {
    val expr = PaxelParser.parse("x.foo + y.foo.bar")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction(context = Deduction.Analysis.Paths(
        listOf("x", "foo"),
        listOf("y", "foo", "bar")
      ))
    )
  }

  @Test
  fun new_field_access_binexpr() {
    val expr = PaxelParser.parse("new Object {foo: input.foo, bar: input.foo.bar + input.foo}")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction(
        scope = Deduction.Analysis.Scope(
          "foo" to listOf(
            Deduction.Analysis.Derive(
              Deduction.Analysis.Paths(listOf("input", "foo"))
            )
          ),
          "bar" to listOf(
            Deduction.Analysis.Derive(
              Deduction.Analysis.Paths(
                listOf("input", "foo", "bar"),
                listOf("input", "foo")
              )
            )
          )
        ),
        context = Deduction.Analysis.Paths(
          listOf("input", "foo"),
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
      Deduction(
        scope = Deduction.Analysis.Scope(
          "x" to listOf(
            Deduction.Analysis.Derive(
              Deduction.Analysis.Paths(listOf("foo"))
            )
          )
        ),
        context = Deduction.Analysis.Paths(
          listOf("foo"),
          listOf("bar"),
          listOf("x")
        )
      )
    )
  }

  @Test
  fun field_access_nested_multi_field_expr() {
    val expr = PaxelParser.parse("(new Foo {a: foo.x + foo.y, b: foo.y + foo.z}).a")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction(
        scope = Deduction.Analysis.Scope(
          "a" to listOf(
            Deduction.Analysis.Derive(
              Deduction.Analysis.Paths(
                listOf("foo", "x"),
                listOf("foo", "y")
              )
            )
          )
        ),
        context = Deduction.Analysis.Paths(
          listOf("foo", "x"),
          listOf("foo", "y"),
          listOf("foo", "y"),
          listOf("foo", "z"),
          listOf("a")
        )
      )
    )
  }

  @Test
  fun new_nested() {
    val expr = PaxelParser.parse("new Foo {a: (new Bar {x: cat, y: dog}), b: foo, c: 5}")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction(
        scope = Deduction.Analysis.Scope(
          "a" to listOf(
            Deduction.Analysis.Derive(
              Deduction.Analysis.Scope(
                "x" to listOf(
                  Deduction.Analysis.Derive(
                    Deduction.Analysis.Paths(listOf("cat"))
                  )
                ),
                "y" to listOf(
                  Deduction.Analysis.Derive(
                    Deduction.Analysis.Paths(listOf("dog"))
                  )
                )
              )
            ),
            Deduction.Analysis.Derive(
              Deduction.Analysis.Paths(
                listOf("cat"),
                listOf("dog")
              )
            )
          ),
          "b" to listOf(
            Deduction.Analysis.Derive(
              Deduction.Analysis.Paths(listOf("foo"))
            )
          ),
          "c" to listOf()
        ),
        context = Deduction.Analysis.Paths(
          listOf("cat"),
          listOf("dog"),
          listOf("foo")
        )
      )
    )
  }

  @Test
  fun new_deeply_nested() {
    val expr = PaxelParser.parse(
      "new Foo {x: (new Bar {y: (new Baz {z: (new Buz {a: foo}) }) }) }"
    )

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction(
        scope = Deduction.Analysis.Scope(
          "x" to listOf(
            Deduction.Analysis.Derive(
              Deduction.Analysis.Scope(
                "y" to listOf(
                  Deduction.Analysis.Derive(
                    Deduction.Analysis.Scope(
                      "z" to listOf(
                        Deduction.Analysis.Derive(
                          Deduction.Analysis.Scope(
                            "a" to listOf(
                              Deduction.Analysis.Derive(
                                Deduction.Analysis.Paths(
                                  listOf("foo")
                                )
                              )
                            )
                          )
                        ),
                        Deduction.Analysis.Derive(
                          Deduction.Analysis.Paths(listOf("foo"))
                        )
                      )
                    )
                  ),
                  Deduction.Analysis.Derive(
                    Deduction.Analysis.Paths(listOf("foo"))
                  )
                )
              )
            ),
            Deduction.Analysis.Derive(
              Deduction.Analysis.Paths(listOf("foo"))
            )
          )
        ),
        context = Deduction.Analysis.Paths(listOf("foo"))
      )
    )
  }

  @Test
  fun from_select() {
    val expr = PaxelParser.parse("from f in foo select f")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction(
        context = Deduction.Analysis.Paths(
          Deduction.Analysis.Equal(
            Deduction.Analysis.Path("foo")
          )
        ),
        aliases = mapOf("f" to Deduction.Analysis.Paths(listOf("foo")))
      )
    )
  }

  @Test
  fun from_select_field() {
    val expr = PaxelParser.parse("from f in foo.input.baz select f.x.bar")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction(
        context = Deduction.Analysis.Paths(
          Deduction.Analysis.Equal(
            Deduction.Analysis.Path("foo", "input", "baz", "x", "bar")
          )
        ),
        aliases = mapOf("f" to Deduction.Analysis.Paths(listOf("foo", "input", "baz")))
      )
    )
  }

  @Test
  fun from_select_binop() {
    val expr = PaxelParser.parse("from f in foo select f.x + f.y")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction(
        context = Deduction.Analysis.Paths(
          Deduction.Analysis.Derive(Deduction.Analysis.Path("foo", "x")),
          Deduction.Analysis.Derive(Deduction.Analysis.Path("foo", "y"))
        ),
        aliases = mapOf("f" to Deduction.Analysis.Paths(listOf("foo")))
      )
    )
  }

  @Test
  fun from_select_new() {
    val expr = PaxelParser.parse("from f in foo select new Bar {x: f.x}")

    val actual = expr.accept(ExpressionClaimDeducer(), Unit)

    assertThat(actual).isEqualTo(
      Deduction(
        scope = Deduction.Analysis.Scope(
          "x" to listOf(
            Deduction.Analysis.Derive(
              Deduction.Analysis.Paths(listOf("foo", "x"))
            )
          )
        ),
        context = Deduction.Analysis.Paths(listOf("foo", "x")),
        aliases = mapOf("f" to Deduction.Analysis.Paths(listOf("foo")))
      )
    )
  }

//    /** TODO(alxr): Uncomment when visitor is more developed. */
//    @Test
//    fun new_nested_select() {
//        val expr = PaxelParser.parse("new Foo {a: from b in bar where b.x > 42 select b.y + b.z}")
//
//        val actual = expr.accept(ExpressionClaimDeducer(), Unit)
//    }
}
