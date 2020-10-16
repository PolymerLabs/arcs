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
import arcs.core.data.ParticleSpec
import arcs.core.data.expression.Expression

/**
 * A visitor that parses Paxel [Expression]s to produce data flow dependencies.
 *
 * For each [Expression], this visitor produces a [DependencyGraph], which can be translated into a
 * set of [Claim] relationships.
 *
 * [DependencyGraph]s are DAG structures that help map handle connections in a [ParticleSpec] to the
 * target [Expression].
 */
class ExpressionDataFlowAnalyzer : Expression.Visitor<DependencyGraph, Unit> {
  override fun <E, T> visit(expr: Expression.UnaryExpression<E, T>, ctx: Unit): DependencyGraph {
    TODO("Not yet implemented")
  }

  override fun <L, R, T> visit(
    expr: Expression.BinaryExpression<L, R, T>,
    ctx: Unit
  ): DependencyGraph = expr.left.accept(this, ctx) union expr.right.accept(this, ctx)

  override fun <T> visit(expr: Expression.FieldExpression<T>, ctx: Unit): DependencyGraph {
    return when (val lhs = expr.qualifier?.accept(this, ctx)) {
      null -> DependencyGraph.Input(expr.field)
      is DependencyGraph.Input -> DependencyGraph.Input(lhs.path + expr.field)
      is DependencyGraph.Associate -> requireNotNull(lhs.associations[expr.field]) {
        "Identifier '${expr.field}' is not found in Scope."
      }
      is DependencyGraph.Derive -> throw UnsupportedOperationException(
        "Field access on is not defined on a '${expr.qualifier}'."
      )
    }
  }

  override fun <T> visit(expr: Expression.QueryParameterExpression<T>, ctx: Unit): DependencyGraph {
    TODO("Not yet implemented")
  }

  override fun visit(expr: Expression.NumberLiteralExpression, ctx: Unit) = DependencyGraph.LITERAL

  override fun visit(expr: Expression.TextLiteralExpression, ctx: Unit) = DependencyGraph.LITERAL

  override fun visit(expr: Expression.BooleanLiteralExpression, ctx: Unit) = DependencyGraph.LITERAL

  override fun visit(expr: Expression.NullLiteralExpression, ctx: Unit) = DependencyGraph.LITERAL

  override fun visit(expr: Expression.FromExpression, ctx: Unit): DependencyGraph {
    return (expr.qualifier?.accept(this, ctx) ?: DependencyGraph.Associate()) union
      DependencyGraph.Associate(
        expr.iterationVar to expr.source.accept(this, ctx)
      )
  }

  override fun visit(expr: Expression.WhereExpression, ctx: Unit): DependencyGraph {
    TODO("Not yet implemented")
  }

  override fun <T> visit(expr: Expression.SelectExpression<T>, ctx: Unit): DependencyGraph {
    return expr.expr.accept(this, ctx).substitute(
      expr.qualifier.accept(this, ctx) as DependencyGraph.Associate
    )
  }

  override fun visit(expr: Expression.LetExpression, ctx: Unit): DependencyGraph {
    TODO("Not yet implemented")
  }

  override fun <T> visit(expr: Expression.FunctionExpression<T>, ctx: Unit): DependencyGraph {
    TODO("Not yet implemented")
  }

  override fun visit(expr: Expression.NewExpression, ctx: Unit) = DependencyGraph.Associate(
    expr.fields.associateBy({ it.first }, { it.second.accept(this, ctx) })
  )

  override fun <T> visit(expr: Expression.OrderByExpression<T>, ctx: Unit): DependencyGraph {
    TODO("Not yet implemented")
  }
}

/** Analyze data flow relationships in a Paxel [Expression]. */
fun <T> Expression<T>.analyze() = this.accept(ExpressionDataFlowAnalyzer(), Unit)
