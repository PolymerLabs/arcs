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
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [TypeEvaluator]. This was previously named [TypeCheckerTest]. */
@RunWith(JUnit4::class)
@Suppress("UNCHECKED_CAST")
class TypeEvaluatorTest {

  @Test
  fun check_literals() {
    assertTypeIs(1.0.asExpr(), DoubleType).canAssign(NumberType)
    assertTypeIs(1.0f.asExpr(), FloatType).canAssign(DoubleType, NumberType)
    assertTypeIs(BigInt("1").asExpr(), BigIntType).canAssign(FloatType, DoubleType, NumberType)
    assertTypeIs(1L.asExpr(), LongType).canAssign(BigIntType, DoubleType, FloatType, NumberType)
    assertTypeIs(1.asExpr(), IntType).canAssign(
      BigIntType,
      LongType,
      DoubleType,
      FloatType,
      NumberType
    )

    assertTypeIs(1.toShort().asExpr(), ShortType).canAssign(
      IntType,
      BigIntType,
      LongType,
      DoubleType,
      FloatType,
      NumberType
    )

    assertTypeIs(1.toByte().asExpr(), ByteType).canAssign(
      ShortType,
      IntType,
      BigIntType,
      LongType,
      DoubleType,
      FloatType,
      NumberType
    )

    checkTypeIs("foo".asExpr(), TextType)
    checkTypeIs(true.asExpr(), BooleanType)
  }

  @Test
  fun check_unary_ops() {
    checkTypeIs(-(1.asExpr()), IntType)
    checkTypeIs(-(1.0.asExpr()), DoubleType)
    checkTypeIs(!(true.asExpr()), BooleanType)

    assertFailsWith<AssertionError> {
      checkTypeIs(
        Expression.UnaryExpression(
          Expression.UnaryOp.Negate,
          "hello".asExpr() as Expression<Number>
        ),
        IntType
      )
    }

    assertFailsWith<AssertionError> {
      checkTypeIs(
        Expression.UnaryExpression(
          Expression.UnaryOp.Not,
          1.asExpr() as Expression<Boolean>
        ),
        IntType
      )
    }
  }

  @Test
  fun check_binary_ops() {
    checkTypeIs(1.asExpr() + 2.asExpr(), IntType)
    checkTypeIs(1.0.asExpr() + 2.asExpr(), DoubleType)

    checkTypeIs(1.asExpr() - 2.asExpr(), IntType)
    checkTypeIs(1.0.asExpr() - 2.asExpr(), DoubleType)

    checkTypeIs(1.asExpr() * 2.asExpr(), IntType)
    checkTypeIs(1.0.asExpr() * 2.asExpr(), DoubleType)

    checkTypeIs(1.asExpr() / 2.asExpr(), IntType)
    checkTypeIs(1.0.asExpr() / 2.asExpr(), DoubleType)

    checkTypeIs(
      Expression.BinaryExpression(
        Expression.BinaryOp.Add,
        1.asExpr(),
        "hello".asExpr() as Expression<Number>
      ),
      IntType,
      errors = listOf(
        "1 + \"hello\": right hand side of expression expected to be numeric type " +
          "but was String."
      )
    )

    checkTypeIs(
      Expression.BinaryExpression(
        Expression.BinaryOp.Add,
        "hello".asExpr() as Expression<Number>,
        1.asExpr()
      ),
      IntType,
      errors = listOf(
        "\"hello\" + 1: left hand side of expression expected to be numeric type " +
          "but was String."
      )
    )

    checkTypeIs(1.asExpr() eq 2.asExpr(), BooleanType)
    checkTypeIs(1.asExpr() neq 2.asExpr(), BooleanType)
    checkTypeIs(1.asExpr() lt 2.asExpr(), BooleanType)
    checkTypeIs(1.asExpr() lte 2.asExpr(), BooleanType)
    checkTypeIs(1.asExpr() gt 2.asExpr(), BooleanType)
    checkTypeIs(1.asExpr() gte 2.asExpr(), BooleanType)
    checkTypeIs(1.asExpr() eq 2.asExpr(), BooleanType)
    checkTypeIs(1.asExpr() neq 2.asExpr(), BooleanType)

    checkTypeIs(
      Expression.BinaryExpression(
        Expression.BinaryOp.Equals,
        nullExpr() ifNull "hello".asExpr() as Expression<Number>,
        1.asExpr()
      ),
      BooleanType,
      errors = listOf(
        "(null ?: \"hello\") == 1: left hand side of expression expected to be " +
          "primitive type but was String."
      )
    )

    checkTypeIs(
      Expression.BinaryExpression(
        Expression.BinaryOp.Equals,
        1.asExpr(),
        nullExpr() ifNull "hello".asExpr() as Expression<Number>
      ),
      BooleanType,
      errors = listOf(
        "1 == (null ?: \"hello\"): right hand side of expression expected to be " +
          "primitive type but was String."
      )
    )

    checkTypeIs(true.asExpr() and true.asExpr(), BooleanType)
    checkTypeIs(true.asExpr() or true.asExpr(), BooleanType)

    val evaluator = checkTypeIs(1.asExpr() ifNull "hello".asExpr(), UnionType(IntType, TextType))
    assertThat(evaluator.warnings).containsExactly("1 ?: \"hello\": 1 is never null.")

    val evaluator2 = checkTypeIs(nullExpr() ifNull "hello".asExpr(), UnionType(TextType))
    assertThat(evaluator2.warnings).isEmpty()
  }

  @Test
  fun check_field_ops() {
    val emptyScope = MapScope<InferredType>("root", mapOf())
    val aScope = ScopeType(emptyScope.builder().set("a", TextType).build())
    val scope = emptyScope.builder().apply {
      set("n", UnionType(aScope, NullType))
      set("x", IntType)
      set("y", DoubleType)
      set("z", aScope)
    }.build()
    checkTypeIs(num("x"), IntType, scope)
    checkTypeIs(num("y"), DoubleType, scope)
    checkTypeIs(
      scope("n").get<InferredType>("a"),
      TextType,
      scope,
      errors = listOf("Field 'a` in n.a potentially looked up on null scope, use ?. operator.")
    )

    val evaluator = checkTypeIs(
      scope("z").get<InferredType>("a", true),
      TextType,
      scope
    )
    assertThat(evaluator.warnings).containsExactly(
      "Field 'a` in z?.a looked up on non-null type String, ?. operator is not needed."
    )
  }

  @Test
  fun check_query_ops() {
    val emptyScope = MapScope<InferredType>("root", mapOf())
    val scope = emptyScope.builder().apply {
      set("x", IntType)
      set("y", DoubleType)
    }.build()
    checkTypeIs(query<Number>("x"), IntType, emptyScope, scope)
    checkTypeIs(query<Number>("y"), DoubleType, emptyScope, scope)
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

    checkTypeIs(
      PaxelParser.parse("from p in numbers select p"),
      SeqType(IntType),
      scope
    )

    checkTypeIs(
      PaxelParser.parse("from p in people select p.name"),
      SeqType(TextType),
      scope
    )

    checkTypeIs(
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
      set("x", TextType)
    }.build()

    checkTypeIs(
      PaxelParser.parse("from p in numbers where p < 10 select p"),
      SeqType(IntType),
      scope
    )

    checkTypeIs(
      PaxelParser.parse("from p in numbers where 2 + 3 select p"),
      SeqType(IntType),
      scope,
      errors = listOf(
        "from p in numbers\nwhere 2.0 + 3.0 must evaluate to a boolean type" +
          " but was Double."
      )
    )
  }

  @Test
  fun check_select_expression() {
    val emptyScope = MapScope<InferredType>("root", mapOf())
    val scope = emptyScope.builder().apply {
      set("numbers", SeqType(IntType))
    }.build()

    checkTypeIs(
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

    checkTypeIs(
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

    checkTypeIs(
      PaxelParser.parse("from p in numbers orderby p select p"),
      SeqType(IntType),
      scope
    )

    checkTypeIs(
      PaxelParser.parse("from p in numbers orderby numbers select p"),
      SeqType(IntType),
      scope,
      errors = listOf(
        "order by expression numbers must be a primitive type" +
          " but was Sequence<Int>."
      )
    )
  }

  private fun checkFunction(
    function: String,
    scope: Expression.Scope,
    expectedType: InferredType = IntType,
    arg: String = "numbers",
    numeric: Boolean = true
  ) {
    checkTypeIs(
      PaxelParser.parse("from p in numbers select $function($arg)"),
      SeqType(expectedType),
      scope
    )

    checkTypeIs(
      PaxelParser.parse("from p in numbers select $function()"),
      SeqType(DoubleType),
      scope,
      errors = listOf("$function() may only be called with one argument")
    )

    checkTypeIs(
      PaxelParser.parse("from p in numbers select $function($arg, $arg)"),
      SeqType(DoubleType),
      scope,
      errors = listOf("$function() may only be called with one argument")
    )

    checkTypeIs(
      PaxelParser.parse("from p in numbers select $function(p)"),
      SeqType(DoubleType),
      scope,
      errors = listOf("argument to $function() must be a sequence")
    )

    if (numeric) {
      checkTypeIs(
        PaxelParser.parse("from p in numbers select $function(words)"),
        SeqType(DoubleType),
        scope,
        errors = listOf("argument to $function must be a sequence of numeric types")
      )
    }
  }

  @Test
  fun check_function_expression() {
    val emptyScope = MapScope<InferredType>("root", mapOf())
    val scope = emptyScope.builder().apply {
      set("numbers", SeqType(IntType))
      set("words", SeqType(TextType))
      set("x", TextType)
      set("y", NumberType)
    }.build()

    checkTypeIs(
      PaxelParser.parse("from p in words select now()"),
      SeqType(LongType),
      scope
    )

    checkTypeIs(
      PaxelParser.parse("now()"),
      LongType,
      scope
    )

    checkTypeIs(
      PaxelParser.parse("from p in words select now(p)"),
      SeqType(LongType),
      scope,
      errors = listOf("now() does not allow arguments.")
    )

    checkTypeIs(
      PaxelParser.parse("union(from p in words select p, from w in numbers select w)"),
      SeqType(UnionType(TextType, IntType)),
      scope
    )

    checkTypeIs(
      PaxelParser.parse("union()"),
      SeqType(UnionType(TextType, IntType)),
      scope,
      errors = listOf("union() must be called with at least one argument")
    )

    checkTypeIs(
      PaxelParser.parse("union(x, y)"),
      SeqType(UnionType(TextType, IntType)),
      scope,
      errors = listOf(
        "union() may only be called with sequences," +
          " but was called with String"
      )
    )

    checkFunction("min", scope)
    checkFunction("max", scope)
    checkFunction("sum", scope)
    checkFunction("average", scope, DoubleType)
    checkFunction("count", scope, IntType, numeric = false)
    checkFunction("first", scope, UnionType(TextType, NullType), arg = "words", numeric = false)
  }
}

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
): TypeEvaluator {
  val typeEvaluator = TypeEvaluator(params)
  val inferredType = expr.accept(typeEvaluator, scope)
  assertThat(typeEvaluator.errors).isEmpty()
  assertTrue(expectedType.isAssignableFrom(inferredType), "$expectedType != $inferredType")
  return typeEvaluator
}

/**
 * Checks that the resulting type of the expression is equivalent to the expected type. That is,
 * A can be assigned to type B and B can be assigned to type A.
 */
fun checkTypeIs(
  expr: Expression<*>,
  expectedType: InferredType,
  scope: Expression.Scope = MapScope<InferredType>("root", mapOf()),
  params: Expression.Scope = ParameterScope(),
  errors: List<String> = emptyList()
): TypeEvaluator {
  val typeEvaluator = TypeEvaluator(params)
  val inferredType = try {
    expr.accept(typeEvaluator, scope)
  } catch (e: Exception) { } as? InferredType?

  assertThat(typeEvaluator.errors).containsExactlyElementsIn(errors)
  if (inferredType != null) {
    assertTrue(
      expectedType.isAssignableFrom(inferredType) && inferredType.isAssignableFrom(expectedType),
      "Expected $expectedType != Actual $inferredType"
    )
  }
  return typeEvaluator
}

private class TypeAsserter(val expr: Expression<*>, val type: InferredType) {
  fun canAssign(vararg types: InferredType) {
    (types.toSet() + setOf(type)).forEach {
      checkAssignableTo(expr, it)
    }
    InferredType.Primitive.allTypes.subtract(types.toSet() + setOf(type)).forEach {
      assertFailsWith<AssertionError> {
        checkAssignableTo(expr, it)
      }
    }
  }
}

private fun assertTypeIs(expr: Expression<*>, type: InferredType): TypeAsserter {
  checkTypeIs(expr, type)
  return TypeAsserter(expr, type)
}
