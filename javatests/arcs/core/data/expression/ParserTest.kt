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

import arcs.core.data.expression.Expression.BinaryOp
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [Expression]. */
@Suppress("UNCHECKED_CAST")
@RunWith(JUnit4::class)
class ParserTest {

    @Test
    fun parsePrimitives() {
        assertThat(parseNum("123i").value).isEqualTo(123)
        assertThat(parseNum("-123i").value).isEqualTo(-123)
        assertThat(parseNum("123i second").value).isEqualTo(123 * 1000)
        assertThat(parseNum("123i seconds").value).isEqualTo(123 * 1000)
        assertThat(parseNum("123i minute").value).isEqualTo(123 * 1000 * 60)
        assertThat(parseNum("123i minutes").value).isEqualTo(123 * 1000 * 60)
        assertThat(parseNum("123i hour").value).isEqualTo(123 * 1000 * 60 * 60)
        assertThat(parseNum("123i hours").value).isEqualTo(123 * 1000 * 60 * 60)
        assertThat(parseNum("123i day").value).isEqualTo(123L * 1000L * 60L * 60L * 24L)
        assertThat(parseNum("123i days").value).isEqualTo(123L * 1000L * 60L * 60L * 24L)

        assertThat(parseNum("123l").value).isEqualTo(123L)
        assertThat(parseNum("123l second").value).isEqualTo(123L * 1000)
        assertThat(parseNum("123l seconds").value).isEqualTo(123L * 1000)
        assertThat(parseNum("123l minute").value).isEqualTo(123L * 1000 * 60)
        assertThat(parseNum("123l minutes").value).isEqualTo(123L * 1000 * 60)
        assertThat(parseNum("123l hour").value).isEqualTo(123L * 1000 * 60 * 60)
        assertThat(parseNum("123l hours").value).isEqualTo(123L * 1000 * 60 * 60)
        assertThat(parseNum("123l day").value).isEqualTo(123L * 1000L * 60L * 60L * 24L)
        assertThat(parseNum("123l days").value).isEqualTo(123L * 1000L * 60L * 60L * 24L)

        assertThat(parseNum("123n").value).isEqualTo(123.toBigInteger())
        assertThat(parseNum("123n second").value).isEqualTo((123L * 1000).toBigInteger())
        assertThat(parseNum("123n seconds").value).isEqualTo((123L * 1000).toBigInteger())
        assertThat(parseNum("123n minute").value).isEqualTo((123L * 1000 * 60).toBigInteger())
        assertThat(parseNum("123n minutes").value).isEqualTo((123L * 1000 * 60).toBigInteger())
        assertThat(parseNum("123n hour").value).isEqualTo((123L * 1000 * 60 * 60).toBigInteger())
        assertThat(parseNum("123n hours").value).isEqualTo((123L * 1000 * 60 * 60).toBigInteger())
        assertThat(parseNum("123n day").value).isEqualTo(
            (123L * 1000 * 60 * 60 * 24).toBigInteger()
        )
        assertThat(parseNum("123n days").value).isEqualTo(
            (123L * 1000 * 60 * 60 * 24).toBigInteger()
        )

        assertThat(parseNum("123.0").value).isEqualTo(123.0)
        assertThat(parseNum("-123.0").value).isEqualTo(-123.0)
        assertThat(parseNum("123.0 second").value).isEqualTo(123.0 * 1000)
        assertThat(parseNum("123.0 seconds").value).isEqualTo(123.0 * 1000)
        assertThat(parseNum("123.0 minute").value).isEqualTo(123.0 * 1000 * 60)
        assertThat(parseNum("123.0 minutes").value).isEqualTo(123.0 * 1000 * 60)
        assertThat(parseNum("123.0 hour").value).isEqualTo(123.0 * 1000 * 60 * 60)
        assertThat(parseNum("123.0 hours").value).isEqualTo(123.0 * 1000 * 60 * 60)
        assertThat(parseNum("123.0 day").value).isEqualTo(123.0 * 1000 * 60 * 60 * 24)
        assertThat(parseNum("123.0 days").value).isEqualTo(123.0 * 1000 * 60 * 60 * 24)

        assertThat(parseBool("true").value).isTrue()
        assertThat(parseBool("false").value).isFalse()

        assertThat(parseText("'hello world'").value).isEqualTo("hello world")
        assertThat(parseText("'hello\\'world'").value).isEqualTo("hello'world")
    }

    @Test
    fun parseFunctionCall() {
        val funCall = PaxelParser.parse("union( 1.0,true  , 'foo',now() )")
        assertThat(funCall).isInstanceOf(Expression.FunctionExpression::class.java)
        funCall as Expression.FunctionExpression<Any>
        assertThat(funCall.function).isEqualTo(GlobalFunction.Union)
        assertThat(funCall.arguments).containsExactly(
            1.0.asExpr(),
            true.asExpr(),
            "foo".asExpr(),
            now()
        )
    }

    @Test
    fun parseScopeLookup() {
        val fieldExpr = PaxelParser.parse("x")
        assertThat(fieldExpr).isInstanceOf(Expression.FieldExpression::class.java)
        fieldExpr as Expression.FieldExpression<Any>
        assertThat(fieldExpr.qualifier).isNull()
        assertThat(fieldExpr.field).isEqualTo("x")

        val fieldExpr2 = PaxelParser.parse("x.y")
        assertThat(fieldExpr2).isInstanceOf(Expression.FieldExpression::class.java)
        fieldExpr2 as Expression.FieldExpression<Any>
        assertThat(fieldExpr2.qualifier).isNotNull()
        assertThat(fieldExpr2.field).isEqualTo("y")

        val qualifier = fieldExpr2.qualifier as Expression.FieldExpression<Any>
        assertThat(qualifier.qualifier).isNull()
        assertThat(qualifier.field).isEqualTo("x")
    }

    @Test
    fun parseQuery() {
        val queryExpr = PaxelParser.parse("?x")
        assertThat(queryExpr).isInstanceOf(Expression.QueryParameterExpression::class.java)
        queryExpr as Expression.QueryParameterExpression<Any>
        assertThat(queryExpr.paramIdentifier).isEqualTo("x")
    }

    @Test
    fun parseUnaryOp() {
        val unaryOp = PaxelParser.parse("-now()")
        assertThat(unaryOp).isInstanceOf(Expression.UnaryExpression::class.java)
        unaryOp as Expression.UnaryExpression<Any, Any>
        assertThat(unaryOp.op).isEqualTo(Expression.UnaryOp.Negate)

        val unaryOp2 = PaxelParser.parse("not x")
        assertThat(unaryOp2).isInstanceOf(Expression.UnaryExpression::class.java)
        unaryOp2 as Expression.UnaryExpression<Any, Any>
        assertThat(unaryOp2.op).isEqualTo(Expression.UnaryOp.Not)
    }

    @Test
    fun parseBinaryOp() {
        val values = Triple(1.0, 2.0, 3.0)
        val ops = BinaryOp.allOps
        // tests FOO op BAR, FOO op BAR op BAZ and FOO op (BAR op BAZ)
        ops.forEach { op ->
            assertBinaryOp(
                "${values.first} ${op.token} ${values.second}",
                op,
                values.first.asExpr(),
                values.second.asExpr())
            assertBinaryOp(
                "${values.first} ${op.token} ${values.second} ${op.token} ${values.third}",
                op,
                Expression.BinaryExpression(
                    op as BinaryOp<Any, Any, Any>,
                    values.first.asExpr(),
                    values.second.asExpr()
                ),
                values.third.asExpr()
            )
            assertBinaryOp(
                "${values.first} ${op.token} (${values.second} ${op.token} ${values.third})",
                op,
                values.first.asExpr(),
                Expression.BinaryExpression(
                    op,
                    values.second.asExpr(),
                    values.third.asExpr()
                )
            )
        }
    }

    fun assertBinaryOp(
        binaryExpr: String,
        op: BinaryOp<*, *, *>,
        left: Expression<Any>,
        right: Expression<Any>
    ) {
        val binaryOp = PaxelParser.parse(binaryExpr)
        assertThat(binaryOp).isInstanceOf(Expression.BinaryExpression::class.java)
        binaryOp as Expression.BinaryExpression<Any, Any, Any>
        assertThat(binaryOp.op).isEqualTo(op)
        assertThat(binaryOp.left).isEqualTo(left)
        assertThat(binaryOp.right).isEqualTo(right)
    }

    @Test
    fun parsePaxel() {
        PaxelParser.parse("from p in q select p")
        PaxelParser.parse("from p in q where p < 1 select p")
        PaxelParser.parse("from p in q where p < 1 let x = (p + 1) select x - 1")
        PaxelParser.parse("from p in q where p < 1 select new Foo { x: 1 }")
        PaxelParser.parse("new Foo { x: 1 }")
        PaxelParser.parse("from p in q where p < 1 select new Foo { x: union(q,q) }")
        PaxelParser.parse("from p in q where p < 1 select new Foo { x: first(q) }")
        PaxelParser.parse("from p in q where p < 1 select new Foo { x: first(q).x }")
        PaxelParser.parse("""
            |from p in q
            |where p < 1 
            |select new Foo {
            |  x: first(from x in p select x).x 
            |}""".trimMargin())
    }

    @Test
    fun parseComplex() {
        PaxelParser.parse("1 + 2 * 3 + 3 * 4 == 3 * 2 * 3 + 1 and 2 == 2")
    }

    fun parseNum(num: String): Expression.NumberLiteralExpression {
        val number: Expression<Number> = PaxelParser.parse(num) as Expression<Number>
        assertThat(number).isInstanceOf(Expression.NumberLiteralExpression::class.java)
        return number as Expression.NumberLiteralExpression
    }

    fun parseBool(b: String): Expression.BooleanLiteralExpression {
        val bool: Expression<Boolean> = PaxelParser.parse(b) as Expression<Boolean>
        assertThat(bool).isInstanceOf(Expression.BooleanLiteralExpression::class.java)
        return bool as Expression.BooleanLiteralExpression
    }

    fun parseText(str: String): Expression.TextLiteralExpression {
        val text: Expression<String> = PaxelParser.parse(str) as Expression<String>
        assertThat(text).isInstanceOf(Expression.TextLiteralExpression::class.java)
        return text as Expression.TextLiteralExpression
    }
}
