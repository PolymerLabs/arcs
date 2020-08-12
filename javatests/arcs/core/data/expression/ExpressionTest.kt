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

import arcs.core.data.expression.Expression.Scope
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [Expression]. */
@RunWith(JUnit4::class)
class ExpressionTest {
    fun <T> evalBool(expression: Expression<T>) = evalExpression(
        expression,
        currentScope
    )

    fun <T> evalNum(expression: Expression<T>) = evalExpression(
        expression = expression, currentScope = currentScope
    )

    val numbers = (1..10).toList()

    val currentScope = CurrentScope(
        mutableMapOf(
            "blah" to 10,
            "baz" to mapOf("x" to 24).asScope(),
            "foos" to listOf(
                mapOf("val" to 0, "words" to listOf("Lorem", "ipsum")).asScope(),
                mapOf("val" to 10, "words" to listOf<String>()).asScope(),
                mapOf("val" to 20, "words" to listOf("dolor", "sit", "amet")).asScope()
            ),
            "numbers" to numbers,
            "emptySeq" to emptySequence<Any>()
        )
    )

    @Test
    fun evaluate_binaryOps() {
        // numeric binary ops (ints)
        assertThat(evalNum(2.asExpr() + 1.asExpr())).isEqualTo(3)
        assertThat(evalNum(2.asExpr() - 1.asExpr())).isEqualTo(1)
        assertThat(evalNum(2.asExpr() * 2.asExpr())).isEqualTo(4)
        assertThat(evalNum(6.asExpr() / 3.asExpr())).isEqualTo(2)

        // floats
        assertThat(evalNum(2f.asExpr() + 1.asExpr())).isEqualTo(3)
        assertThat(evalNum(2f.asExpr() - 1.asExpr())).isEqualTo(1)
        assertThat(evalNum(2f.asExpr() * 2.asExpr())).isEqualTo(4)
        assertThat(evalNum(6f.asExpr() / 3.asExpr())).isEqualTo(2)

        // longs
        assertThat(evalNum(2L.asExpr() + 1.asExpr())).isEqualTo(3)
        assertThat(evalNum(2L.asExpr() - 1.asExpr())).isEqualTo(1)
        assertThat(evalNum(2L.asExpr() * 2.asExpr())).isEqualTo(4)
        assertThat(evalNum(6L.asExpr() / 3.asExpr())).isEqualTo(2)

        // big ints
        assertThat(evalNum(2.toBigInteger().asExpr() + 1.asExpr())).isEqualTo(3.toBigInteger())
        assertThat(evalNum(2.toBigInteger().asExpr() - 1.asExpr())).isEqualTo(1.toBigInteger())
        assertThat(evalNum(2.toBigInteger().asExpr() * 2.asExpr())).isEqualTo(4.toBigInteger())
        assertThat(evalNum(6.toBigInteger().asExpr() / 3.asExpr())).isEqualTo(2.toBigInteger())
    }

    @Test
    fun evaluate_fieldOps() {
        // field ops
        assertThat(evalNum(num("blah"))).isEqualTo(10)
        assertThat(evalNum(scope("baz").get<Number>("x"))).isEqualTo(24)
    }

    @Test
    fun evaluate_fieldOps_nullSafe() {
        @Suppress("UNCHECKED_CAST")
        val paxelExpr = PaxelParser.parse("from f in foos select first(f.words)?.word")
            as Expression<Sequence<String?>>

        val scope = CurrentScope(
            mutableMapOf(
                "foos" to listOf(
                    mapOf("words" to listOf(
                        mapOf("word" to "Lorem").asScope(),
                        mapOf("word" to "ipsum").asScope()
                    )).asScope(),
                    mapOf("words" to listOf<Scope>()).asScope(),
                    mapOf("words" to listOf(
                        mapOf("word" to "dolor").asScope(),
                        mapOf("word" to "sit").asScope(),
                        mapOf("word" to "amet").asScope()
                    )).asScope()
                )
            )
        )

        assertThat(
            evalExpression(paxelExpr, scope).toList()
        ).containsExactly(
            "Lorem", null, "dolor"
        )
    }

    @Test
    fun evaluate_queryOps() {
        // query ops
        assertThat(
            evalExpression<Number>(
                query("arg"), currentScope, "arg" to 42
            )
        ).isEqualTo(42)
    }

    @Test
    fun evaluate_booleanOps() {
        // Boolean ops
        assertThat(evalBool(1.asExpr() lt 2.asExpr())).isTrue()
        assertThat(evalBool(2.asExpr() lt 1.asExpr())).isFalse()
        assertThat(evalBool(2.asExpr() lte 2.asExpr())).isTrue()
        assertThat(evalBool(3.asExpr() lte 2.asExpr())).isFalse()
        assertThat(evalBool(2.asExpr() gt 1.asExpr())).isTrue()
        assertThat(evalBool(1.asExpr() gt 2.asExpr())).isFalse()
        assertThat(evalBool(1.asExpr() gte 2.asExpr())).isFalse()
        assertThat(evalBool((1.asExpr() lt 2.asExpr()) and (2.asExpr() gt 1.asExpr()))).isTrue()
        assertThat(evalBool((2.asExpr() lt 1.asExpr()) and (2.asExpr() gt 1.asExpr()))).isFalse()
        assertThat(evalBool((1.asExpr() lt 2.asExpr()) or (2.asExpr() lt 1.asExpr()))).isTrue()
        assertThat(evalBool((1.asExpr() gt 2.asExpr()) or (2.asExpr() lt 1.asExpr()))).isFalse()

        // Sanity check longs and widening
        assertThat(evalBool(1L.asExpr() lt 2.asExpr())).isTrue()
        assertThat(evalBool(2L.asExpr() lt 1.asExpr())).isFalse()
        assertThat(evalBool(2L.asExpr() lte 2.asExpr())).isTrue()
        assertThat(evalBool(3L.asExpr() lte 2.asExpr())).isFalse()
        assertThat(evalBool(2L.asExpr() gt 1.asExpr())).isTrue()
        assertThat(evalBool(1L.asExpr() gt 2.asExpr())).isFalse()
        assertThat(evalBool(1L.asExpr() gte 2.asExpr())).isFalse()
        assertThat(evalBool((1L.asExpr() lt 2.asExpr()) and (2L.asExpr() gt 1.asExpr()))).isTrue()
        assertThat(evalBool((2L.asExpr() lt 1.asExpr()) and (2L.asExpr() gt 1.asExpr()))).isFalse()
        assertThat(evalBool((1L.asExpr() lt 2.asExpr()) or (2L.asExpr() lt 1.asExpr()))).isTrue()
        assertThat(evalBool((1L.asExpr() gt 2.asExpr()) or (2L.asExpr() lt 1.asExpr()))).isFalse()

        // Sanity check BigInteger
        assertThat(evalBool(1.toBigInteger().asExpr() lt 2.asExpr())).isTrue()
        assertThat(evalBool(2.toBigInteger().asExpr() lt 1.asExpr())).isFalse()
        assertThat(evalBool(2.toBigInteger().asExpr() lte 2.asExpr())).isTrue()
        assertThat(evalBool(3.toBigInteger().asExpr() lte 2.asExpr())).isFalse()
        assertThat(evalBool(2.toBigInteger().asExpr() gt 1.asExpr())).isTrue()
        assertThat(evalBool(1.toBigInteger().asExpr() gt 2.asExpr())).isFalse()
        assertThat(evalBool(1.toBigInteger().asExpr() gte 2.asExpr())).isFalse()
        assertThat(evalBool((1.toBigInteger().asExpr() lt 2.asExpr()) and
            (2.toBigInteger().asExpr() gt 1.toBigInteger().asExpr()))).isTrue()
        assertThat(evalBool((2.toBigInteger().asExpr() lt 1.asExpr()) and
            (2.toBigInteger().asExpr() gt 1.toBigInteger().asExpr()))).isFalse()
        assertThat(evalBool((1.toBigInteger().asExpr() lt 2.asExpr()) or
            (2.toBigInteger().asExpr() lt 1.toBigInteger().asExpr()))).isTrue()
        assertThat(evalBool((1.toBigInteger().asExpr() gt 2.asExpr()) or
            (2.toBigInteger().asExpr() lt 1.toBigInteger().asExpr()))).isFalse()
    }

    @Test
    fun evaluate_unaryOps() {
        // Unary ops
        assertThat(evalNum(-2.asExpr())).isEqualTo(-2)
        assertThat(evalBool(!(2.asExpr() lt 1.asExpr()))).isTrue()
        assertThat(evalBool(!(2.asExpr() gt 1.asExpr()))).isFalse()

        assertThat(evalNum(-2L.asExpr())).isEqualTo(-2)
        assertThat(evalBool(!(2L.asExpr() lt 1.asExpr()))).isTrue()
        assertThat(evalBool(!(2L.asExpr() gt 1.asExpr()))).isFalse()

        assertThat(evalNum(-2.toBigInteger().asExpr())).isEqualTo(-2.toBigInteger())
        assertThat(evalBool(!(2.toBigInteger().asExpr() lt 1.asExpr()))).isTrue()
        assertThat(evalBool(!(2.toBigInteger().asExpr() gt 1.asExpr()))).isFalse()
    }

    @Test
    fun evaluate_equalityOps() {
        // Equality ops
        assertThat(evalBool(2.asExpr() eq 2.asExpr())).isTrue()
        assertThat(evalBool(2.asExpr() eq 1.asExpr())).isFalse()
        assertThat(evalBool("Hello".asExpr() eq "Hello".asExpr())).isTrue()
        assertThat(evalBool("Hello".asExpr() eq "World".asExpr())).isFalse()
        assertThat(evalBool(true.asExpr() eq true.asExpr())).isTrue()
        assertThat(evalBool(true.asExpr() eq false.asExpr())).isFalse()
        assertThat(evalBool(nullExpr() eq nullExpr())).isTrue()
        assertThat(evalBool(nullExpr() eq "World".asExpr())).isFalse()
        assertThat(evalBool(2.asExpr() neq 1.asExpr())).isTrue()
        assertThat(evalBool(2.asExpr() neq 2.asExpr())).isFalse()
        assertThat(evalBool("Hello".asExpr() neq "World".asExpr())).isTrue()
        assertThat(evalBool("Hello".asExpr() neq "Hello".asExpr())).isFalse()
        assertThat(evalBool(true.asExpr() neq false.asExpr())).isTrue()
        assertThat(evalBool(true.asExpr() neq true.asExpr())).isFalse()
        assertThat(evalBool(nullExpr() neq nullExpr())).isFalse()
        assertThat(evalBool(7.asExpr() neq nullExpr())).isTrue()
    }

    @Test
    fun evaluate_ifNullOp() {
        assertThat(evalNum(5.asExpr() ifNull 2.asExpr())).isEqualTo(5)
        assertThat(evalNum(nullExpr() ifNull 2.asExpr())).isEqualTo(2)
        assertThat(evalNum(nullExpr() ifNull nullExpr())).isEqualTo(null)
    }

    @Test
    fun evaluate_complexExpression() {
        // Test complex expression
        // (2 + (3 * 4) + blah + ?arg - 1) / 2
        val expr = (2.0.asExpr() + (3.asExpr() * 4.asExpr()) + num("blah") + query(
            "arg"
        ) - 1.asExpr()) / 2.asExpr()

        assertThat(evalExpression(expr, currentScope, "arg" to 1)).isEqualTo(12)
    }

    @Test
    fun evaluate_paxel_from() {
        val fromExpr = from("p") on lookup("numbers") select num("p")
        assertThat(
            evalExpression(fromExpr, currentScope).toList()
        ).isEqualTo(numbers)
    }

    @Test
    fun evaluate_paxel_from_nested() {
        // from p in numbers
        // from foo in foos
        // select p + foo.val
        val fromExpr = from("p") on lookup("numbers") from("foo") on
            lookup("foos") select (num("p") + scope("foo")["val"])
        assertThat(evalExpression(fromExpr, currentScope).toList()).containsExactlyElementsIn(1..30)
    }

    @Test
    fun evaluate_paxel_from_inner() {
        // from foo in foos
        // from word in foo.words
        // select word
        val fromExpr = from("foo") on lookup("foos") from("word") on scope("foo")["words"] select
            text("word")
        assertThat(evalExpression(fromExpr, currentScope).toList()).containsExactly(
            "Lorem", "ipsum", "dolor", "sit", "amet"
        )
    }

    @Test
    fun evaluate_paxel_select() {
        val selectExpr = from("p") on lookup("numbers") select 1.asExpr()
        assertThat(
            evalExpression(selectExpr, currentScope).toList()
        ).isEqualTo(numbers.map { 1 })
    }

    @Test
    fun evaluate_paxel_where() {
        val whereExpr = from("p") on lookup("numbers") where
            (num("p") eq 5.asExpr()) select num("p")
        assertThat(
            evalExpression(whereExpr, currentScope).toList()
        ).isEqualTo(listOf(5))
    }

    @Test
    fun evaluate_paxel_let() {
        // FORM foo IN foos
        // LET cnt = count(foo.words)
        // SELECT NEW Thing {
        //   val: foo.val,
        //   count: cnt,
        //   sum: foo.val + cnt
        // }
        val expr = from("foo") on lookup("foos") let("cnt") be
            count(scope("foo").get<Sequence<String>>("words")) select new("Thing")(
            "val" to scope("foo").get<Number>("val"),
            "count" to num("cnt"),
            "sum" to scope("foo").get<Number>("val") + num("cnt")
        )

        assertThat(evalExpression(expr, currentScope).toList().map {
            (it as MapScope<*>).map
        }).containsExactly(
            mapOf("val" to 0, "count" to 2, "sum" to 2),
            mapOf("val" to 10, "count" to 0, "sum" to 10),
            mapOf("val" to 20, "count" to 3, "sum" to 23)
        )
    }

    @Test
    fun evaluate_paxel_max() {
        val selectMaxExpr = max(seq<Number>("numbers"))
        assertThat(evalExpression(selectMaxExpr, currentScope)).isEqualTo(numbers.max())
    }

    @Test
    fun evaluate_paxel_max_emptyInput() {
        val selectMaxExpr = max(seq<Number>("emptySeq"))
        assertThat(evalExpression(selectMaxExpr, currentScope)).isEqualTo(null)
    }

    @Test
    fun evaluate_paxel_count() {
        val selectCountExpr = count(seq<Number>("numbers"))
        assertThat(evalExpression(selectCountExpr, currentScope)).isEqualTo(numbers.size)
    }

    @Test
    fun evaluate_paxel_count_emptyInput() {
        val selectCountExpr = count(seq<Number>("emptySeq"))
        assertThat(evalExpression(selectCountExpr, currentScope)).isEqualTo(0)
    }

    @Test
    fun evaluate_paxel_min() {
        val selectMinExpr = min(seq<Number>("numbers"))
        assertThat(evalExpression(selectMinExpr, currentScope)).isEqualTo(numbers.min())
    }

    @Test
    fun evaluate_paxel_min_emptyInput() {
        val selectMinExpr = min(seq<Number>("emptySeq"))
        assertThat(evalExpression(selectMinExpr, currentScope)).isEqualTo(null)
    }

    @Test
    @Suppress("UNCHECKED_CAST")
    fun evaluate_paxel_first() {
        val paxelExpr = PaxelParser.parse("from f in foos select first(f.words)")
            as Expression<Sequence<String?>>

        assertThat(
            evalExpression(paxelExpr, currentScope).toList()
        ).containsExactly(
            "Lorem", null, "dolor"
        )
    }

    @Test
    fun evaluate_paxel_average() {
        val selectAvgExpr = from("p") on lookup("numbers") select
            average(seq<Number>("numbers"))

        assertThat(
            evalExpression(selectAvgExpr, currentScope).toList()
        ).isEqualTo(numbers.map { 5.5 })
    }

    @Test
    fun evaluate_paxel_average_onComplexExpression() {
        val selectAvgExpr = average(
            from("p") on lookup("numbers")
            select num("p") + 10.asExpr()
        )
        assertThat(
            evalExpression(selectAvgExpr, currentScope)
        ).isEqualTo(numbers.map { it + 10 }.average())
    }

    @Test
    fun evaluate_paxel_now() {
        val nowExpr = now()

        assertThat(
            evalExpression<Number>(nowExpr, currentScope) as Long
        ).isAtLeast(System.currentTimeMillis() - 1000L)
    }

    @Test
    fun evaluate_paxel_union() {
        val lessThan8 = from("p") on lookup("numbers") where
            (num("p") lt 8.asExpr()) select num("p")
        val greaterThan6 = from("p") on lookup("numbers") where
            (num("p") gt 6.asExpr()) select num("p")
        val unionExpr = union(lessThan8, greaterThan6)

        assertThat(
            evalExpression(unionExpr, currentScope).toList()
        ).isEqualTo(numbers)
    }

    @Test
    fun evaluate_paxel_expression() {
        // Test Expression:
        // FROM p IN numbers
        // WHERE p < 5
        // SELECT new Example {
        //   x: p + 1
        //   y: p + 2
        //   z: COUNT(numbers)
        // }
        val paxelExpr = from("p") on lookup("numbers") where
            (num("p") lt 5.asExpr()) select new("Example")(
                "x" to num("p") + 1.asExpr(),
                "y" to num("p") + 2.asExpr(),
                "z" to count(seq<Number>("numbers"))
            )

        assertThat(
            evalExpression(paxelExpr, currentScope).toList().map {
                (it as MapScope<*>).map
            }
        ).containsExactly(
            mapOf("x" to 2, "y" to 3, "z" to 10),
            mapOf("x" to 3, "y" to 4, "z" to 10),
            mapOf("x" to 4, "y" to 5, "z" to 10),
            mapOf("x" to 5, "y" to 6, "z" to 10)
        )
    }

    @Test
    fun evaluate_paxel_parse() {
        @Suppress("UNCHECKED_CAST")
        val paxelExpr = PaxelParser.parse(
            """from p in numbers where p < 5 select new Example { 
                |x: p + 1, y: p + 2, z: count(numbers), foo: first(from x in foos select x).val
                | 
|           }""".trimMargin()
        ) as Expression.SelectExpression<Scope>

        assertThat(evalExpression(paxelExpr, currentScope).toList().map {
            (it as MapScope<*>).map
        }).containsExactly(
            mapOf("x" to 2.0, "y" to 3.0, "z" to 10, "foo" to 0),
            mapOf("x" to 3.0, "y" to 4.0, "z" to 10, "foo" to 0),
            mapOf("x" to 4.0, "y" to 5.0, "z" to 10, "foo" to 0),
            mapOf("x" to 5.0, "y" to 6.0, "z" to 10, "foo" to 0)
        )
    }

    @Test
    fun evaluate_ExpressionWithScopeLookupError_throws() {
        val expr = 1.asExpr() + lookup("noSuchThing")
        assertFailsWith<IllegalArgumentException> {
            evalNum(expr)
        }
    }

    @Test
    fun evaluate_expressionWithQueryParamLookupError_throws() {
        val expr = 1.asExpr() + query("arg")
        assertFailsWith<IllegalArgumentException> {
            evalNum(expr)
        }
    }

    @Test
    @Suppress("UNCHECKED_CAST")
    fun stringify_parse_paxel_roundTrip() {
        // FORM foo IN foos
        // LET cnt = count(foo.words)
        // WHERE cnt > 0
        // SELECT NEW Thing {
        //   val: foo.val,
        //   count: cnt,
        //   sum: foo.val + cnt
        // }
        val expr = from("foo") on lookup("foos") let("cnt") be
            count(scope("foo").get<Sequence<String>>("words")) where
            (num("cnt") gt 0L.asExpr()) select new("Thing")(
            "val" to scope("foo").get<Number>("val"),
            "count" to num("cnt"),
            "sum" to scope("foo").get<Number>("val") + num("cnt")
        )
        val toString = expr.toString()
        assertThat(toString).isEqualTo("""
            |from foo in foos
            |let cnt = (count(
            |  foo.words
            |))
            |where cnt > 0
            |select new Thing {
            |  val: foo.val,
            |  count: cnt,
            |  sum: foo.val + cnt
            |}
            |""".trimMargin())
        val parsed = PaxelParser.parse(toString) as Expression<Sequence<Scope>>
        assertThat(evalExpression(parsed, currentScope).toList().map {
            (it as MapScope<*>).map
        }).containsExactly(
            mapOf("val" to 0, "count" to 2, "sum" to 2),
            mapOf("val" to 20, "count" to 3, "sum" to 23)
        )
    }

    @Test
    fun stringify_expression() {
        // Test Math binary ops, field lookups, and parameter lookups
        val parsed = PaxelParser.parse("(2 + (3 * 4) + handle.foo + ?arg - 1) / (null ?: 2)")
        assertThat(parsed.toString()).isEqualTo(
            "((((2.0 + (3.0 * 4.0)) + handle.foo) + ?arg) - 1.0) / (null ?: 2.0)"
        )
    }

    @Test
    @Suppress("UNCHECKED_CAST")
    fun serialization_expression_roundTrip() {
        val parsed = PaxelParser.parse("(baz.x + 2 + (3 * 4) + ?arg - 1) / (null ?: 2)")
        val json = parsed.serialize()
        val deserialized = json.deserializeExpression() as Expression<Number>
        assertThat(evalExpression(
            deserialized,
            currentScope,
            "arg" to 5
        )).isEqualTo(21.0)
    }

    @Test
    @Suppress("UNCHECKED_CAST")
    fun serialization_paxel_roundTrip() {
        // FORM foo IN foos
        // LET cnt = count(foo.words)
        // WHERE cnt > 0
        // SELECT NEW Thing {
        //   val: foo.val,
        //   count: cnt,
        //   sum: foo.val + cnt
        // }
        val expr = from("foo") on lookup("foos") let("cnt") be
            count(scope("foo").get<Sequence<String>>("words")) where
            (num("cnt") gt 0L.asExpr()) select new("Thing")(
            "val" to scope("foo").get<Number>("val"),
            "count" to num("cnt"),
            "sum" to scope("foo").get<Number>("val") + num("cnt")
        )
        val json = expr.serialize()
        val parsed = json.deserializeExpression() as Expression<Sequence<Scope>>
        assertThat(evalExpression(parsed, currentScope).toList().map {
            (it as MapScope<*>).map
        }).containsExactly(
            mapOf("val" to 0, "count" to 2, "sum" to 2),
            mapOf("val" to 20, "count" to 3, "sum" to 23)
        )
    }
}
