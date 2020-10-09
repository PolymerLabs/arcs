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

/**
 * Similar to [ExpressionEvaluator], traverses a tree of [Expression] objects, evaluating each node,
 * and computing the resulting type. For refinement expression nodes, their resulting type is
 * either a literal leaf node type, a binary or unary op type (number/boolean/union), or a field
 * (scope) lookup. For [QualifiedExpression] nodes, these are always expected to be a [SeqType],
 * usually a [SeqType] or [ScopeType].
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

  override fun <E, T> visit(expr: Expression.UnaryExpression<E, T>, ctx: Scope): InferredType {
    return when (expr.op) {
      is Expression.UnaryOp.Not -> InferredType.Primitive.BooleanType
      is Expression.UnaryOp.Negate -> expr.expr.accept(this, ctx)
    }
  }

  override fun <L, R, T> visit(
    expr: Expression.BinaryExpression<L, R, T>,
    ctx: Scope
  ): InferredType {
    return when (expr.op) {
      // Boolean ops
      Expression.BinaryOp.And, Expression.BinaryOp.Or,
      Expression.BinaryOp.LessThan, Expression.BinaryOp.GreaterThan,
      Expression.BinaryOp.LessThanOrEquals,
      Expression.BinaryOp.GreaterThanOrEquals,
      Expression.BinaryOp.Equals,
      Expression.BinaryOp.NotEquals -> InferredType.Primitive.BooleanType

      // Numeric ops
      Expression.BinaryOp.Add,
      Expression.BinaryOp.Subtract,
      Expression.BinaryOp.Multiply,
      Expression.BinaryOp.Divide -> widen(
        expr.left.accept(this, ctx),
        expr.right.accept(this, ctx)
      )

      // Special ops
      Expression.BinaryOp.IfNull -> expr.left.accept(this, ctx).union(expr.right.accept(this, ctx))
    }
  }

  override fun <T> visit(expr: Expression.FieldExpression<T>, ctx: Scope): InferredType =
    (if (expr.qualifier == null) {
      ctx
    } else {
      (expr.qualifier.accept(this, ctx) as? ScopeType)?.scope
    }).apply {
      @Suppress("SENSELESS_COMPARISON") if (this == null && !expr.nullSafe) {
        throw IllegalArgumentException("Field '${expr.field}' not looked up on null scope")
      }
    }?.lookup(expr.field) as InferredType

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

  private fun seqToScopeOr(inferredType: InferredType?, ctx: Scope): Scope =
    ((inferredType as? SeqType)?.type as? ScopeType)?.scope ?: ctx

  private fun InferredType.asScope() = (this as SeqType).type as ScopeType

  override fun visit(expr: Expression.FromExpression, ctx: Scope): InferredType {
    val scope = seqToScopeOr(expr.qualifier?.accept(this, ctx), ctx)

    val resultSeq = expr.source.accept(this, scope) as SeqType
    return SeqType(ScopeType(scope.builder().set(expr.iterationVar, resultSeq.type).build()))
  }

  override fun visit(expr: Expression.WhereExpression, ctx: Scope): InferredType {
    return expr.qualifier.accept(this, ctx)
  }

  override fun visit(expr: Expression.LetExpression, ctx: Scope): InferredType {
    val scopeType = expr.qualifier.accept(this, ctx).asScope()

    return SeqType(
      ScopeType(
        scopeType.scope.builder().set(
          expr.variableName,
          expr.variableExpr.accept(this, scopeType.scope)
        ).build()
      )
    )
  }

  override fun <T> visit(expr: Expression.SelectExpression<T>, ctx: Scope): InferredType {
    return SeqType(
      expr.expr.accept(
        this,
        expr.qualifier.accept(this, ctx).asScope().scope
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
    val arguments = expr.arguments.map { it.accept(this, ctx) }.toList()
    return expr.function.inferredType(this, arguments)
  }

  override fun <T> visit(expr: Expression.OrderByExpression<T>, ctx: Scope): InferredType {
    return expr.qualifier.accept(this, ctx)
  }
}
