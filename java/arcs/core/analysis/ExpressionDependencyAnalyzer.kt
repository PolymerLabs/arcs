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

private typealias Scope = DependencyNode.BufferedScope

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
    expr.expr.accept(this, ctx).modified()

  override fun <L, R, T> visit(
    expr: Expression.BinaryExpression<L, R, T>,
    ctx: Scope
  ): DependencyNode =
    DependencyNode.Nodes(expr.left.accept(this, ctx), expr.right.accept(this, ctx)).modified()

  override fun <T> visit(expr: Expression.FieldExpression<T>, ctx: Scope): DependencyNode {
    return expr.qualifier?.accept(this, ctx)?.fieldLookup(expr.field)
      ?: ctx.lookupOrNull(expr.field) ?: DependencyNode.Equals(expr.field)
  }

  override fun <T> visit(expr: Expression.QueryParameterExpression<T>, ctx: Scope): DependencyNode {
    TODO("Not yet implemented")
  }

  override fun visit(expr: Expression.NumberLiteralExpression, ctx: Scope) =
    DependencyNode.Literal("${expr.value}")

  override fun visit(expr: Expression.TextLiteralExpression, ctx: Scope) =
    DependencyNode.Literal(expr.value)

  override fun visit(expr: Expression.BooleanLiteralExpression, ctx: Scope) =
    DependencyNode.Literal("${expr.value}")

  override fun visit(expr: Expression.NullLiteralExpression, ctx: Scope) =
    DependencyNode.Literal("${expr.value}")

  override fun visit(expr: Expression.FromExpression, ctx: Scope): DependencyNode {
    val scope = (expr.qualifier?.accept(this, ctx) ?: ctx) as Scope
    return scope.add(expr.iterationVar to expr.source.accept(this, scope))
  }

  override fun <T> visit(expr: Expression.SelectExpression<T>, ctx: Scope): DependencyNode {
    val qualifier = expr.qualifier.accept(this, ctx) as Scope
    return expr.expr.accept(this, qualifier).applyInfluence(qualifier.buffer)
  }

  override fun visit(expr: Expression.LetExpression, ctx: Scope): DependencyNode {
    val qualifier = expr.qualifier.accept(this, ctx) as Scope
    return qualifier.add(
      expr.variableName to expr.variableExpr.accept(this, qualifier)
    )
  }

  override fun <T> visit(expr: Expression.FunctionExpression<T>, ctx: Scope): DependencyNode {
    TODO("Not yet implemented")
  }

  override fun visit(expr: Expression.NewExpression, ctx: Scope): DependencyNode {
    return DependencyNode.AssociationNode(
      expr.fields.flatMap { (identifier, expression) ->
        val node = expression.accept(this, ctx)
        if (node is DependencyNode.Nodes) node.nodes.map { identifier to it }
        else listOf(identifier to node)
      }
    )
  }

  override fun <T> visit(expr: Expression.OrderByExpression<T>, ctx: Scope): DependencyNode {
    TODO("Not yet implemented")
  }

  override fun visit(expr: Expression.WhereExpression, ctx: Scope): DependencyNode {
    val qualifier = expr.qualifier.accept(this, ctx) as Scope
    val expression = expr.expr.accept(this, qualifier).influenced()
    return qualifier.addInfluence(DependencyNode.Nodes(expression))
  }
}

/** Analyze data flow relationships in a Paxel [Expression]. */
fun <T> Expression<T>.analyze() = this.accept(
  ExpressionDependencyAnalyzer(),
  DependencyNode.BufferedScope()
)

/** Converts appropriate [DependencyNode]s to [DependencyNode.DerivedFrom] nodes. */
private fun DependencyNode.modified(): DependencyNode {
  return when (this) {
    is DependencyNode.Literal -> this
    is DependencyNode.InfluencedBy -> this
    is DependencyNode.Input -> DependencyNode.DerivedFrom(path)
    is DependencyNode.Nodes -> DependencyNode.Nodes(this.nodes.map { it.modified() })
    is DependencyNode.AssociationNode -> DependencyNode.AssociationNode(
      this.associations.map { (identifier, node) -> identifier to node.modified() }
    )
    is DependencyNode.BufferedScope -> copy(
      context=context.modified() as DependencyNode.AssociationNode
    )
  }
}

/**
 * Extends path of the appropriate [DependencyNode]s, or returns the right-hand-side of an
 * association.
 */
private fun DependencyNode.fieldLookup(field: String): DependencyNode? {
  return when (this) {
    is DependencyNode.Literal -> this
    is DependencyNode.InfluencedBy -> this
    is DependencyNode.Equals -> DependencyNode.Equals(this.path + field)
    is DependencyNode.DerivedFrom -> DependencyNode.DerivedFrom(this.path + field)
    is DependencyNode.Input -> DependencyNode.Input(this.path + field, edge)
    is DependencyNode.Nodes -> DependencyNode.Nodes(
      this.nodes.map { it.fieldLookup(field) as DependencyNode }
    )
    is DependencyNode.AssociationNode -> lookupOrNull(field)
    is DependencyNode.BufferedScope -> lookupOrNull(field)
  }
}

private fun DependencyNode.influenced(): DependencyNode {
  return when (this) {
    is DependencyNode.Literal -> DependencyNode.Nodes()
    is DependencyNode.Input -> DependencyNode.InfluencedBy(path)
    is DependencyNode.Nodes -> DependencyNode.Nodes(this.nodes.map { it.influenced() })
    is DependencyNode.AssociationNode -> DependencyNode.AssociationNode(
      this.associations.map { (identifier, node) -> identifier to node.influenced() }
    )
    is DependencyNode.BufferedScope -> copy(
      context=context.influenced() as DependencyNode.AssociationNode
    )
  }
}

private fun DependencyNode.applyInfluence(influencers: DependencyNode.Nodes): DependencyNode {
  if (influencers.isEmpty()) return this
  return when (this) {
    is DependencyNode.Literal -> influencers
    is DependencyNode.Input -> influencers.add(this)
    is DependencyNode.Nodes -> DependencyNode.Nodes(
      this.nodes.map { it.applyInfluence(influencers) }
    ).concat(influencers)
    is DependencyNode.AssociationNode -> DependencyNode.AssociationNode(
      *this.associations.map { (identifier, node) ->
        identifier to node.applyInfluence(influencers)
      }.toTypedArray()
    )
    is DependencyNode.BufferedScope -> DependencyNode.BufferedScope(
      context=context.applyInfluence(influencers) as DependencyNode.AssociationNode,
      buffer=buffer.concat(influencers)
    )
  }
}
