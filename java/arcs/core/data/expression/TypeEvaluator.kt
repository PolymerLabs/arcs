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
@file:Suppress("UNCHECKED_CAST")

package arcs.core.data.expression

import arcs.core.data.expression.Expression.Scope
import arcs.core.data.expression.InferredType.ScopeType
import arcs.core.data.expression.InferredType.SeqType
import arcs.core.data.expression.InferredType.UnionType

/**
 * Similar to [ExpressionEvaluator], traverses a tree of [Expression] objects, evaluating each node,
 * and computing the resulting type. For refinement expression nodes, their resulting type is
 * either a literal leaf node type, a binary or unary op type (number/boolean/union), or a field
 * (scope) lookup. For [QualifiedExpression] nodes, these are always expected to be a [SeqType]
 * of [ScopeType].
 *
 * For [BinaryOp] numeric operations, the LHS and RHS are [widen]'ed to the bigger of the two
 * types.
 *
 * Unlike [ExpressionEvaluator], [Scope] objects here do not contain values, but rather types.
 */
class TypeEvaluator(
  val parameterScope: Scope = ParameterScope(),
  val scopeCreator: (String) -> Scope = { name -> MapScope<InferredType>(name, mutableMapOf()) }
) : Expression.Visitor<InferredType, Scope> {

  val errors = mutableListOf<String>()
  val warnings = mutableListOf<String>()

  /* [expr] to be used for source-location reporting in follow on. */
  fun require(expr: Expression<*>, cond: Boolean, msg: () -> String) {
    if (!cond) errors.add(msg())
    require(cond, msg)
  }

  fun requireOrWarn(expr: Expression<*>, cond: Boolean, msg: () -> String) {
    if (!cond) warnings.add(msg()) else Unit
  }

  override fun <E, T> visit(expr: Expression.UnaryExpression<E, T>, ctx: Scope): InferredType {
    return when (expr.op) {
      is Expression.UnaryOp.Not -> {
        require(expr, expr.expr.accept(this, ctx) == InferredType.Primitive.BooleanType) {
          "$this is expected to be a boolean expression."
        }
        InferredType.Primitive.BooleanType
      }
      is Expression.UnaryOp.Negate -> {
        val result = expr.expr.accept(this, ctx)
        require(expr, result is InferredType.Numeric) {
          "$expr is expected to be a numeric expression"
        }
        result
      }
    }
  }

  override fun <L, R, T> visit(
    expr: Expression.BinaryExpression<L, R, T>,
    ctx: Scope
  ): InferredType {
    return when (expr.op) {
      Expression.BinaryOp.And, Expression.BinaryOp.Or -> {
        val lhs = expr.left.accept(this, ctx)
        require(expr, lhs is InferredType.Primitive.BooleanType) {
          "$expr: left hand side of expression expected to be boolean type but was $lhs."
        }
        val rhs = expr.right.accept(this, ctx)
        require(expr, rhs == InferredType.Primitive.BooleanType) {
          "$expr: right hand side of expression expected to be boolean type but was $rhs."
        }
        InferredType.Primitive.BooleanType
      }
      // Boolean ops
      Expression.BinaryOp.LessThan, Expression.BinaryOp.GreaterThan,
      Expression.BinaryOp.LessThanOrEquals,
      Expression.BinaryOp.GreaterThanOrEquals,
      Expression.BinaryOp.Equals,
      Expression.BinaryOp.NotEquals -> {
        val lhs = expr.left.accept(this, ctx)
        require(expr, lhs is InferredType.Primitive) {
          "$expr: left hand side of expression expected to be primitive type but was $lhs."
        }
        val rhs = expr.right.accept(this, ctx)
        require(expr, rhs is InferredType.Primitive) {
          "$expr: right hand side of expression expected to be primitive type but was $rhs."
        }
        InferredType.Primitive.BooleanType
      }

      // Numeric ops
      Expression.BinaryOp.Add,
      Expression.BinaryOp.Subtract,
      Expression.BinaryOp.Multiply,
      Expression.BinaryOp.Divide -> {
        val lhs = expr.left.accept(this, ctx)
        require(expr, lhs is InferredType.Numeric) {
          "$expr: left hand side of expression expected to be numeric type but was $lhs."
        }
        val rhs = expr.right.accept(this, ctx)
        require(expr, rhs is InferredType.Numeric) {
          "$expr: right hand side of expression expected to be numeric type but was $rhs."
        }
        widen(lhs, rhs)
      }

      // Special ops
      Expression.BinaryOp.IfNull -> {
        val inferredType = expr.left.accept(this, ctx)
        requireOrWarn(expr, inferredType.isAssignableFrom(InferredType.Primitive.NullType)) {
          "$expr: ${expr.left} is never null."
        }
        inferredType.union(expr.right.accept(this, ctx)).nonNull()
      }
    }
  }

  override fun <T> visit(expr: Expression.FieldExpression<T>, ctx: Scope): InferredType =
    (if (expr.qualifier == null) {
      ScopeType(ctx)
    } else {
      expr.qualifier.accept(this, ctx)
    }).let {
      require(expr, !it.isAssignableFrom(InferredType.Primitive.NullType) || expr.nullSafe) {
        "Field '${expr.field}` in $expr potentially looked up on null scope, use ?. operator."
      }
      it.asScope(ctx)
    }.let { scope ->
      require(expr, scope.properties().contains(expr.field)) {
        "Field `${expr.field}` in $expr doesn't exist in scope $scope"
      }
      scope
    }.lookup<InferredType>(expr.field).also {
      requireOrWarn(expr, expr.qualifier == null ||
        it.isAssignableFrom(InferredType.Primitive.NullType) || !expr.nullSafe) {
        "Field '${expr.field}` in $expr looked up on non-null type $it, ?. operator is not needed."
      }
    }

  override fun <E> visit(expr: Expression.QueryParameterExpression<E>, ctx: Scope): InferredType {
    return parameterScope.lookup(expr.paramIdentifier) as? InferredType
      ?: throw IllegalArgumentException(
        "Unbound parameter '${expr.paramIdentifier}'"
      )
  }

  override fun visit(expr: Expression.NumberLiteralExpression, ctx: Scope) =
    expr.value::class.toType()

  override fun visit(expr: Expression.TextLiteralExpression, ctx: Scope) =
    expr.value::class.toType()

  override fun visit(expr: Expression.BooleanLiteralExpression, ctx: Scope) =
    expr.value::class.toType()

  override fun visit(expr: Expression.NullLiteralExpression, ctx: Scope) =
    InferredType.Primitive.NullType

  override fun visit(expr: Expression.FromExpression, ctx: Scope): InferredType {
    val scope = expr.qualifier?.let { it.accept(this, ctx).asScope(ctx) } ?: ctx
    val result = expr.source.accept(this, scope)
    val resultSeq = result as SeqType
    return SeqType(ScopeType(scope.builder().set(expr.iterationVar, resultSeq.type).build()))
  }

  override fun visit(expr: Expression.WhereExpression, ctx: Scope): InferredType {
    val inferredType = expr.qualifier.accept(this, ctx)
    val qualType = inferredType.asScope(ctx)
    val cond = expr.expr.accept(this, qualType)
    require(expr, cond == InferredType.Primitive.BooleanType) {
      "$expr must evaluate to a boolean type but was $cond."
    }
    return inferredType
  }

  override fun visit(expr: Expression.LetExpression, ctx: Scope): InferredType {
    val scope = expr.qualifier.accept(this, ctx).asScope(ctx)

    return SeqType(
      ScopeType(
          scope.builder().set(
          expr.variableName,
          expr.variableExpr.accept(this, scope)
        ).build()
      )
    )
  }

  override fun <T> visit(expr: Expression.SelectExpression<T>, ctx: Scope): InferredType {
    return SeqType(
      expr.expr.accept(
        this,
        expr.qualifier.accept(this, ctx).asScope(ctx)
      )
    )
  }

  override fun visit(expr: Expression.NewExpression, ctx: Scope): InferredType {
    val initScope = scopeCreator(expr.schemaName.firstOrNull() ?: "")
    return ScopeType(
      expr.fields.fold(initScope.builder()) { builder, (fieldName, fieldExpr) ->
        builder.set(fieldName, fieldExpr.accept(this, ctx))
      }.build()
    )
  }

  override fun <T> visit(expr: Expression.FunctionExpression<T>, ctx: Scope): InferredType {
    val arguments = expr.arguments.map { it.accept(this, ctx) }
    return expr.function.inferredType(expr, this, arguments)
  }

  override fun <T> visit(expr: Expression.OrderByExpression<T>, ctx: Scope): InferredType {
    val inferredType = expr.qualifier.accept(this, ctx)
    val qualType = inferredType.asScope(ctx)
    expr.selectors.forEach {
      val type = it.expr.accept(this, qualType)
      require(expr, type is InferredType.Primitive) {
        "order by expression ${it.expr} must be a primitive type but was $type."
      }
    }
    return inferredType
  }
}

private fun InferredType.asScope(default: Scope): Scope =
  requireNotNull(this.asScopeNullable(default)) {
    "$this was expected to contain a ScopeType"
  }

private fun InferredType.asScopeNullable(default: Scope): Scope? = when (this) {
  is ScopeType -> this.scope
  is SeqType -> (this.type as ScopeType).asScope(default)
  is UnionType -> this.types.firstOrNull { it.asScopeNullable(default) != null }?.asScope(default)
  is InferredType.Primitive.NullType -> default
  else -> null
}
