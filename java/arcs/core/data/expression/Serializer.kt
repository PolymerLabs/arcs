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

package arcs.core.data.expression

import arcs.core.data.expression.Expression.BinaryExpression
import arcs.core.data.expression.Expression.BinaryOp
import arcs.core.data.expression.Expression.UnaryExpression
import arcs.core.data.expression.Expression.UnaryOp
import arcs.core.util.Json
import arcs.core.util.JsonValue
import arcs.core.util.JsonValue.*
import arcs.core.util.JsonVisitor
import java.math.BigInteger

/** Traverses a tree of [Expression] objects, serializing it into a JSON format. */
class ExpressionSerializer() : Expression.Visitor<JsonValue<*>> {

    override fun <E, T> visit(expr: UnaryExpression<E, T>) =
        JsonObject(
            mapOf(
                "op" to JsonString(expr.op.token),
                "expr" to expr.expr.accept(this)
            )
        )

    override fun <L, R, T> visit(expr: BinaryExpression<L, R, T>) =
        JsonObject(
            mapOf(
                "op" to JsonString(expr.op.token),
                "left" to expr.left.accept(this),
                "right" to expr.right.accept(this)
            )
        )

    override fun <E : Expression.Scope, T> visit(expr: Expression.FieldExpression<E, T>) =
        JsonObject(
            mapOf(
                "op" to JsonString("."),
                "qualifier" to expr.qualifier.accept(this),
                "field" to JsonString(expr.field)
            )
        )

    override fun <E : Expression.Scope> visit(expr: Expression.CurrentScopeExpression<E>) =
        JsonObject(
            mapOf(
                "op" to JsonString("this")
            )
        )

    override fun <T> visit(expr: Expression.QueryParameterExpression<T>) =
        JsonObject(
            mapOf(
                "op" to JsonString("?"),
                "identifier" to JsonString(expr.paramIdentifier)
            )
        )

    override fun visit(expr: Expression.NumberLiteralExpression) = toNumber(expr.value)

    override fun visit(expr: Expression.TextLiteralExpression) = JsonString(expr.value)

    override fun visit(expr: Expression.BooleanLiteralExpression) = JsonBoolean(expr.value)

    override fun <T> visit(expr: Expression.ObjectLiteralExpression<T>) =
        throw IllegalArgumentException("Can't serialize an ObjectLiteralExpression")

    override fun <T, R> visit(expr: Expression.FromExpression<T, R>) =
        JsonObject(
            mapOf(
                "op" to JsonString("from"),
                "source" to JsonString(expr.source),
                "var" to JsonString(expr.iterationVar),
                "expr" to expr.iterationExpr.accept(this)
            )
        )

    override fun <T, R> visit(expr: Expression.ComposeExpression<T, R>) =
        JsonObject(
            mapOf(
                "op" to JsonString("compose"),
                "leftExpr" to expr.leftExpr.accept(this),
                "rightExpr" to expr.rightExpr.accept(this)
            )
        )

    override fun <T> visit(expr: Expression.WhereExpression<T>) =
        JsonObject(
            mapOf(
                "op" to JsonString("where"),
                "expr" to expr.expr.accept(this)
            )
        )

    override fun <T> visit(expr: Expression.SelectExpression<T>) =
        JsonObject(
            mapOf(
                "op" to JsonString("select"),
                "expr" to expr.expr.accept(this)
            )
        )

    override fun <T> visit(expr: Expression.NewExpression<T>) =
        JsonObject(
            mapOf(
                "op" to JsonString("new"),
                "schemaName" to JsonArray(expr.schemaName.map { JsonString(it) }),
                "fields" to JsonObject(
                    expr.fields.associateBy({ it.first }, { it.second.accept(this) })
                )
            )
        )
}

/** Traverses a parsed [JsonValue] representation and returns decoded [Expression] */
class ExpressionDeserializer : JsonVisitor<Expression<*>> {
    override fun visit(value: JsonBoolean) = Expression.BooleanLiteralExpression(value.value)

    override fun visit(value: JsonString) = Expression.TextLiteralExpression(value.value)

    override fun visit(value: JsonNumber) = Expression.NumberLiteralExpression(value.value)

    override fun visit(value: JsonArray) =
        throw IllegalArgumentException("Arrays should not appear in JSON Serialized Expressions")

    override fun visit(value: JsonObject): Expression<*> {
        val type = value["op"].string()!!

        return when {
            type == "." -> Expression.FieldExpression<Expression.Scope, Any>(
                visit(value["qualifier"]) as Expression<Expression.Scope>, value["field"].string()!!
            )
            BinaryOp.fromToken(type) != null -> {
                BinaryExpression<Any, Any, Any>(
                    BinaryOp.fromToken(type) as BinaryOp<Any, Any, Any>,
                    visit(value["left"]) as Expression<Any>,
                    visit(value["right"]) as Expression<Any>
                )
            }
            UnaryOp.fromToken(type) != null -> {
                UnaryExpression<Any, Any>(
                    UnaryOp.fromToken(type)!! as UnaryOp<Any, Any>,
                    visit(value["expr"]) as Expression<Any>
                )
            }
            type == "number" -> Expression.NumberLiteralExpression(fromNumber(value))
            type == "this" -> Expression.CurrentScopeExpression<Expression.Scope>()
            type == "?" -> Expression.QueryParameterExpression<Any>(value["identifier"].string()!!)
            type == "from" ->
                Expression.FromExpression<Any, Any>(
                    value["source"].string()!!,
                    value["var"].string()!!,
                    visit(value["expr"]) as Expression<Sequence<Any>>
                )
            type == "compose" ->
                Expression.ComposeExpression<Any, Any>(
                    visit(value["leftExpr"]) as Expression<Sequence<Any>>,
                    visit(value["rightExpr"]) as Expression<Sequence<Any>>
                )
            type == "where" ->
                Expression.WhereExpression<Any>(
                    visit(value["expr"]) as Expression<Boolean>
                )
            type == "select" ->
                Expression.SelectExpression(
                    visit(value["expr"]) as Expression<Sequence<Any>>
                )
            type == "new" ->
                Expression.NewExpression<Any>(
                    value["schemaName"].array()!!.value.map { it.string()!! }.toSet(),
                    value["expr"].obj()!!.value.map { (name, expr) ->
                       name to visit(expr)
                    }.toList()
                )
            else -> throw IllegalArgumentException("Unknown type $type during deserialization")
        }
    }

    override fun visit(value: JsonNull) =
        throw IllegalArgumentException("Nulls should not appear in JSON serialized expressions")
}

/** Given an expression, return a string representation. */
fun <T> Expression<T>.serialize() = this.accept(ExpressionSerializer()).toString()

/** Given a serialized [Expression], deserialize it. */
fun String.deserializeExpression() = ExpressionDeserializer().visit(Json.parse(this))

private fun toNumberType(value: Number) = when (value) {
    is Float -> "F"
    is Int -> "I"
    is Short -> "S"
    is Double -> "D"
    is BigInteger -> "BI"
    is Long -> "L"
    is Byte -> "B"
    else -> throw IllegalArgumentException("Unknown type of number $value, ${value::class}")
}

private fun toDouble(value: JsonObject) = value["value"].string()!!.toDouble()

private fun toInt(value: JsonObject) = value["value"].string()!!.toInt()

private fun fromNumber(value: JsonObject): Number = when (value["type"].string()!!) {
    "F" -> toDouble(value).toFloat()
    "D" -> toDouble(value)
    "I" -> toInt(value)
    "S" -> toInt(value).toShort()
    "B" -> toInt(value).toByte()
    "L" -> value["value"].string()!!.toLong()
    "BI" -> value["value"].string()!!.toBigInteger()
    else -> throw IllegalArgumentException("Unknown numeric type ${value["type"]}")
}

private fun toNumber(value: Number) = JsonObject(
    mutableMapOf(
        "op" to JsonString("number"),
        "type" to JsonString(toNumberType(value)),
        "value" to JsonString(value.toString())
    )
)
