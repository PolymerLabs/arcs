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

import arcs.core.data.Claim
import arcs.core.data.expression.Expression

/**
 * A visitor to help create [Claim]s for Paxel [Expression]s.
 *
 * For each [Expression], this visitor produces a [Deduction], which can be translated into a set
 * of [Claim] relationships.
 *
 * [Deduction]s collect [Expression.FieldExpression]s as [Deduction.Equal]s and associate
 * them with other fields. These are recursive structures, and can represent [Claim] relationships
 * for deeply nested [Expression]s.
 */
class ExpressionClaimDeducer : Expression.Visitor<Deduction, Unit> {
  override fun <E, T> visit(expr: Expression.UnaryExpression<E, T>, ctx: Unit): Deduction {
    TODO("Not yet implemented")
  }

  override fun <L, R, T> visit(expr: Expression.BinaryExpression<L, R, T>, ctx: Unit): Deduction {
    return expr.left.accept(this, ctx) union expr.right.accept(this, ctx)
  }

  override fun <T> visit(expr: Expression.FieldExpression<T>, ctx: Unit): Deduction {
    return when (val lhs = expr.qualifier?.accept(this, ctx)) {
      null -> Deduction.Equal(expr.field)
      is Deduction.Equal -> Deduction.Equal(lhs.path + expr.field)
      is Deduction.Scope -> requireNotNull(lhs.associations[expr.field]) {
        "Identifier '${expr.field}' is not found in Scope."
      }
      is Deduction.Derive -> throw UnsupportedOperationException(
        "Field access on is not defined on a '${expr.qualifier}'."
      )
    }
  }

  override fun <T> visit(expr: Expression.QueryParameterExpression<T>, ctx: Unit): Deduction {
    TODO("Not yet implemented")
  }

  override fun visit(expr: Expression.NumberLiteralExpression, ctx: Unit) = Deduction.LITERAL

  override fun visit(expr: Expression.TextLiteralExpression, ctx: Unit) = Deduction.LITERAL

  override fun visit(expr: Expression.BooleanLiteralExpression, ctx: Unit) = Deduction.LITERAL

  override fun visit(expr: Expression.NullLiteralExpression, ctx: Unit) = Deduction.LITERAL

  override fun visit(expr: Expression.FromExpression, ctx: Unit): Deduction {
    return (expr.qualifier?.accept(this, ctx) ?: Deduction.Scope()) union
      Deduction.Scope(
        expr.iterationVar to expr.source.accept(this, ctx)
      )
  }

  override fun visit(expr: Expression.WhereExpression, ctx: Unit): Deduction {
    TODO("Not yet implemented")
  }

  override fun <T> visit(expr: Expression.SelectExpression<T>, ctx: Unit): Deduction {
    return expr.expr.accept(this, ctx).substitute(
      expr.qualifier.accept(this, ctx) as Deduction.Scope
    )
  }

  override fun visit(expr: Expression.LetExpression, ctx: Unit): Deduction {
    TODO("Not yet implemented")
  }

  override fun <T> visit(expr: Expression.FunctionExpression<T>, ctx: Unit): Deduction {
    TODO("Not yet implemented")
  }

  /** Associates subexpressions and fields as a Derivation [Claim]. */
  override fun visit(expr: Expression.NewExpression, ctx: Unit) = Deduction.Scope(
    expr.fields.associateBy({ it.first }, { it.second.accept(this, ctx) })
  )

  override fun <T> visit(expr: Expression.OrderByExpression<T>, ctx: Unit): Deduction {
    TODO("Not yet implemented")
  }
}

/** Deduce [Claim]s from a Paxel [Expression]. */
fun <T> Expression<T>.deduceClaims() = this.accept(ExpressionClaimDeducer(), Unit)
