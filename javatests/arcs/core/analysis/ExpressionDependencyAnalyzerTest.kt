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
class ExpressionDependencyAnalyzerTest {

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

  /*  (x)
   */
  @Test
  fun single_variable() {
    val expr = PaxelParser.parse("x")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(DependencyNode.Equal("x"))
  }

  /* ((x))
   */
  @Test
  fun sum_variable_literal() {
    val expr = PaxelParser.parse("x + 1")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(DependencyNode.Nodes(DependencyNode.Derived("x")))
  }

  /* (x) --> (foo)
   */
  @Test
  fun variable_field_access() {
    val expr = PaxelParser.parse("x.foo")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(DependencyNode.Equal("x", "foo"))
  }

  /* (x) --> (foo) --> (bar)
   */
  @Test
  fun variable_field_access_nested() {
    val expr = PaxelParser.parse("x.foo.bar")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(DependencyNode.Equal("x", "foo", "bar"))
  }

  /* (x) --> (foo) --> ((bar))
   * (y) --> (foo) --> (bar) --> ((baz))
   * (z) --> (baz) --> ((bar))
   */
  @Test
  fun variable_field_access_binop() {
    val expr = PaxelParser.parse("x.foo.bar + y.foo.bar.baz + z.baz.bar")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.Nodes(
        DependencyNode.Derived("x", "foo", "bar"),
        DependencyNode.Derived("y", "foo", "bar", "baz"),
        DependencyNode.Derived("z", "baz", "bar")
      )
    )
  }

  @Test
  fun literal_binop() {
    val expr = PaxelParser.parse("1 + 2 + 3 + 4 + 5")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(DependencyNode.LITERAL)
  }

  /* (x) --> (foo) --> ((bar))
   * (y) --> (foo) --> (bar) --> ((baz))
   * (z) --> (baz) --> ((bar))
   */
  @Test
  fun variable_field_access_binop_literals() {
    val expr = PaxelParser.parse("x.foo.bar + y.foo.bar.baz + z.baz.bar + 10 + 20")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.Nodes(
        DependencyNode.Derived("x", "foo", "bar"),
        DependencyNode.Derived("y", "foo", "bar", "baz"),
        DependencyNode.Derived("z", "baz", "bar")
      )
    )
  }

  /* (x)  <-- (foo)-|[Object]
   * (y)  <-- (bar)-|
   */
  @Test
  fun new() {
    val expr = PaxelParser.parse("new Object {foo: x, bar: y}")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.Nodes(
        "foo" to DependencyNode.Equal("x"),
        "bar" to DependencyNode.Equal("y")
      )
    )
  }

  /* (input) --> (foo)  <--------- (foo)-|[Object]
   *              \ --> (bar)  <-- (bar)-|
   */
  @Test
  fun new_field_access() {
    val expr = PaxelParser.parse("new Object {foo: input.foo, bar: input.foo.bar}")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.Nodes(
        "foo" to DependencyNode.Equal("input", "foo"),
        "bar" to DependencyNode.Equal("input", "foo", "bar")
      )
    )
  }

  /* ((x))
   * ((y))
   */
  @Test
  fun sum_variables() {
    val expr = PaxelParser.parse("x + y")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.Nodes(
        DependencyNode.Derived("x"),
        DependencyNode.Derived("y")
      )
    )
  }

  /* ((x))
   */
  @Test
  fun product_same_variable() {
    val expr = PaxelParser.parse("x * x")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(DependencyNode.Nodes(DependencyNode.Derived("x")))
  }

  /* (input) --> ((foo))  <---------(bar)-|[Object]
   *    |         \ --> ((bar)) <---/     |
   *    \ -----> (foo)   <--------- (foo)-|
   */
  @Test
  fun new_field_access_binexpr() {
    val expr = PaxelParser.parse("new Object {foo: input.foo, bar: input.foo.bar + input.foo}")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.Nodes(
        "foo" to DependencyNode.Equal("input", "foo"),
        "bar" to DependencyNode.Derived("input", "foo", "bar"),
        "bar" to DependencyNode.Derived("input", "foo")
      )
    )
    assertThat(actual).isEqualTo(
      DependencyNode.Nodes(
        "foo" to DependencyNode.Equal("input", "foo"),
        "bar" to DependencyNode.Nodes(
          DependencyNode.Derived("input", "foo", "bar"),
          DependencyNode.Derived("input", "foo")
        )
      )
    )
  }

  /* (foo)
   */
  @Test
  fun field_access_nested_expr() {
    val expr = PaxelParser.parse("(new Foo {x: foo, y: bar}).x")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(DependencyNode.Equal("foo"))
  }

  /* (foo) --> ((x))
   *   \--> ((y))
   */
  @Test
  fun field_access_nested_multi_field_expr() {
    val expr = PaxelParser.parse("(new Foo {a: foo.x + foo.y, b: foo.y + foo.z}).a")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.Nodes(
        DependencyNode.Derived("foo", "x"),
        DependencyNode.Derived("foo", "y")
      )
    )
  }

  /*  (cat) <-- (x)-|[Bar] <--(a)-|[Foo]
   *  (dog) <-- (y)-|             |
   *  (foo) <-----------------(b)-|
   *                          (c)-|
   */
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
      """.trimIndent()
    )

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.Nodes(
        "a" to DependencyNode.Nodes(
          "x" to DependencyNode.Equal("cat"),
          "y" to DependencyNode.Equal("dog")
        ),
        "b" to DependencyNode.Equal("foo"),
        "c" to DependencyNode.LITERAL
      )
    )
  }

  /* (foo) <-- (a)-|[Buz] <-- (z)-|[Baz] <-- (y)-|[Bar]  <-- (x)|[Foo]
   */
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
      DependencyNode.Nodes(
        "x" to DependencyNode.Nodes(
          "y" to DependencyNode.Nodes(
            "z" to DependencyNode.Nodes(
              "a" to DependencyNode.Equal("foo")
            )
          )
        )
      )
    )
  }

  /* (foo)
   */
  @Test
  fun from_select() {
    val expr = PaxelParser.parse("from f in foo select f")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(DependencyNode.Equal("foo"))
  }

  /* (foo) --> (input) --> (baz) --> (x) --> (bar)
   */
  @Test
  fun from_select_field() {
    val expr = PaxelParser.parse("from f in foo.input.baz select f.x.bar")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(DependencyNode.Equal("foo", "input", "baz", "x", "bar"))
  }

  /* (foo) --> ((x))
   *   \-----> ((y))
   */
  @Test
  fun from_select_binop() {
    val expr = PaxelParser.parse("from f in foo select f.x + f.y")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.Nodes(
        DependencyNode.Derived("foo", "x"),
        DependencyNode.Derived("foo", "y")
      )
    )
  }

  /* (foo) --> (x) <-- (x)|[Bar]
   */
  @Test
  fun from_select_new() {
    val expr = PaxelParser.parse("from f in foo select new Bar {x: f.x}")

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.Nodes(
        "x" to DependencyNode.Equal("foo", "x")
      )
    )
  }

  /* (foo) --> (y) --> (z)
   */
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

    assertThat(actual).isEqualTo(DependencyNode.Equal("foo", "y", "z"))
  }

  /* (foo) --> (a) <-- (a)-|[Bla]
   * (bar) --> (b) <-- (b)-|
   * (baz) --> (z) <-- (c)-|
   */
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
      DependencyNode.Nodes(
        "a" to DependencyNode.Equal("foo", "a"),
        "b" to DependencyNode.Equal("bar", "b"),
        "c" to DependencyNode.Equal("baz", "c")
      )
    )
  }

  /* (foo) -> (bar) -> (baz)
   */
  @Test
  fun from_let_select() {
    val expr = PaxelParser.parse(
      """
      from f in foo
      let b = f.bar
      select b.baz
      """.trimIndent()
    )

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.Equal("foo", "bar", "baz")
    )
  }

  /* (foo) --> ((x))
   *   \-----> ((y))
   *    \----> ((z))
   */
  @Test
  fun from_let_binop_select() {
    val expr = PaxelParser.parse(
      """
      from f in foo
      let a = (f.x + f.y)
      select a + f.z
      """.trimIndent()
    )

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.Nodes(
        DependencyNode.Derived("foo", "x"),
        DependencyNode.Derived("foo", "y"),
        DependencyNode.Derived("foo", "z")
      )
    )
  }

  /* (foo) --> (a)
   */
  @Test
  fun from_let_new_select() {
    val expr = PaxelParser.parse(
      """
      from f in foo
      let x = (new Foo {
        y: new Foo {
          z: f.a
        }
      })
      select x.y.z
      """.trimIndent()
    )

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(DependencyNode.Equal("foo", "a"))
  }

  /* (foo) --> ((x))
   *   \        ||
   *    \       V
   *     \----> (y)
   */
  @Test
  fun from_where_select() {
    val expr = PaxelParser.parse(
      """
      from f in foo
      where f.x > 10
      select f.y
      """.trimIndent()
    )

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.Equal("foo", "y", influence = setOf(DependencyNode.Derived("foo", "x")))
    )
  }

  /* (foo) --> ((y))
   *   \-> ((z)) ||
   *    \     \\ ||
   *     \      VV
   *      \---> (x)
   */
  @Test
  fun from_where_binop_select() {
    val expr = PaxelParser.parse(
      """
      from f in foo
      where (f.y + f.z) > 10
      select f.x
      """.trimIndent()
    )

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.Equal("foo", "x",
        influence = setOf(
          DependencyNode.Derived("foo", "y"),
          DependencyNode.Derived("foo", "z")
        )
      )
    )
  }

  /* (foo) --> ((x)) ===
   *   \          \\    \\
   *    \          V    ||
   *     \-----> ((y))  ||
   *             ^      ||
   *            //     //
   * (bar) --> ((x))  //
   *   \        \\   //
   *    \        \\ //
   *     \        V V
   *      \----> ((y))
   */
  @Test
  fun from_from_where_select() {
    val expr = PaxelParser.parse(
      """
      from f in foo
      from b in bar
      where (f.x + b.x) > 10
      select f.y + b.y
      """.trimIndent()
    )

    val actual = expr.analyze()

    val fooInfluence = DependencyNode.Derived("foo", "x")
    val barInfluence = DependencyNode.Derived("bar", "x")

    assertThat(actual).isEqualTo(
      DependencyNode.Nodes(
        DependencyNode.Derived("foo", "y", influence = setOf(fooInfluence, barInfluence)),
        DependencyNode.Derived("bar", "y", influence = setOf(fooInfluence, barInfluence))
      )
    )
  }

  /* (foo) ----> ((x))
   *   \--> ((z)) ||
   *    \     \\  ||
   *     \     \\ ||
   *      \     V V
   *       \---> (y)
   */
  @Test
  fun from_where_where_select() {
    val expr = PaxelParser.parse(
      """
      from f in foo
      where f.x > 10
      where f.z < 100
      select f.y
      """.trimIndent()
    )

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.Equal("foo", "y",
        influence = setOf(
          DependencyNode.Derived("foo", "x"),
          DependencyNode.Derived("foo", "z")
        )
      )
    )
  }

  /* (foo) --> ((x)) ===
   *   \          \\    \\
   *    \          V    ||
   *     \-----> ((y))  ||
   *             ^      ||
   *            //     //
   * (bar) --> ((x))  //
   *   \        \\   //
   *    \        \\ //
   *     \        V V
   *      \----> ((y))
   */
  @Test
  fun from_where_from_where_select() {
    val expr = PaxelParser.parse(
      """
      from f in foo
      where f.x > 10
      from b in bar
      where b.x < 10
      select f.y + b.y
      """.trimIndent()
    )

    val actual = expr.analyze()

    val fooInfluence = DependencyNode.Derived("foo", "x")
    val barInfluence = DependencyNode.Derived("bar", "x")

    assertThat(actual).isEqualTo(
      DependencyNode.Nodes(
        DependencyNode.Derived("foo", "y", influence = setOf(fooInfluence, barInfluence)),
        DependencyNode.Derived("bar", "y", influence = setOf(fooInfluence, barInfluence))
      )
    )
  }

  /* (foo) --> ((x))
   *   \        ||
   *    \       V
   *     \----> (y)
   */
  @Test
  fun from_where_let_select() {
    val expr = PaxelParser.parse(
      """
      from f in foo
      where f.x > 10
      let y = f.y
      select y
      """.trimIndent()
    )

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.Equal("foo", "y", influence = setOf(DependencyNode.Derived("foo", "x")))
    )
  }

  /* (foo) --> ((y))
   *   \       //
   *    \      V
   *     \--> (x) <--- (a)-|[Foo]
   *      \--> (z) <-- (b)-|
   */
  @Test
  fun sub_from_where_select_expr() {
    val expr = PaxelParser.parse(
      """
      new Foo {
        a: (from f in foo where f.y > 12 select f.x),
        b: foo.z
      }
      """.trimIndent()
    )

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.Nodes(
        "a" to DependencyNode.Equal(
          "foo", "x",
          influence = setOf(DependencyNode.Derived("foo", "y"))
        ),
        "b" to DependencyNode.Equal("foo", "z")
      )
    )
  }

  /* (foo) --> ((x))======
   *   \                 \\
   *    \                 V
   *     \----> (y)  <-- (a)-|[Foo]
   */
  @Test
  fun from_where_select_new() {
    val expr = PaxelParser.parse(
      """
      from f in foo
      where f.x > 10
      select new Foo { a: f.y }
      """.trimIndent()
    )

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.Nodes(
        DependencyNode.Equal(
          "a",
          dependency = setOf(DependencyNode.Equal("foo", "y")),
          influence = setOf(DependencyNode.Derived("foo", "x"))
        )
      )
    )
  }

 /* (input) --> ((x))===========
  *    \                   \\  \\
  *     \                  ||  V
  *      \--> (x) <--------V--(a)-|[Bar]
  *       \---> ((y)) <--(b)-----|
  *        \---> ((z)) <-/
  */
  @Test
  fun from_where_select_new_derived() {
    val expr = PaxelParser.parse(
      """
      from f in foo
      where f.x > 10
      select new Bar {
        a: f.x,
        b: f.y + f.z
      }
      """.trimIndent()
    )

    val actual = expr.analyze()

    assertThat(actual).isEqualTo(
      DependencyNode.Nodes(
        DependencyNode.Equal(
          "a",
          dependency = setOf(DependencyNode.Equal("foo", "x")),
          influence = setOf(DependencyNode.Derived("foo", "x"))
        ),
        DependencyNode.Equal(
          "b",
          dependency = setOf(
            DependencyNode.Derived("foo", "y"),
            DependencyNode.Derived("foo", "z")
          ),
          influence = setOf(DependencyNode.Derived("foo", "x"))
        )
      )
    )
  }
}
