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

typealias Identifier = String
typealias Path = List<Identifier>

fun String.asField() = AccessPath.Selector.Field(this)
fun List<String>.asFields() = this.map { it.asField() }

sealed class Claim {
    /**
     * Result of the Path Analysis for an Expression that returns
     * a primitive value (e.g. Integer, String, Boolean), or a sequence
     * of primitive values.
     * TODO(alxr): Update docs
     */
    data class Primitive(val path: Path) : Claim()  {
        constructor(vararg path: Identifier) : this(path.toList())
    }
    data class Equal(val path: Path): Claim() {
        constructor(vararg path: Identifier) : this(path.toList())
    }
    data class Derive(val path: Path): Claim() {
        constructor(vararg path: Identifier) : this(path.toList())
    }
}

sealed class DeductionAnalysis {
    /** TODO(alxr): Document */
    data class Paths(val paths: List<Path> = emptyList()): DeductionAnalysis() {

        constructor(vararg paths: Path) : this(paths.toList())

        operator fun plus(other: Paths) = Paths(paths + other.paths)

        /**
         * Adds extra identifiers to the first [Path] in the collection.
         * Creates first path when the collection is empty.
         */
        fun mergeTop(path: Path): Paths = if (paths.isEmpty()) Paths(path)
            else Paths(listOf(paths.first() + path) + paths.drop(1))
    }
    /**
     * Result of the Path Analysis for an Expression that returns
     * a scope (e.g. Paxel Scope, Entity) or a sequence of scopes.
     * TODO(alxr): Update docs
     */
    data class Scope(
        val associations: Map<Identifier, List<DeductionAnalysis>> = emptyMap()
    ) : DeductionAnalysis() {
        constructor(vararg pairs: Pair<Identifier, List<DeductionAnalysis>>) : this(pairs.toMap())
        operator fun plus(other: Scope): Scope = Scope(
            associations=(associations.entries + other.associations.entries)
                .map { (key, list) -> key to list.filter { it != Scope() && it != Paths() } }
                .fold(emptyMap()) { acc: Map<Identifier, List<DeductionAnalysis>>, (key, list) ->
                     acc + (key to (acc[key]?.plus(list) ?: list))
                }
        )
    }
}

data class Deduction(
    val derivations: DeductionAnalysis.Scope = DeductionAnalysis.Scope(),
    val context: DeductionAnalysis.Paths = DeductionAnalysis.Paths()
) {
    // TODO(alxr): Document
    operator fun plus(other: Deduction): Deduction =
        Deduction(derivations + other.derivations, context + other.context)
}

/** TODO(alxr): adequately document. */
class ExpressionClaimDeducer : Expression.Visitor<Deduction, Unit> {
    override fun <E, T> visit(expr: Expression.UnaryExpression<E, T>, ctx: Unit): Deduction {
        TODO("Not yet implemented")
    }

    override fun <L, R, T> visit(expr: Expression.BinaryExpression<L, R, T>, ctx: Unit) =
        expr.left.accept(this, Unit) + expr.right.accept(this, Unit)

    override fun <T> visit(expr: Expression.FieldExpression<T>, ctx: Unit) =
        when(val lhs = expr.qualifier) {
            is Expression.FieldExpression<*> -> {
                val base = lhs.accept(this, Unit)
                Deduction(base.derivations, base.context.mergeTop(listOf(expr.field)))
            }
            null -> Deduction(context=DeductionAnalysis.Paths(listOf(expr.field)))
            else -> lhs.accept(this, Unit) + Deduction(
                context=DeductionAnalysis.Paths(listOf(expr.field))
            )
        }

    override fun <T> visit(expr: Expression.QueryParameterExpression<T>, ctx: Unit): Deduction {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.NumberLiteralExpression, ctx: Unit) = Deduction()

    override fun visit(expr: Expression.TextLiteralExpression, ctx: Unit): Deduction {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.BooleanLiteralExpression, ctx: Unit): Deduction {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.NullLiteralExpression, ctx: Unit): Deduction {
        TODO("Not yet implemented")
    }

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

    override fun visit(expr: Expression.NewExpression, ctx: Unit): Deduction =
        Deduction(
            derivations = DeductionAnalysis.Scope(
                expr.fields.groupBy(
                    keySelector = { (fieldName, _) -> fieldName },
                    valueTransform = { (_, expression) ->
                        expression.accept(this, Unit).derivations
                    }
                )
            ) + DeductionAnalysis.Scope(
                expr.fields.groupBy(
                    keySelector = { (fieldName, _) -> fieldName },
                    valueTransform = { (_, expression) ->
                        expression.accept(this, Unit).context
                    }
                )
            ),
            context = expr.fields
                .map { (_, expression) -> expression.accept(this, Unit).context }
                .reduce { acc, x -> acc + x}
        )

    override fun <T> visit(expr: Expression.OrderByExpression<T>, ctx: Unit): Deduction {
        TODO("Not yet implemented")
    }
}

/** Deduce Derivation claims from a Paxel [Expression]. */
fun <T> Expression<T>.deduceClaims() = this.accept(ExpressionClaimDeducer(), Unit)
