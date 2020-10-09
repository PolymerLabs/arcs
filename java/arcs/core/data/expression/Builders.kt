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
import arcs.core.data.expression.GlobalFunction.Sum
import arcs.core.util.BigInt

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
fun BigInt.asExpr() = Expression.NumberLiteralExpression(this as Number)

/** Constructs a [Expression.TextLiteralExpression] */
fun String.asExpr() = Expression.TextLiteralExpression(this)

/** Constructs a [Expression.BooleanLiteralExpression] */
fun Boolean.asExpr() = Expression.BooleanLiteralExpression(this)

/** Constructs a [Expression.NullLiteralExpression] */
fun nullExpr() = Expression.NullLiteralExpression()

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
infix fun Expression<Any?>.eq(other: Expression<Any?>) = Expression.BinaryExpression(
  Expression.BinaryOp.Equals,
  this,
  other
)

/** Constructs a [Expression.BinaryExpression] with [Expression.BinaryOp.NotEquals]. */
infix fun Expression<Any?>.neq(other: Expression<Any?>) = Expression.BinaryExpression(
  Expression.BinaryOp.NotEquals,
  this,
  other
)

/** Constructs a [Expression.BinaryExpression] with [Expression.BinaryOp.IfNull]. */
infix fun Expression<Any?>.ifNull(other: Expression<Any?>) = Expression.BinaryExpression(
  Expression.BinaryOp.IfNull,
  this,
  other
)

/** Constructs a [Expression.FieldExpression] given an [Expression] and [field]. */
operator fun <T> Expression<Scope>.get(field: String) =
  Expression.FieldExpression<T>(this, field, false)

fun <T> Expression<Scope>.get(field: String, nullSafe: Boolean) =
  Expression.FieldExpression<T>(this, field, nullSafe)

/** Constructs a [Expression.FieldExpression] from a field lookup in a current scope. */
fun <T> lookup(field: String) =
  Expression.FieldExpression<T>(null, field, false)

/** Cast a Field lookup expression to return a Number. */
fun num(field: String) = lookup<Number>(field)

/** Cast a Field lookup expression to return another [Scope]. */
fun scope(field: String) = lookup<Scope>(field)

/** Cast a Field lookup expression to return a String. */
fun text(field: String) = lookup<String>(field)

/** Cast a Field lookup expression to return a Sequence. */
fun <T> seq(field: String) = lookup<Sequence<T>>(field)

/** Constructs a reference to a current scope object for test purposes */
class CurrentScope<V>(map: MutableMap<String, V>) : MapScope<V>("<this>", map)

/** A scope with a simple map backing it, mostly for test purposes. */
open class MapScope<V>(
  override val scopeName: String,
  val map: Map<String, V>,
  val parentScope: MapScope<V>? = null
) : Scope {
  private fun validateContains(param: String): Boolean =
    map.containsKey(param) || parentScope?.validateContains(param) ?: false

  override fun <V> lookup(param: String): V = if (map.containsKey(param)) {
    map[param] as V
  } else if (parentScope != null) {
    parentScope.lookup<V>(param)
  } else {
    throw IllegalArgumentException("Field '$param' not found on scope '$scopeName'")
  }

  override fun builder(subName: String?) = object : Scope.Builder {
    val fields = mutableMapOf<String, V>()
    override fun set(param: String, value: Any?): Scope.Builder {
      fields[param] = value as V
      return this
    }

    override fun build(): Scope = MapScope(subName ?: scopeName, fields, this@MapScope)
  }

  override fun toString() = map.toString()

  private val allKeys get() = map.keys + (parentScope?.map?.keys ?: emptySet())

  override fun equals(other: Any?): Boolean {
    if (this === other) return true
    if (other !is MapScope<*>) return false

    if (scopeName != other.scopeName) return false
    for (key in allKeys) {
      if (lookup<V>(key) != other.lookup<V>(key)) {
        return false
      }
    }

    return true
  }

  override fun hashCode(): Int {
    var result = scopeName.hashCode()
    for (key in allKeys) {
      result = 31 * result + key.hashCode()
      result = 31 * result + lookup<V>(key).hashCode()
    }
    return result
  }
}

/** Constructs a [Scope] from a [Map]. */
fun <T> Map<String, T>.asScope(scopeName: String = "<object>") = MapScope(
  scopeName,
  this.toMutableMap()
)

/** Constructs a [Expression.QueryParameterExpression] with the given [queryArgName]. */
fun <T> query(queryArgName: String) = Expression.QueryParameterExpression<T>(queryArgName)

/** Helper used to build [FromExpression]. */
data class FromBuilder(val iterName: String, val qualifier: Expression<Sequence<Scope>>?)

/** Build a [FromExpression] whose [Sequence] iterates using a scope variable named [iterName]. */
fun from(iterName: String) = FromBuilder(iterName, null)

/** Build a nested [FromExpression] whose [Sequence] iterates a scope variable named [iterName]. */
infix fun Expression<Sequence<Scope>>.from(iterName: String) = FromBuilder(iterName, this)

/** Designates the expression which holds the [Sequence] the from expression iterates on. */
infix fun FromBuilder.on(sequence: Expression<Sequence<Scope>>) =
  Expression.FromExpression(
    this.qualifier,
    sequence,
    this.iterName
  )

/** Constructs a [WhereExpression]. */
infix fun Expression<Sequence<Scope>>.where(expr: Expression<Boolean>) =
  Expression.WhereExpression(this, expr)

/** Helper used to build [LetExpression]. */
data class LetBuilder(val variableName: String, val qualifier: Expression<Sequence<Scope>>)

/** Build a let expression nested inside a qualified expression. */
infix fun Expression<Sequence<Scope>>.let(variableName: String) =
  LetBuilder(variableName, this)

/** Assigns an expression to be evaluated as a value to be introduced into the scope. */
infix fun LetBuilder.be(expression: Expression<Any>) =
  Expression.LetExpression(
    this.qualifier,
    expression,
    this.variableName
  )

/** Constructs a [SelectExpression]. */
infix fun <T> Expression<Sequence<Scope>>.select(expr: Expression<T>) =
  Expression.SelectExpression(this, expr)

/** Helper to construct [NewExpression]. */
data class NewBuilder(val schemaNames: Set<String>) {
  operator fun invoke(
    vararg fields: Pair<String, Expression<*>>
  ): Expression<Scope> = Expression.NewExpression(schemaNames, fields.asList())
}

/** Constructs a [NewBuilder] for the given [schemaName]. */
fun new(vararg schemaNames: String) = NewBuilder(schemaNames.toSet())

/** Constructs a [FunctionExpression] to invoke [Max]. */
fun <T : Comparable<T>> max(expr: Expression<Sequence<T>>) =
  FunctionExpression<T>(Max, listOf(expr))

/** Constructs a [FunctionExpression] to invoke [Min]. */
fun <T : Comparable<T>> min(expr: Expression<Sequence<T>>) =
  FunctionExpression<T>(Min, listOf(expr))

/** Constructs a [FunctionExpression] to invoke [Count]. */
fun count(expr: Expression<*>) = FunctionExpression<Number>(Count, listOf(expr))

/** Constructs a [FunctionExpression] to invoke [Average]. */
fun average(expr: Expression<*>) = FunctionExpression<Number>(Average, listOf(expr))

/** Constructs a [FunctionExpression] to invoke [Average]. */
fun sum(expr: Expression<*>) = FunctionExpression<Number>(Sum, listOf(expr))

/** Constructs a [FunctionExpression] to invoke [First]. */
fun first(expr: Expression<*>) = FunctionExpression<Number>(First, listOf(expr))

/** Constructs a [FunctionExpression] to invoke [Now]. */
fun now() = FunctionExpression<Number>(Now, listOf())

/** Constructs a [FunctionExpression] to invoke [Union]. */
fun <T> union(expr: Expression<T>, other: Expression<T>) =
  FunctionExpression<T>(GlobalFunction.Union, listOf(expr, other))
