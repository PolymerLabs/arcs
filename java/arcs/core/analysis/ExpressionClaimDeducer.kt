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

typealias Identifier = String

/**
 * A visitor that produces [Claim]s for Paxel [Expression]s.
 *
 * For each [Expression], this visitor produces a [Deduction], which can be translated into a set
 * of [Claim] relationships.
 *
 * [Deduction]s collect [Expression.FieldExpression]s as [Path]s and associate them with other
 * fields. These are recursive structures, and can represent [Claim] relationships for deeply nested
 * [Expression]s.
 */
class ExpressionClaimDeducer : Expression.Visitor<Deduction, Unit> {
  override fun <E, T> visit(expr: Expression.UnaryExpression<E, T>, ctx: Unit): Deduction {
    TODO("Not yet implemented")
  }

  override fun <L, R, T> visit(expr: Expression.BinaryExpression<L, R, T>, ctx: Unit) =
    expr.left.accept(this, Unit) + expr.right.accept(this, Unit)

  override fun <T> visit(expr: Expression.FieldExpression<T>, ctx: Unit) =
    when (val lhs = expr.qualifier) {
      is Expression.FieldExpression<*> -> {
        val base = lhs.accept(this, Unit)
        Deduction(base.scope, base.context.mergeTop(listOf(expr.field)))
      }
      is Expression.NewExpression -> {
        val base = lhs.accept(this, Unit)
        Deduction(
          base.scope.lookup(expr.field),
          base.context + Deduction.Analysis.Paths(listOf(expr.field))
        )
      }
      null -> Deduction(context = Deduction.Analysis.Paths(listOf(expr.field)))
      else -> lhs.accept(this, Unit) + Deduction(
        context = Deduction.Analysis.Paths(listOf(expr.field))
      )
    }

  override fun <T> visit(expr: Expression.QueryParameterExpression<T>, ctx: Unit): Deduction {
    TODO("Not yet implemented")
  }

  override fun visit(expr: Expression.NumberLiteralExpression, ctx: Unit) = Deduction()

  override fun visit(expr: Expression.TextLiteralExpression, ctx: Unit) = Deduction()

  override fun visit(expr: Expression.BooleanLiteralExpression, ctx: Unit) = Deduction()

  override fun visit(expr: Expression.NullLiteralExpression, ctx: Unit) = Deduction()

  override fun visit(expr: Expression.FromExpression, ctx: Unit): Deduction {
    TODO("Not yet implemented")
  }

  override fun visit(expr: Expression.WhereExpression, ctx: Unit): Deduction {
    TODO("Not yet implemented")
  }

  override fun <T> visit(expr: Expression.SelectExpression<T>, ctx: Unit): Deduction {
    TODO("Not yet implemented")
  }

  override fun visit(expr: Expression.LetExpression, ctx: Unit): Deduction {
    TODO("Not yet implemented")
  }

  override fun <T> visit(expr: Expression.FunctionExpression<T>, ctx: Unit): Deduction {
    TODO("Not yet implemented")
  }

  /** Associates subexpressions and fields as a Derivation [Claim]. */
  override fun visit(expr: Expression.NewExpression, ctx: Unit): Deduction =
    Deduction(
      scope = Deduction.Analysis.Scope(
        expr.fields.groupBy(
          keySelector = { (fieldName, _) -> fieldName },
          valueTransform = { (_, expression) ->
            Deduction.Analysis.Derive(expression.accept(this, Unit).scope)
          }
        )
      ) + Deduction.Analysis.Scope(
        expr.fields.groupBy(
          keySelector = { (fieldName, _) -> fieldName },
          valueTransform = { (_, expression) ->
            Deduction.Analysis.Derive(expression.accept(this, Unit).context)
          }
        )
      ),
      context = Deduction.Analysis.Paths(
        expr.fields.flatMap { (_, expression) ->
          expression.accept(this, Unit).context.paths
        }
      )
    )

  override fun <T> visit(expr: Expression.OrderByExpression<T>, ctx: Unit): Deduction {
    TODO("Not yet implemented")
  }
}

/** Deduce [Claim]s from a Paxel [Expression]. */
fun <T> Expression<T>.deduceClaims() = this.accept(ExpressionClaimDeducer(), Unit)
