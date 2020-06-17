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

/** Extension, infix, and operator overload functions for constructing Expression DSL. */
package arcs.core.data.expression

/** Constructs a [Expression.NumberLiteralExpression] */
fun Double.asExpr() = Expression.NumberLiteralExpression(this)

/** Constructs a [Expression.NumberLiteralExpression] */
fun Int.asExpr() = Expression.NumberLiteralExpression(this)

/** Constructs a [Expression.TextLiteralExpression] */
fun String.asExpr() = Expression.TextLiteralExpression(this)

/** Constructs a [Expression.BooleanLiteralExpression] */
fun Boolean.asExpr() = Expression.BooleanLiteralExpression(this)

/** Constructs a [Expression.Scope] for looking up query parameter references. */
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

/** Constructs a [Expression.FieldExpression] given a [Expression.Scope] and [field]. */
operator fun <E : Expression.Scope, T> E.get(field: String) = Expression.FieldExpression<E, T>(
    Expression.ObjectLiteralExpression(this), field)

/** Constructs a [Expression.Scope] from a [Map]. */
fun <T> Map<String, T>.asScope(scopeName: String = "<object>") = object : Expression.Scope {
    override val scopeName: String = scopeName
    override fun <T> lookup(param: String): T = this@asScope[param] as T
}

/** Constructs a [Expression.QueryParameterExpression] witht he given [queryArgName]. */
fun <T> query(queryArgName: String) = Expression.QueryParameterExpression<T>(queryArgName)
