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
@file:Suppress("UNCHECKED_CAST")

/** Extension, infix, and operator overload functions for constructing Expression DSL. These
 * are mostly used for testing. */
package arcs.core.data.expression

import arcs.core.data.expression.Expression.FunctionExpression
import arcs.core.data.expression.Expression.Scope
import arcs.core.data.expression.GlobalFunction.Average
import arcs.core.data.expression.GlobalFunction.Count
import arcs.core.data.expression.GlobalFunction.First
import arcs.core.data.expression.GlobalFunction.Max
import arcs.core.data.expression.GlobalFunction.Min
import arcs.core.data.expression.GlobalFunction.Now
import java.math.BigInteger

/** Constructs a [Expression.NumberLiteralExpression] */
fun Double.asExpr() = Expression.NumberLiteralExpression(this)

/** Constructs a [Expression.NumberLiteralExpression] */
fun Float.asExpr() = Expression.NumberLiteralExpression(this)

/** Constructs a [Expression.NumberLiteralExpression] */
fun Int.asExpr() = Expression.NumberLiteralExpression(this)

/** Constructs a [Expression.NumberLiteralExpression] */
fun Long.asExpr() = Expression.NumberLiteralExpression(this)

/** Constructs a [Expression.NumberLiteralExpression] */
fun Short.asExpr() = Expression.NumberLiteralExpression(this)

/** Constructs a [Expression.NumberLiteralExpression] */
fun Byte.asExpr() = Expression.NumberLiteralExpression(this)

/** Constructs a [Expression.NumberLiteralExpression] */
fun BigInteger.asExpr() = Expression.NumberLiteralExpression(this)

/** Constructs a [Expression.TextLiteralExpression] */
fun String.asExpr() = Expression.TextLiteralExpression(this)

/** Constructs a [Expression.BooleanLiteralExpression] */
fun Boolean.asExpr() = Expression.BooleanLiteralExpression(this)

/** Constructs a [Scope] for looking up currentScope references. */
fun <T> CurrentScope() = CurrentScope<T>(mutableMapOf())

/** Constructs a [Scope] for looking up query parameter references. */
fun ParameterScope() = mutableMapOf<String, Any>().asScope()

/** Constructs a [Expression.UnaryExpression] with [Expression.UnaryOp.Not]. */
operator fun Expression<Boolean>.not() = Expression.UnaryExpression(Expression.UnaryOp.Not, this)

/** Constructs a [Expression.UnaryExpression] with [Expression.UnaryOp.Negate]. */
operator fun Expression<Number>.unaryMinus() =
    Expression.UnaryExpression(Expression.UnaryOp.Negate, this)

/** Constructs a [Expression.BinaryExpression] with [Expression.BinaryOp.And]. */
infix fun Expression<Boolean>.and(other: Expression<Boolean>) = Expression.BinaryExpression(
    Expression.BinaryOp.And,
    this,
    other
)

/** Constructs a [Expression.BinaryExpression] with [Expression.BinaryOp.Or]. */
infix fun Expression<Boolean>.or(other: Expression<Boolean>) = Expression.BinaryExpression(
    Expression.BinaryOp.Or,
    this,
    other
)

/** Constructs a [Expression.BinaryExpression] with [Expression.BinaryOp.Add]. */
operator fun Expression<Number>.plus(other: Expression<Number>) = Expression.BinaryExpression(
    Expression.BinaryOp.Add,
    this,
    other
)

/** Constructs a [Expression.BinaryExpression] with [Expression.BinaryOp.Subtract]. */
operator fun Expression<Number>.minus(other: Expression<Number>) = Expression.BinaryExpression(
    Expression.BinaryOp.Subtract,
    this,
    other
)

/** Constructs a [Expression.BinaryExpression] with [Expression.BinaryOp.Multiply]. */
operator fun Expression<Number>.times(other: Expression<Number>) = Expression.BinaryExpression(
    Expression.BinaryOp.Multiply,
    this,
    other
)

/** Constructs a [Expression.BinaryExpression] with [Expression.BinaryOp.Divide]. */
operator fun Expression<Number>.div(other: Expression<Number>) = Expression.BinaryExpression(
    Expression.BinaryOp.Divide,
    this,
    other
)

/** Constructs a [Expression.BinaryExpression] with [Expression.BinaryOp.GreaterThan]. */
infix fun Expression<Number>.gt(other: Expression<Number>) = Expression.BinaryExpression(
    Expression.BinaryOp.GreaterThan,
    this,
    other
)

/** Constructs a [Expression.BinaryExpression] with [Expression.BinaryOp.GreaterThanOrEquals]. */
infix fun Expression<Number>.gte(other: Expression<Number>) = Expression.BinaryExpression(
    Expression.BinaryOp.GreaterThanOrEquals,
    this,
    other
)

/** Constructs a [Expression.BinaryExpression] with [Expression.BinaryOp.LessThan]. */
infix fun Expression<Number>.lt(other: Expression<Number>) = Expression.BinaryExpression(
    Expression.BinaryOp.LessThan,
    this,
    other
)

/** Constructs a [Expression.BinaryExpression] with [Expression.BinaryOp.LessThanOrEquals]. */
infix fun Expression<Number>.lte(other: Expression<Number>) = Expression.BinaryExpression(
    Expression.BinaryOp.LessThanOrEquals,
    this,
    other
)

/** Constructs a [Expression.BinaryExpression] with [Expression.BinaryOp.Equals]. */
infix fun Expression<out Any>.eq(other: Expression<out Any>) = Expression.BinaryExpression(
    Expression.BinaryOp.Equals,
    this as Expression<Any>,
    other as Expression<Any>
)

/** Constructs a [Expression.BinaryExpression] with [Expression.BinaryOp.NotEquals]. */
infix fun Expression<out Any>.neq(other: Expression<out Any>) = Expression.BinaryExpression(
    Expression.BinaryOp.NotEquals,
    this as Expression<Any>,
    other as Expression<Any>
)

/** Constructs a [Expression.FieldExpression] given a [Scope] and [field]. */
operator fun <E : Scope, T> E.get(field: String) = Expression.FieldExpression<E, T>(
    when (this) {
        is CurrentScope<*> -> Expression.CurrentScopeExpression()
        is MapScope<*> -> Expression.ObjectLiteralExpression(this as E)
        else -> this as Expression<E>
    }, field)

/** Constructs a [Expression.FieldExpression] given an [Expression] and [field]. */
operator fun <E : Scope, T> Expression<E>.get(field: String) =
    Expression.FieldExpression<E, T>(this, field)

/** Constructs a [Expression.FieldExpression] from a field lookup in a current scope. */
fun <T> lookup(field: String) =
    Expression.FieldExpression<CurrentScope<T>, T>(Expression.CurrentScopeExpression(), field)

fun num(field: String) = lookup<Number>(field)
fun scope(field: String) = lookup<Scope>(field)
fun text(field: String) = lookup<String>(field)
fun <T> seq(field: String) = lookup<Sequence<T>>(field)

/** Cast a Field lookup expression to return a Number. */
fun <E : Scope, T> Expression.FieldExpression<E, T>.asNumber() =
    this as Expression.FieldExpression<E, Number>

/** Cast a Field lookup expression to return a Sequence. */
fun <R> Expression.FieldExpression<CurrentScope<Any>, Any>.asSequence() =
    this as Expression.FieldExpression<Scope, Sequence<R>>

/** Cast a Field lookup expression to return another [Scope]. */
fun <E : Scope, T> Expression.FieldExpression<E, T>.asScope() =
    this as Expression.FieldExpression<E, Scope>

/** Constructs a reference to a current scope object for test purposes */
class CurrentScope<V>(map: MutableMap<String, V>) : MapScope<V>("<this>", map)

/** A scope with a simple map backing it, mostly for test purposes. */
open class MapScope<V>(
    override val scopeName: String,
    val map: MutableMap<String, V>
) : Scope {
    override fun <V> lookup(param: String): V = map[param] as V
    override fun set(param: String, value: Any) {
        map[param] = value as V
    }
    override fun toString() = map.toString()
}

/** Constructs a [Scope] from a [Map]. */
fun <T> Map<String, T>.asScope(scopeName: String = "<object>") = MapScope(
    scopeName,
    this.toMutableMap()
)

/** Constructs a [Expression.QueryParameterExpression] with the given [queryArgName]. */
fun <T> query(queryArgName: String) = Expression.QueryParameterExpression<T>(queryArgName)

/** Helper used to build [FromExpression]. */
data class FromBuilder<T, Q>(val iterName: String, val qualifier: Expression<Sequence<Q>>?)

/** Build a [FromExpression] whose [Sequence] iterates using a scope variable named [iterName]. */
fun <T> from(iterName: String) = FromBuilder<T, T>(iterName, null)

/** Build a nested [FromExpression] whose [Sequence] iterates a scope variable named [iterName]. */
fun <Q, T> Expression<Sequence<Q>>.from(iterName: String) = FromBuilder<T, Q>(iterName, this)

/** Designates the expression which holds the [Sequence] the from expression iterates on. */
infix fun <T, Q> FromBuilder<T, Q>.on(sequence: Expression<Sequence<T>>) =
    Expression.FromExpression<Q, T>(this.qualifier, sequence, this.iterName)

/** Constructs a [WhereExpression]. */
infix fun <T> Expression<Sequence<T>>.where(expr: Expression<Boolean>) =
    Expression.WhereExpression(this, expr)

/** Constructs a [SelectExpression]. */
infix fun <E, T> Expression<Sequence<E>>.select(expr: Expression<T>) =
    Expression.SelectExpression(this, expr)

/** Helper to construct [NewExpression]. */
data class NewBuilder<E, T>(val schemaNames: Set<String>) {
    operator fun invoke(
        block: () -> List<Pair<String, Expression<*>>>
    ): Expression<T> = Expression.NewExpression(schemaNames, block())
}

/** Constructs a [NewBuilder] for the given [schemaName]. */
fun <E, T> new(vararg schemaNames: String) = NewBuilder<E, T>(schemaNames.toSet())

/** Constructs a [FunctionExpression] to invoke [Max]. */
fun max(expr: Expression<*>) = FunctionExpression<Number>(Max, listOf(expr))

/** Constructs a [FunctionExpression] to invoke [Min]. */
fun min(expr: Expression<*>) = FunctionExpression<Number>(Min, listOf(expr))

/** Constructs a [FunctionExpression] to invoke [Count]. */
fun count(expr: Expression<*>) = FunctionExpression<Number>(Count, listOf(expr))

/** Constructs a [FunctionExpression] to invoke [Average]. */
fun average(expr: Expression<*>) = FunctionExpression<Number>(Average, listOf(expr))

/** Constructs a [FunctionExpression] to invoke [First]. */
fun first(expr: Expression<*>) = FunctionExpression<Number>(First, listOf(expr))

/** Constructs a [FunctionExpression] to invoke [Now]. */
fun now() = FunctionExpression<Long>(Now, listOf())

/** Constructs a [FunctionExpression] to invoke [Union]. */
fun <T> union(expr: Expression<T>, other: Expression<T>) =
    FunctionExpression<T>(GlobalFunction.Union, listOf(expr, other))
