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

import arcs.core.data.expression.InferredType.Primitive.BigIntType
import arcs.core.data.expression.InferredType.Primitive.BooleanType
import arcs.core.data.expression.InferredType.Primitive.ByteType
import arcs.core.data.expression.InferredType.Primitive.DoubleType
import arcs.core.data.expression.InferredType.Primitive.FloatType
import arcs.core.data.expression.InferredType.Primitive.IntType
import arcs.core.data.expression.InferredType.Primitive.LongType
import arcs.core.data.expression.InferredType.Primitive.NullType
import arcs.core.data.expression.InferredType.Primitive.NumberType
import arcs.core.data.expression.InferredType.Primitive.ShortType
import arcs.core.data.expression.InferredType.Primitive.TextType
import arcs.core.data.expression.InferredType.ScopeType
import arcs.core.data.expression.InferredType.SeqType
import arcs.core.data.expression.InferredType.UnionType
import arcs.core.util.BigInt
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [TypeEvaluator]. */
@RunWith(JUnit4::class)
class TypeCheckerTest {
  /**
   * Checks that the resulting type of the expression is compatible with the expected type. For
   * example, a byte is assignable to an int, but an int is not assignable to a byte. A union
   * of A|B is assignable to A|B|C but not vice-versa.
   */
  fun checkAssignableTo(
    expr: Expression<*>,
    expectedType: InferredType,
    scope: Expression.Scope = MapScope<InferredType>("root", mapOf()),
    params: Expression.Scope = ParameterScope()
  ) {
    val inferredType = expr.accept(TypeEvaluator(params), scope)
    assertTrue(expectedType.isAssignableFrom(inferredType), "$expectedType != $inferredType")
  }

  @Test
  fun check_literals() {
    checkAssignableTo(1.0.asExpr(), DoubleType)
    checkAssignableTo(1.0.asExpr(), NumberType)

    checkAssignableTo(1.0f.asExpr(), FloatType)
    checkAssignableTo(1.0f.asExpr(), DoubleType)
    checkAssignableTo(1.0f.asExpr(), NumberType)

    checkAssignableTo(BigInt("1").asExpr(), BigIntType)
    checkAssignableTo(BigInt("1").asExpr(), FloatType)
    checkAssignableTo(BigInt("1").asExpr(), DoubleType)
    checkAssignableTo(BigInt("1").asExpr(), NumberType)

    checkAssignableTo(1L.asExpr(), LongType)
    checkAssignableTo(1L.asExpr(), BigIntType)
    checkAssignableTo(1L.asExpr(), DoubleType)
    checkAssignableTo(1L.asExpr(), FloatType)
    checkAssignableTo(1L.asExpr(), NumberType)

    checkAssignableTo(1.asExpr(), IntType)
    checkAssignableTo(1.asExpr(), BigIntType)
    checkAssignableTo(1.asExpr(), LongType)
    checkAssignableTo(1.asExpr(), DoubleType)
    checkAssignableTo(1.asExpr(), FloatType)
    checkAssignableTo(1.asExpr(), NumberType)


    checkAssignableTo(1.toShort().asExpr(), ShortType)
    checkAssignableTo(1.toShort().asExpr(), IntType)
    checkAssignableTo(1.toShort().asExpr(), BigIntType)
    checkAssignableTo(1.toShort().asExpr(), LongType)
    checkAssignableTo(1.toShort().asExpr(), FloatType)
    checkAssignableTo(1.toShort().asExpr(), DoubleType)
    checkAssignableTo(1.toShort().asExpr(), NumberType)

    checkAssignableTo(1.toByte().asExpr(), ByteType)
    checkAssignableTo(1.toByte().asExpr(), ShortType)
    checkAssignableTo(1.toByte().asExpr(), IntType)
    checkAssignableTo(1.toByte().asExpr(), BigIntType)
    checkAssignableTo(1.toByte().asExpr(), LongType)
    checkAssignableTo(1.toByte().asExpr(), FloatType)
    checkAssignableTo(1.toByte().asExpr(), DoubleType)
    checkAssignableTo(1.toByte().asExpr(), NumberType)
    checkAssignableTo("foo".asExpr(), TextType)
    checkAssignableTo(true.asExpr(), BooleanType)
  }

  @Test
  fun check_unary_ops() {
    checkAssignableTo(-(1.asExpr()), IntType)
    checkAssignableTo(-(1.0.asExpr()), DoubleType)
    checkAssignableTo(!(true.asExpr()), BooleanType)
  }

  @Test
  fun check_binary_ops() {
    checkAssignableTo(1.asExpr() + 2.asExpr(), IntType)
    checkAssignableTo(1.0.asExpr() + 2.asExpr(), DoubleType)

    checkAssignableTo(1.asExpr() - 2.asExpr(), IntType)
    checkAssignableTo(1.0.asExpr() - 2.asExpr(), DoubleType)

    checkAssignableTo(1.asExpr() * 2.asExpr(), IntType)
    checkAssignableTo(1.0.asExpr() * 2.asExpr(), DoubleType)

    checkAssignableTo(1.asExpr() / 2.asExpr(), IntType)
    checkAssignableTo(1.0.asExpr() / 2.asExpr(), DoubleType)

    checkAssignableTo(1.asExpr() eq 2.asExpr(), BooleanType)
    checkAssignableTo(1.asExpr() neq 2.asExpr(), BooleanType)
    checkAssignableTo(1.asExpr() lt 2.asExpr(), BooleanType)
    checkAssignableTo(1.asExpr() lte 2.asExpr(), BooleanType)
    checkAssignableTo(1.asExpr() gt 2.asExpr(), BooleanType)
    checkAssignableTo(1.asExpr() gte 2.asExpr(), BooleanType)
    checkAssignableTo(1.asExpr() eq 2.asExpr(), BooleanType)
    checkAssignableTo(1.asExpr() neq 2.asExpr(), BooleanType)

    checkAssignableTo(true.asExpr() and true.asExpr(), BooleanType)
    checkAssignableTo(true.asExpr() or true.asExpr(), BooleanType)

    checkAssignableTo(1.asExpr() ifNull "hello".asExpr(), UnionType(NumberType, TextType))
  }

  @Test
  fun check_field_ops() {
    val emptyScope = MapScope<InferredType>("root", mapOf())
    val scope = emptyScope.builder().apply {
      set("x", IntType)
      set("y", DoubleType)
      set("z", ScopeType(emptyScope.builder().set("a", TextType).build()))
    }.build()
    checkAssignableTo(num("x"), IntType, scope)
    checkAssignableTo(num("y"), DoubleType, scope)
    checkAssignableTo(scope("z").get<InferredType>("a"), TextType, scope)
  }

  @Test
  fun check_query_ops() {
    val emptyScope = MapScope<InferredType>("root", mapOf())
    val scope = emptyScope.builder().apply {
      set("x", IntType)
      set("y", DoubleType)
    }.build()
    checkAssignableTo(query<Number>("x"), IntType, scope, scope)
    checkAssignableTo(query<Number>("y"), DoubleType, scope, scope)
  }

  @Test
  fun check_from_expressions() {
    val emptyScope = MapScope<InferredType>("root", mapOf())
    val people = SeqType(ScopeType(emptyScope.builder().set("name", TextType).build()))
    val scope =
      emptyScope.builder().apply {
        set("numbers", SeqType(IntType))
        set("people", people)
        set("company", SeqType(ScopeType(emptyScope.builder().set("people", people).build())))
      }.build()

    checkAssignableTo(
      PaxelParser.parse("from p in numbers select p"),
      SeqType(IntType),
      scope
    )

    checkAssignableTo(
      PaxelParser.parse("from p in people select p.name"),
      SeqType(TextType),
      scope
    )

    checkAssignableTo(
      PaxelParser.parse("from c in company from p in c.people select p.name"),
      SeqType(TextType),
      scope
    )
  }

  @Test
  fun check_where_expression() {
    val emptyScope = MapScope<InferredType>("root", mapOf())
    val scope = emptyScope.builder().apply {
      set("numbers", SeqType(IntType))
    }.build()

    checkAssignableTo(
      PaxelParser.parse("from p in numbers where p < 10 select p"),
      SeqType(IntType),
      scope
    )
  }

  @Test
  fun check_select_expression() {
    val emptyScope = MapScope<InferredType>("root", mapOf())
    val scope = emptyScope.builder().apply {
      set("numbers", SeqType(IntType))
    }.build()

    checkAssignableTo(
      PaxelParser.parse("from p in numbers select new Foo { x: p, y: p + 1i, z: p == 2 }"),
      SeqType(
        ScopeType(
          emptyScope.builder("Foo").set("x", IntType).set("y", IntType).set("z", BooleanType)
            .build()
        )
      ),
      scope
    )
  }

  @Test
  fun check_let_expression() {
    val emptyScope = MapScope<InferredType>("root", mapOf())
    val scope = emptyScope.builder().apply {
      set("numbers", SeqType(IntType))
    }.build()

    checkAssignableTo(
      PaxelParser.parse("from p in numbers let x = (p > 5) select x"),
      SeqType(BooleanType),
      scope
    )
  }

  @Test
  fun check_orderby_expression() {
    val emptyScope = MapScope<InferredType>("root", mapOf())
    val scope = emptyScope.builder().apply {
      set("numbers", SeqType(IntType))
    }.build()

    checkAssignableTo(
      PaxelParser.parse("from p in numbers orderby p select p"),
      SeqType(IntType),
      scope
    )
  }

  @Test
  fun check_function_expression() {
    val emptyScope = MapScope<InferredType>("root", mapOf())
    val scope = emptyScope.builder().apply {
      set("numbers", SeqType(IntType))
      set("words", SeqType(TextType))
    }.build()

    checkAssignableTo(
      PaxelParser.parse("from p in words select now()"),
      SeqType(LongType),
      scope
    )

    checkAssignableTo(
      PaxelParser.parse("from p in numbers select average(p)"),
      SeqType(DoubleType),
      scope
    )

    checkAssignableTo(
      PaxelParser.parse("from p in numbers select min(p)"),
      SeqType(IntType),
      scope
    )

    checkAssignableTo(
      PaxelParser.parse("from p in numbers select max(p)"),
      SeqType(IntType),
      scope
    )

    checkAssignableTo(
      PaxelParser.parse("from p in numbers select sum(p)"),
      SeqType(IntType),
      scope
    )

    checkAssignableTo(
      PaxelParser.parse("from p in words select count(numbers)"),
      SeqType(IntType),
      scope
    )

    checkAssignableTo(
      PaxelParser.parse("from p in numbers select first(words)"),
      SeqType(UnionType(TextType, NullType)),
      scope
    )
  }
}
