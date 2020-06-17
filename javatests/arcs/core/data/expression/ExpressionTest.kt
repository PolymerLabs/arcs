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

package arcs.core.data.expression

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.test.assertFailsWith

/** Tests for [TypeVariable]. */
@RunWith(JUnit4::class)
class ExpressionTest {
    fun <T> eval(expression: Expression<T>) = evalExpression<T, Boolean>(expression)

    @Test
    fun testEvaluator() {
        // Test Math binary ops, field lookups, and parameter lookups
        // (2 + (3 * 4) + scope.foo + ?arg - 1) / 2
        val obj = mapOf("foo" to 42).asScope("handle")
        val expr = (2.0.asExpr() + (3.asExpr() * 4.asExpr()) + obj["foo"] + query(
            "arg"
        ) - 1.asExpr()) / 2.asExpr()

        assertThat(evalExpression<Number, Number>(expr, "arg" to 1)).isEqualTo(28)

        // Boolean ops
        assertThat(eval(1.asExpr() lt 2.asExpr())).isTrue()
        assertThat(eval(2.asExpr() lte 2.asExpr())).isTrue()
        assertThat(eval(2.asExpr() gt 1.asExpr())).isTrue()
        assertThat(eval(2.asExpr() gte 2.asExpr())).isTrue()
        assertThat(eval((1.asExpr() lt 2.asExpr()) and (2.asExpr() gt 1.asExpr()))).isTrue()

        // Unary ops
        assertThat(evalExpression<Number, Number>(-2.asExpr())).isEqualTo(-2)
        assertThat(eval(!(2.asExpr() lt 1.asExpr()))).isTrue()

        // Equality ops
        assertThat(eval(2.asExpr() eq 2.asExpr())).isTrue()
        assertThat(eval("Hello".asExpr() eq "Hello".asExpr())).isTrue()
        assertThat(eval(true.asExpr() eq true.asExpr())).isTrue()

        assertThat(eval(2.asExpr() neq 1.asExpr())).isTrue()
        assertThat(eval("Hello".asExpr() neq "World".asExpr())).isTrue()
        assertThat(eval(true.asExpr() neq false.asExpr())).isTrue()
    }

    @Test
    fun testExpressionWithScopeLookupError() {
        val obj = mapOf("foo" to 42).asScope("handle")
        val expr = 1.asExpr() + obj["bar"]
        assertFailsWith<IllegalArgumentException> {
            evalExpression<Number, Number>(expr)
        }
    }

    @Test
    fun testExpressionWithQueryParamLookupError() {
        val expr = 1.asExpr() + query("arg")
        assertFailsWith<IllegalArgumentException> {
            evalExpression<Number, Number>(expr)
        }
    }

    @Test
    fun testStringify() {
        // Test Math binary ops, field lookups, and parameter lookups
        // (2 + (3 * 4) + scope.foo + ?arg - 1) / 2
        val obj = mapOf("foo" to 42).asScope("handle")
        val expr = (2.0.asExpr() + (3.asExpr() * 4.asExpr()) + obj["foo"] + query(
            "arg"
        ) - 1.asExpr()) / 2.asExpr()
        assertThat(stringify(expr)).isEqualTo("((((2.0 + (3 * 4)) + handle.foo) + ?) - 1) / 2")
    }
}
