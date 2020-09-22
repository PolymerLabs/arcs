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
    fun single_variable() {
        val expr = PaxelParser.parse("x")

        val actual = expr.accept(ExpressionClaimDeducer(), Unit)

        assertThat(actual).isEqualTo(
            Deduction(context=DeductionAnalysis.Paths(listOf("x")))
        )
    }

    @Test
    fun variable_field_access() {
        val expr = PaxelParser.parse("x.foo")

        val actual = expr.accept(ExpressionClaimDeducer(), Unit)

        assertThat(actual).isEqualTo(
            Deduction(context=DeductionAnalysis.Paths(listOf("x", "foo")))
        )
    }

    @Test
    fun variable_field_access_nested() {
        val expr = PaxelParser.parse("x.foo.bar")

        val actual = expr.accept(ExpressionClaimDeducer(), Unit)

        assertThat(actual).isEqualTo(
            Deduction(context=DeductionAnalysis.Paths(listOf("x", "foo", "bar")))
        )
    }


    @Test
    fun variable_field_access_binop() {
        val expr = PaxelParser.parse("x.foo.bar + y.foo.bar.baz + z.baz.bar")

        val actual = expr.accept(ExpressionClaimDeducer(), Unit)

        assertThat(actual).isEqualTo(
            Deduction(context=DeductionAnalysis.Paths(
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
                derivations = DeductionAnalysis.Scope(
                    "foo" to listOf(DeductionAnalysis.Paths(listOf("x"))),
                    "bar" to listOf(DeductionAnalysis.Paths(listOf("y")))
                ),
                context = DeductionAnalysis.Paths(
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
                derivations = DeductionAnalysis.Scope(
                    "foo" to listOf(DeductionAnalysis.Paths(listOf("input", "foo"))),
                    "bar" to listOf(DeductionAnalysis.Paths(listOf("input", "foo", "bar")))
                ),
                context = DeductionAnalysis.Paths(
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
            Deduction(context=DeductionAnalysis.Paths(
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
            Deduction(context=DeductionAnalysis.Paths(
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
                derivations = DeductionAnalysis.Scope(
                    "foo" to listOf(DeductionAnalysis.Paths(listOf("input", "foo"))),
                    "bar" to listOf(DeductionAnalysis.Paths(
                        listOf("input", "foo", "bar"),
                        listOf("input", "foo")
                    ))
                ),
                context = DeductionAnalysis.Paths(
                    listOf("input", "foo"),
                    listOf("input", "foo", "bar"),
                    listOf("input", "foo")
                )
            )
        )
    }

    @Test
    fun field_access_nested_expr() {
        val expr = PaxelParser.parse("(new Foo {x: foo}).x")

        val actual = expr.accept(ExpressionClaimDeducer(), Unit)

        assertThat(actual).isEqualTo(
            Deduction(
                derivations = DeductionAnalysis.Scope(
                    "x" to listOf(DeductionAnalysis.Paths(listOf("foo")))
                ),
                context = DeductionAnalysis.Paths(
                    listOf("foo"),
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
                derivations = DeductionAnalysis.Scope(
                    "a" to listOf(DeductionAnalysis.Paths(
                        listOf("foo", "x"),
                        listOf("foo", "y")
                    )),
                    "b" to listOf(DeductionAnalysis.Paths(
                        listOf("foo", "y"),
                        listOf("foo", "z")
                    ))
                ),
                context = DeductionAnalysis.Paths(
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
                derivations = DeductionAnalysis.Scope(
                    "a" to listOf(
                        DeductionAnalysis.Scope(
                            "x" to listOf(DeductionAnalysis.Paths(
                                listOf("cat")
                            )),
                            "y" to listOf(DeductionAnalysis.Paths(
                                listOf("dog")
                            ))
                        ),
                        DeductionAnalysis.Paths(
                            listOf("cat"),
                            listOf("dog")
                        )
                    ),
                    "b" to listOf(DeductionAnalysis.Paths(listOf("foo"))),
                    "c" to listOf()

                ),
                context = DeductionAnalysis.Paths(
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
                derivations = DeductionAnalysis.Scope(
                    "x" to listOf(
                        DeductionAnalysis.Scope(
                            "y" to listOf(
                                DeductionAnalysis.Scope(
                                    "z" to listOf(
                                        DeductionAnalysis.Scope(
                                            "a" to listOf(
                                                DeductionAnalysis.Paths(listOf("foo"))
                                            )
                                        ),
                                        DeductionAnalysis.Paths(listOf("foo"))
                                    )
                                ),
                                DeductionAnalysis.Paths(listOf("foo"))
                            )
                        ),
                        DeductionAnalysis.Paths(listOf("foo"))
                    )
                ),
                context = DeductionAnalysis.Paths(listOf("foo"))
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
