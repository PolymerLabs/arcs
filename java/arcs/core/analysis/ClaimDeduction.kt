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

/** A visitor that accumulates field [Paths] from a Paxel [Expression]. */
class ExpressionPathAccumulator : Expression.Visitor<Paths> {

    override fun <L, R, T> visit(expr: Expression.BinaryExpression<L, R, T>): Paths {
        return expr.left.accept(this) + expr.right.accept(this)
    }

    override fun <T> visit(expr: Expression.FieldExpression<T>): Paths {
        val qualifiedPaths = expr.qualifer?.accept(this).first() ?: emptyList()
        return listOf(qualifiedPaths + listOf(AccessPath.Selector.Field(expr.field))
    }

    override fun visit(expr: Expression.NewExpression): Paths =
        expr.fields.map { it.second.accept(this) }.reduce { acc, set -> acc + set }

    override fun <E, T> visit(expr: Expression.UnaryExpression<E, T>): Paths {
        TODO("Not yet implemented")
    }

    override fun <T> visit(expr: Expression.QueryParameterExpression<T>): Paths {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.NumberLiteralExpression): Paths {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.TextLiteralExpression): Paths {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.BooleanLiteralExpression): Paths {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.NullLiteralExpression): Paths {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.FromExpression): Paths {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.WhereExpression): Paths {
        TODO("Not yet implemented")
    }

    override fun <T> visit(expr: Expression.SelectExpression<T>): Paths {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.LetExpression): Paths {
        TODO("Not yet implemented")
    }

    override fun <T> visit(expr: Expression.FunctionExpression<T>): Paths {
        TODO("Not yet implemented")
    }
}

/** A visitor that accumulates [ClaimDerivations] from a Paxel [Expression]. */
class ExpressionClaimDeducer : Expression.Visitor<ClaimDerivations> {

    override fun <E, T> visit(expr: Expression.UnaryExpression<E, T>): ClaimDerivations {
        TODO("Not yet implemented")
    }

    override fun <L, R, T> visit(expr: Expression.BinaryExpression<L, R, T>): ClaimDerivations {
        return expr.left.accept(this) + expr.right.accept(this)
    }

    override fun <T> visit(expr: Expression.FieldExpression<T>): ClaimDerivations {
        return expr.qualifier?.accept(this) ?: emptyMap()
    }

    override fun <T> visit(expr: Expression.QueryParameterExpression<T>): ClaimDerivations {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.NumberLiteralExpression): ClaimDerivations {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.TextLiteralExpression): ClaimDerivations {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.BooleanLiteralExpression): ClaimDerivations {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.FromExpression): ClaimDerivations {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.WhereExpression): ClaimDerivations {
        TODO("Not yet implemented")
    }

    override fun <T> visit(expr: Expression.SelectExpression<T>): ClaimDerivations {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.LetExpression): ClaimDerivations {
        TODO("Not yet implemented")
    }

    override fun <T> visit(expr: Expression.FunctionExpression<T>): ClaimDerivations {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.NewExpression) =
        expr.fields.associateBy(
            keySelector = { (fieldName, _) -> 
               fieldName.split(".").map { AccessPath.Selector.Field(it) } 
            },
            valueTransform = { (_, expression) -> 
                expression.accept(ExpressionPathAccumulator()).toSet()
            }
        )

    override fun visit(expr: Expression.NullLiteralExpression): ClaimDerivations {
        TODO("Not yet implemented")
    }
}

/** Deduce Derivation claims from a Paxel [Expression]. */
fun <T> Expression<T>.deduceClaims() = this.accept(ExpressionClaimDeducer())
