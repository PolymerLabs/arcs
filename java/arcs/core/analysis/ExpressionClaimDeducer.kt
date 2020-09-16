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

import arcs.core.data.AccessPath
import arcs.core.data.expression.Expression

internal typealias Path = List<AccessPath.Selector.Field>
internal typealias Paths = List<Path>
internal typealias ClaimDerivations = Map<Path, Set<Path>>

fun String.asField() = AccessPath.Selector.Field(this)
fun List<String>.asFields() = this.map { it.asField() }

data class DeductionResult(
    val derivations: ClaimDerivations = emptyMap(),
    val context: Paths = emptyList()
) {
    // TODO(alxr): Document
    operator fun plus(other: DeductionResult): DeductionResult =
        DeductionResult(derivations + other.derivations, context + other.context)
}

/** TODO(alxr): adequately document. */
class ExpressionClaimDeducer : Expression.Visitor<DeductionResult, Unit> {

    override fun <E, T> visit(expr: Expression.UnaryExpression<E, T>, ctx: Unit): DeductionResult {
        TODO("Not yet implemented")
    }

    override fun <L, R, T> visit(expr: Expression.BinaryExpression<L, R, T>, ctx: Unit): DeductionResult =
        expr.left.accept(this, Unit) + expr.right.accept(this, Unit)

    override fun <T> visit(expr: Expression.FieldExpression<T>, ctx: Unit): DeductionResult {
        val dep = expr.qualifier?.accept(this, Unit) ?: DeductionResult()
        val head = if (dep.context.isEmpty()) emptyList() else dep.context.first()
        return DeductionResult(dep.derivations, context = listOf(head + listOf(expr.field).asFields()))
    }

    override fun <T> visit(expr: Expression.QueryParameterExpression<T>, ctx: Unit): DeductionResult {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.NumberLiteralExpression, ctx: Unit): DeductionResult {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.TextLiteralExpression, ctx: Unit): DeductionResult {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.BooleanLiteralExpression, ctx: Unit): DeductionResult {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.NullLiteralExpression, ctx: Unit): DeductionResult {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.FromExpression, ctx: Unit): DeductionResult {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.WhereExpression, ctx: Unit): DeductionResult {
        TODO("Not yet implemented")
    }

    override fun <T> visit(expr: Expression.SelectExpression<T>, ctx: Unit): DeductionResult {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.LetExpression, ctx: Unit): DeductionResult {
        TODO("Not yet implemented")
    }

    override fun <T> visit(expr: Expression.FunctionExpression<T>, ctx: Unit): DeductionResult {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.NewExpression, ctx: Unit): DeductionResult =
        DeductionResult(
            derivations = expr.fields.associateBy(
                keySelector = { (fieldName, _) -> fieldName.split(".").asFields() },
                valueTransform = { (_, expression) ->
                    expression.accept(this, Unit).context.toSet()
                }
            ),
            context = expr.fields.flatMap {
                (_, expression) -> expression.accept(this, Unit).context
            }
        )

    override fun <T> visit(expr: Expression.OrderByExpression<T>, ctx: Unit): DeductionResult {
        TODO("Not yet implemented")
    }
}

/** Deduce Derivation claims from a Paxel [Expression]. */
fun <T> Expression<T>.deduceClaims() = this.accept(ExpressionClaimDeducer(), Unit)
