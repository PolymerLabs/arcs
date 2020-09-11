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

internal typealias Path = List<String>
internal typealias ClaimDerivations = Map<Path, Set<Path>>

fun <E> MutableList<E>.push(element: E) = add(element)
fun <E> MutableList<E>.pop(): E = removeAt(size - 1)
fun <E> MutableList<E>.peek(): E = this[count()]
fun <E> MutableList<E>.popOrDefault(default: E): E = if (size == 0) default else pop()
fun <E> MutableList<E>.peekOrDefault(default: E): E = if (size == 0) default else peek()

/** A visitor that accumulates [ClaimDerivations] from a Paxel [Expression]. */
class ClaimDeducer : Expression.Visitor<ClaimDerivations> {

    /** Stack of intermediate [Path]s; they have no derivation (yet). */
    /* internal */ val stack = mutableListOf<Path>()

    override fun <E, T> visit(expr: Expression.UnaryExpression<E, T>): ClaimDerivations {
        TODO("Not yet implemented")
    }

    override fun <L, R, T> visit(expr: Expression.BinaryExpression<L, R, T>): ClaimDerivations {
        TODO("Not yet implemented")
    }

    override fun <T> visit(expr: Expression.FieldExpression<T>): ClaimDerivations {
        // Base case: unqualified field must refer to handle connection.
        if (expr.qualifier == null) {
            stack.push(listOf(expr.field))
            return emptyMap()
        }

        // Recursive case: update path on the stack with a child field.
        val previous = expr.qualifier!!.accept(this)
        stack.push(stack.popOrDefault(emptyList()) + listOf(expr.field))

        return previous
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
        expr.fields.fold(emptyMap<Path, Set<Path>>()) { acc, (key, rhs) ->
            acc + rhs.accept(this) + mapOf(key.split(".") to setOf(stack.pop()))
        }

    override fun visit(expr: Expression.NullLiteralExpression): ClaimDerivations {
        TODO("Not yet implemented")
    }
}

/** Deduce Derivation claims from a Paxel [Expression]. */
fun <T> Expression<T>.deduceClaims() = this.accept(ClaimDeducer())
