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
internal typealias DeductionContext = Paths

/** TODO(alxr): adequately document. */
class ExpressionClaimDeducer : Expression.Visitor<ClaimDerivations, DeductionContext> {

//    fun <L, R, T> visit(expr: Expression.BinaryExpression<L, R, T>): ClaimDerivations {
//        return expr.left.accept(this) + expr.right.accept(this)
//    }
//
//    fun <T> visit(expr: Expression.FieldExpression<T>): ClaimDerivations {
//        return expr.qualifier?.accept(this) ?: emptyMap()
//    }
//
//    fun visit(expr: Expression.NewExpression) =
//        expr.fields.associateBy(
//            keySelector = { (fieldName, _) ->
//                fieldName.split(".").map { AccessPath.Selector.Field(it) }
//            },
//            valueTransform = { (_, expression) ->
//                expression.accept(ExpressionPathAccumulator()).toSet()
//            }
//        )

    override fun <E, T> visit(expr: Expression.UnaryExpression<E, T>, ctx: DeductionContext): ClaimDerivations {
        TODO("Not yet implemented")
    }

    override fun <L, R, T> visit(expr: Expression.BinaryExpression<L, R, T>, ctx: DeductionContext): ClaimDerivations {
        return expr.left.accept(this, ctx) + expr.right.accept(this, ctx)
    }

    override fun <T> visit(expr: Expression.FieldExpression<T>, ctx: DeductionContext): ClaimDerivations {
        return expr.qualifier?.accept(this, ctx + listOf(listOf(AccessPath.Selector.Field(expr.field)))) ?: emptyMap()
    }

    override fun <T> visit(expr: Expression.QueryParameterExpression<T>, ctx: DeductionContext): ClaimDerivations {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.NumberLiteralExpression, ctx: DeductionContext): ClaimDerivations {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.TextLiteralExpression, ctx: DeductionContext): ClaimDerivations {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.BooleanLiteralExpression, ctx: DeductionContext): ClaimDerivations {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.NullLiteralExpression, ctx: DeductionContext): ClaimDerivations {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.FromExpression, ctx: DeductionContext): ClaimDerivations {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.WhereExpression, ctx: DeductionContext): ClaimDerivations {
        TODO("Not yet implemented")
    }

    override fun <T> visit(expr: Expression.SelectExpression<T>, ctx: DeductionContext): ClaimDerivations {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.LetExpression, ctx: DeductionContext): ClaimDerivations {
        TODO("Not yet implemented")
    }

    override fun <T> visit(expr: Expression.FunctionExpression<T>, ctx: DeductionContext): ClaimDerivations {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.NewExpression, ctx: DeductionContext): ClaimDerivations =
        expr.fields.associateBy(
            keySelector = { (fieldName, _) -> listOf(AccessPath.Selector.Field(fieldName)) },
            valueTransform = { (_, expression) ->
                expression.accept(this, ctx)
                ctx.toSet()
            }
        )

    override fun <T> visit(expr: Expression.OrderByExpression<T>, ctx: DeductionContext): ClaimDerivations {
        TODO("Not yet implemented")
    }
}

/** Deduce Derivation claims from a Paxel [Expression]. */
fun <T> Expression<T>.deduceClaims() = this.accept(ExpressionClaimDeducer(), mutableListOf())
