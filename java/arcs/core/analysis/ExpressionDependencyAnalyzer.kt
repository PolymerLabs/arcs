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

import arcs.core.data.expression.Expression

/** A [DependencyNode] holder class to track visitor results, context, and influence. */
private data class AnalysisResult(
  val node: DependencyNode,
  val ctx: DependencyNode.AssociationNode = DependencyNode.AssociationNode(),
  val influencedBy: Set<DependencyNode> = emptySet()
) {

  /** Cache [DependencyNode]s that bear influence on other nodes. */
  fun addInfluence(influencer: AnalysisResult): AnalysisResult =
    copy(influencedBy = influencedBy + influencer.node)
}

/**
 * A visitor that parses [Expression]s to produce data flow dependencies.
 *
 * For each [Expression], this visitor produces an [AnalysisResult], which can be translated into a
 * set of claims relationships via the [analyze] function.
 *
 * [AnalysisResult] structure [DependencyNode]s into a DAG. These map handle connections in a
 * `ParticleSpec` to the target [Expression].
 */
private class ExpressionDependencyAnalyzer : Expression.Visitor<AnalysisResult, AnalysisResult> {
  override fun <E, T> visit(
    expr: Expression.UnaryExpression<E, T>,
    ctx: AnalysisResult
  ): AnalysisResult {
    val exprResult = expr.expr.accept(this, ctx)
    return exprResult.copy(node = DependencyNode.Derived(exprResult.node))
  }

  override fun <L, R, T> visit(
    expr: Expression.BinaryExpression<L, R, T>,
    ctx: AnalysisResult
  ): AnalysisResult {
    val leftResult = expr.left.accept(this, ctx)
    val rightResult = expr.right.accept(this, ctx)
    return AnalysisResult(
      node = DependencyNode.Derived(leftResult.node, rightResult.node),
      ctx = ctx.ctx,
      influencedBy = leftResult.influencedBy + rightResult.influencedBy
    )
  }

  override fun <T> visit(expr: Expression.FieldExpression<T>, ctx: AnalysisResult): AnalysisResult {
    val defaultNode = ctx.ctx[expr.field] ?: DependencyNode.Input(expr.field)
    val qualifierResult = expr.qualifier?.accept(this, ctx)
      ?: return AnalysisResult(defaultNode)

    val node = when (val qualifier = qualifierResult.node) {
      is DependencyNode.Input -> DependencyNode.Input(
        qualifier.path + expr.field
      )
      is DependencyNode.AssociationNode -> requireNotNull(qualifier[expr.field]) {
        "Field ${expr.field} not found in ${expr.qualifier}."
      }
      is DependencyNode.Derived -> requireNotNull(
        qualifier.inputs.find { it.path.last() == expr.field }
      ) {
        "Field ${expr.field} not found in ${expr.qualifier}."
      }
    }

    return AnalysisResult(node, influencedBy = qualifierResult.influencedBy)
  }

  override fun <T> visit(
    expr: Expression.QueryParameterExpression<T>,
    ctx: AnalysisResult
  ): AnalysisResult {
    TODO("Not yet implemented")
  }

  override fun visit(
    expr: Expression.NumberLiteralExpression,
    ctx: AnalysisResult
  ): AnalysisResult =
    AnalysisResult(DependencyNode.LITERAL)

  override fun visit(expr: Expression.TextLiteralExpression, ctx: AnalysisResult): AnalysisResult =
    AnalysisResult(DependencyNode.LITERAL)

  override fun visit(
    expr: Expression.BooleanLiteralExpression,
    ctx: AnalysisResult
  ): AnalysisResult =
    AnalysisResult(DependencyNode.LITERAL)

  override fun visit(expr: Expression.NullLiteralExpression, ctx: AnalysisResult): AnalysisResult =
    AnalysisResult(DependencyNode.LITERAL)

  override fun visit(expr: Expression.FromExpression, ctx: AnalysisResult): AnalysisResult {
    val scope = (expr.qualifier?.accept(this, ctx) ?: ctx)
    return scope.copy(
      ctx = scope.ctx.add(
        expr.iterationVar to expr.source.accept(
          this,
          scope
        ).node
      )
    )
  }

  override fun visit(expr: Expression.WhereExpression, ctx: AnalysisResult): AnalysisResult {
    val qualifier = expr.qualifier.accept(this, ctx)
    return qualifier.addInfluence(expr.expr.accept(this, qualifier))
  }

  override fun <T> visit(
    expr: Expression.SelectExpression<T>,
    ctx: AnalysisResult
  ): AnalysisResult {
    val qualifier = expr.qualifier.accept(this, ctx)
    val result = expr.expr.accept(this, qualifier)
    return result.copy(node = result.node.influence(qualifier.influencedBy))
  }

  override fun visit(expr: Expression.LetExpression, ctx: AnalysisResult): AnalysisResult {
    val scope = expr.qualifier.accept(this, ctx)
    return scope.copy(
      ctx = scope.ctx.add(
        expr.variableName to expr.variableExpr.accept(
          this,
          scope
        ).node
      )
    )
  }

  override fun <T> visit(
    expr: Expression.FunctionExpression<T>,
    ctx: AnalysisResult
  ): AnalysisResult {
    TODO("Not yet implemented")
  }

  override fun visit(expr: Expression.NewExpression, ctx: AnalysisResult): AnalysisResult {
    return AnalysisResult(
      DependencyNode.AssociationNode(
        associations = expr.fields.associateBy({ it.first }, { it.second.accept(this, ctx).node })
      )
    )
  }

  override fun <T> visit(
    expr: Expression.OrderByExpression<T>,
    ctx: AnalysisResult
  ): AnalysisResult {
    TODO("Not yet implemented")
  }
}

/** Analyze data flow relationships in an [Expression]. */
fun <T> Expression<T>.analyze(): DependencyNode {
  return this.accept(
    ExpressionDependencyAnalyzer(),
    AnalysisResult(DependencyNode.AssociationNode())
  ).node
}
