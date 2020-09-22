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

typealias Identifier = String
typealias Path = List<Identifier>

/** TODO(alxr): Document */
data class Deduction(
    val derivations: Analysis.Scope = Analysis.Scope(),
    val context: Analysis.Paths = Analysis.Paths()
) {
    /** Merge two [Deduction]s into a new [Deduction]. */
    operator fun plus(other: Deduction) = Deduction(
        derivations + other.derivations,
        context + other.context
    )

    sealed class Analysis {
        /** Returns true if the [Analysis] collection has no members. */
        open fun isEmpty(): Boolean = true

        /** Returns true if the [Analysis] collection has some members. */
        fun isNotEmpty(): Boolean = !isEmpty()

        /** TODO(alxr): Document */
        data class Paths(val paths: List<Path> = emptyList()): Analysis() {

            constructor(vararg paths: Path) : this(paths.toList())

            /** Combine two [Paths] into a new [Paths] object. */
            operator fun plus(other: Paths) = Paths(paths + other.paths)

            /**
             * Adds extra identifiers to the first [Path] in the collection.
             * Creates first path when the collection is empty.
             */
            fun mergeTop(path: Path) = if (paths.isEmpty()) {
                Paths(path)
            } else {
                Paths(listOf(paths.first() + path) + paths.drop(1))
            }

            override fun isEmpty() = paths.isEmpty()
        }

        /**
         * TODO(alxr): Document
         */
        data class Scope(
            val associations: Map<Identifier, List<Analysis>> = emptyMap()
        ) : Analysis() {
            constructor(vararg pairs: Pair<Identifier, List<Analysis>>) : this(pairs.toMap())

            /**
             * Combine two [Scope]s into a new [Scope].
             *
             * This operation will remove all empty [Analysis] associations.
             */
            operator fun plus(other: Scope): Scope = Scope(
                associations=(associations.entries + other.associations.entries)
                    .map { (key, list) -> key to list.filter(Analysis::isNotEmpty) }
                    .fold(emptyMap()) { acc: Map<Identifier, List<Analysis>>, (key, list) ->
                        acc + (key to (acc[key]?.plus(list) ?: list))
                    }
            )

            override fun isEmpty() = associations.isEmpty()
        }

        /** Used to indicate an Equality Claim. */
        data class Equal(val op: Analysis): Analysis() {
            override fun isEmpty(): Boolean = op.isEmpty()
        }

        /** Used to indicate a Derivation Claim. */
        data class Derive(val op: Analysis): Analysis() {
            override fun isEmpty(): Boolean = op.isEmpty()
        }
    }
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
            null -> Deduction(context=Deduction.Analysis.Paths(listOf(expr.field)))
            else -> lhs.accept(this, Unit) + Deduction(
                context=Deduction.Analysis.Paths(listOf(expr.field))
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

    override fun visit(expr: Expression.NewExpression, ctx: Unit): Deduction =
        Deduction(
            derivations = Deduction.Analysis.Scope(
                expr.fields.groupBy(
                    keySelector = { (fieldName, _) -> fieldName },
                    valueTransform = { (_, expression) ->
                        Deduction.Analysis.Derive(expression.accept(this, Unit).derivations)
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
