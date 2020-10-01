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
    expr.left.accept(this, ctx) + expr.right.accept(this, ctx)

  override fun <T> visit(expr: Expression.FieldExpression<T>, ctx: Unit) =
    when (val lhs = expr.qualifier) {
      is Expression.FieldExpression<*> -> {
        val base = lhs.accept(this, ctx)
        val field = Deduction.Analysis.Path(expr.field).substitute(base.aliases)
        Deduction(base.scope, base.context.mergeTop(field), base.aliases)
      }
      is Expression.NewExpression -> {
        val base = lhs.accept(this, ctx)
        val field = Deduction.Analysis.Paths(listOf(expr.field)).substitute(base.aliases)
        Deduction(
          base.scope.lookup(expr.field),
          base.context + field,
          base.aliases
        )
      }
      null -> Deduction(context = Deduction.Analysis.Paths(listOf(expr.field)))
      else -> {
        val base = lhs.accept(this, ctx)
        val field = Deduction.Analysis.Paths(listOf(expr.field)).substitute(base.aliases)
        base + Deduction(context = field)
      }
    }

  override fun <T> visit(expr: Expression.QueryParameterExpression<T>, ctx: Unit): Deduction {
    TODO("Not yet implemented")
  }

  override fun visit(expr: Expression.NumberLiteralExpression, ctx: Unit) = Deduction()

  override fun visit(expr: Expression.TextLiteralExpression, ctx: Unit) = Deduction()

  override fun visit(expr: Expression.BooleanLiteralExpression, ctx: Unit) = Deduction()

  override fun visit(expr: Expression.NullLiteralExpression, ctx: Unit) = Deduction()

  override fun visit(expr: Expression.FromExpression, ctx: Unit) =
    (expr.qualifier?.accept(this, ctx) ?: Deduction()) + Deduction(
      aliases = mapOf(
        expr.iterationVar to expr.source.accept(this, ctx).context
      )
    )

  override fun visit(expr: Expression.WhereExpression, ctx: Unit): Deduction {
    TODO("Not yet implemented")
  }

  override fun <T> visit(expr: Expression.SelectExpression<T>, ctx: Unit): Deduction {
    val qualifier = expr.qualifier.accept(this, ctx)
    val selection = expr.expr.accept(this, ctx)

    val pathsWithAliases = selection.context.substitute(qualifier.aliases)

    return qualifier + Deduction(
      scope = selection.scope.substitute(qualifier.aliases),
      context = when (expr.expr) {
        is Expression.FieldExpression<*> -> {
          Deduction.Analysis.Paths(Deduction.Analysis.Equal(pathsWithAliases.getPath()))
        }
        is Expression.BinaryExpression<*, *, *> -> Deduction.Analysis.Paths(
          pathsWithAliases.paths.map { Deduction.Analysis.Derive(it) }
        )
        else -> pathsWithAliases
      },
      aliases = selection.aliases
    )
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
            Deduction.Analysis.Derive(expression.accept(this, ctx).scope)
          }
        )
      ) + Deduction.Analysis.Scope(
        expr.fields.groupBy(
          keySelector = { (fieldName, _) -> fieldName },
          valueTransform = { (_, expression) ->
            Deduction.Analysis.Derive(expression.accept(this, ctx).context)
          }
        )
      ),
      context = Deduction.Analysis.Paths(
        expr.fields.flatMap { (_, expression) ->
          expression.accept(this, ctx).context.paths
        }
      ),
      aliases = expr.fields.fold(emptyMap()) { acc, (_, expression) ->
        acc + expression.accept(this, ctx).aliases
      }
    )

  override fun <T> visit(expr: Expression.OrderByExpression<T>, ctx: Unit): Deduction {
    TODO("Not yet implemented")
  }
}

/** Deduce [Claim]s from a Paxel [Expression]. */
fun <T> Expression<T>.deduceClaims() = this.accept(ExpressionClaimDeducer(), Unit)
