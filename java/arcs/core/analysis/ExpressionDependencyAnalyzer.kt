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

private typealias Scope = DependencyNode.AggregateValue

/**
 * A visitor that parses Paxel [Expression]s to produce data flow dependencies.
 *
 * For each [Expression], this visitor produces a [DependencyNode], which can be translated into a
 * set of [Claim] relationships.
 *
 * [DependencyNode]s are DAG structures that help map handle connections in a [ParticleSpec] to the
 * target [Expression].
 */
class ExpressionDependencyAnalyzer : Expression.Visitor<DependencyNode, Scope> {
  override fun <E, T> visit(expr: Expression.UnaryExpression<E, T>, ctx: Scope): DependencyNode =
    DependencyNode.DerivedFrom(expr.expr.accept(this, ctx))

  override fun <L, R, T> visit(expr: Expression.BinaryExpression<L, R, T>, ctx: Scope) =
    DependencyNode.DerivedFrom(
      expr.left.accept(this, ctx),
      expr.right.accept(this, ctx)
    )

  override fun <T> visit(expr: Expression.FieldExpression<T>, ctx: Scope): DependencyNode {
    return when (val qualifier = expr.qualifier?.accept(this, ctx)) {
      null -> ctx.associations.getOrDefault(expr.field, DependencyNode.Input(expr.field))
      is DependencyNode.Input -> DependencyNode.Input(
        qualifier.path + expr.field
      )
      is DependencyNode.AggregateValue -> qualifier.lookup(expr.field)
      is DependencyNode.DerivedFrom -> throw UnsupportedOperationException(
        "Field access on is not defined on a '${expr.qualifier}'."
      )
    }
  }

  override fun <T> visit(expr: Expression.QueryParameterExpression<T>, ctx: Scope): DependencyNode {
    TODO("Not yet implemented")
  }

  override fun visit(expr: Expression.NumberLiteralExpression, ctx: Scope) = DependencyNode.LITERAL

  override fun visit(expr: Expression.TextLiteralExpression, ctx: Scope) = DependencyNode.LITERAL

  override fun visit(expr: Expression.BooleanLiteralExpression, ctx: Scope) = DependencyNode.LITERAL

  override fun visit(expr: Expression.NullLiteralExpression, ctx: Scope) = DependencyNode.LITERAL

  override fun visit(expr: Expression.FromExpression, ctx: Scope): DependencyNode {
    val scope = (expr.qualifier?.accept(this, ctx) ?: ctx) as DependencyNode.AggregateValue
    return scope.add(
      expr.iterationVar to expr.source.accept(this, scope)
    )
  }

  override fun <T> visit(expr: Expression.SelectExpression<T>, ctx: Scope): DependencyNode {
    val qualifier = expr.qualifier.accept(this, ctx) as DependencyNode.AggregateValue
    return expr.expr.accept(this, qualifier)
  }

  override fun visit(expr: Expression.LetExpression, ctx: Scope): DependencyNode {
    TODO("Not yet implemented")
  }

  override fun <T> visit(expr: Expression.FunctionExpression<T>, ctx: Scope): DependencyNode {
    TODO("Not yet implemented")
  }

  override fun visit(expr: Expression.NewExpression, ctx: Scope) = DependencyNode.AggregateValue(
    expr.fields.associateBy({ it.first }, { it.second.accept(this, ctx) })
  )

  override fun <T> visit(expr: Expression.OrderByExpression<T>, ctx: Scope): DependencyNode {
    TODO("Not yet implemented")
  }

  override fun visit(expr: Expression.WhereExpression, ctx: Scope): DependencyNode {
    TODO("Not yet implemented")
  }
}

/** Analyze data flow relationships in a Paxel [Expression]. */
fun <T> Expression<T>.analyze() = this.accept(
  ExpressionDependencyAnalyzer(),
  DependencyNode.AggregateValue()
)
