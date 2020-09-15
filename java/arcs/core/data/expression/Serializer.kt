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
import arcs.core.data.expression.Expression.Scope
import arcs.core.data.expression.Expression.UnaryExpression
import arcs.core.data.expression.Expression.UnaryOp
import arcs.core.util.BigInt
import arcs.core.util.Json
import arcs.core.util.JsonValue
import arcs.core.util.JsonValue.JsonArray
import arcs.core.util.JsonValue.JsonBoolean
import arcs.core.util.JsonValue.JsonNull
import arcs.core.util.JsonValue.JsonNumber
import arcs.core.util.JsonValue.JsonObject
import arcs.core.util.JsonValue.JsonString
import arcs.core.util.JsonVisitor
import arcs.core.util.toBigInt

/** Traverses a tree of [Expression] objects, serializing it into a JSON format. */
class ExpressionSerializer() : Expression.Visitor<JsonValue<*>, Unit> {

    override fun <E, T> visit(expr: UnaryExpression<E, T>, ctx: Unit) =
        JsonObject(
            mapOf(
                "op" to JsonString(expr.op.token),
                "expr" to expr.expr.accept(this, ctx)
            )
        )

    override fun <L, R, T> visit(expr: BinaryExpression<L, R, T>, ctx: Unit) =
        JsonObject(
            mapOf(
                "op" to JsonString(expr.op.token),
                "left" to expr.left.accept(this, ctx),
                "right" to expr.right.accept(this, ctx)
            )
        )

    override fun <T> visit(expr: Expression.FieldExpression<T>, ctx: Unit) =
        JsonObject(
            mapOf(
                "op" to JsonString("."),
                "qualifier" to (expr.qualifier?.accept(this, ctx) ?: JsonNull),
                "field" to JsonString(expr.field),
                "nullSafe" to JsonBoolean(expr.nullSafe)
            )
        )

    override fun <T> visit(expr: Expression.QueryParameterExpression<T>, ctx: Unit) =
        JsonObject(
            mapOf(
                "op" to JsonString("?"),
                "identifier" to JsonString(expr.paramIdentifier)
            )
        )

    override fun visit(expr: Expression.NumberLiteralExpression, ctx: Unit) = toNumber(expr.value)

    override fun visit(expr: Expression.TextLiteralExpression, ctx: Unit) = JsonString(expr.value)

    override fun visit(expr: Expression.BooleanLiteralExpression, ctx: Unit) =
        JsonBoolean(expr.value)

    override fun visit(expr: Expression.NullLiteralExpression, ctx: Unit) = JsonNull

    override fun visit(expr: Expression.FromExpression, ctx: Unit) =
        JsonObject(
            mapOf(
                "op" to JsonString("from"),
                "source" to expr.source.accept(this, ctx),
                "var" to JsonString(expr.iterationVar),
                "qualifier" to (expr.qualifier?.accept(this, ctx) ?: JsonNull)
            )
        )

    override fun visit(expr: Expression.WhereExpression, ctx: Unit) =
        JsonObject(
            mapOf(
                "op" to JsonString("where"),
                "expr" to expr.expr.accept(this, ctx),
                "qualifier" to expr.qualifier.accept(this, ctx)
            )
        )

    override fun visit(expr: Expression.LetExpression, ctx: Unit) =
        JsonObject(
            mapOf(
                "op" to JsonString("let"),
                "expr" to expr.variableExpr.accept(this, ctx),
                "var" to JsonString(expr.variableName),
                "qualifier" to (expr.qualifier.accept(this, ctx))
            )
        )

    override fun <T> visit(expr: Expression.SelectExpression<T>, ctx: Unit) =
        JsonObject(
            mapOf(
                "op" to JsonString("select"),
                "expr" to expr.expr.accept(this, ctx),
                "qualifier" to expr.qualifier.accept(this, ctx)
            )
        )

    override fun visit(expr: Expression.NewExpression, ctx: Unit) =
        JsonObject(
            mapOf(
                "op" to JsonString("new"),
                "schemaName" to JsonArray(expr.schemaName.map { JsonString(it) }),
                "fields" to JsonObject(
                    expr.fields.associateBy({ it.first }, { it.second.accept(this, ctx) })
                )
            )
        )

    override fun <T> visit(expr: Expression.FunctionExpression<T>, ctx: Unit) =
        JsonObject(
            mapOf(
                "op" to JsonString("function"),
                "functionName" to JsonString(expr.function.name),
                "arguments" to JsonArray(
                    expr.arguments.map { it.accept(this, ctx) })
                )
            )

    override fun <T> visit(expr: Expression.OrderByExpression<T>, ctx: Unit) =
        JsonObject(
            mapOf(
                "op" to JsonString("orderBy"),
                "selectors" to JsonArray(expr.selectors.map { sel ->
                    JsonArray(listOf(sel.expr.accept(this, ctx), JsonBoolean(sel.descending))) }
                ),
                "qualifier" to expr.qualifier.accept(this, ctx)
            )
        )
}

/** Traverses a parsed [JsonValue] representation and returns decoded [Expression] */
class ExpressionDeserializer : JsonVisitor<Expression<*>> {
    override fun visit(value: JsonBoolean) = Expression.BooleanLiteralExpression(value.value)

    override fun visit(value: JsonString) = Expression.TextLiteralExpression(value.value)

    override fun visit(value: JsonNumber) = Expression.NumberLiteralExpression(value.value)

    override fun visit(value: JsonNull) = Expression.NullLiteralExpression()

    override fun visit(value: JsonArray) =
        throw IllegalArgumentException("Arrays should not appear in JSON Serialized Expressions")

    override fun visit(value: JsonObject): Expression<*> {
        val type = value["op"].string()!!

        return when {
            type == "." -> Expression.FieldExpression<Any>(
                if (value["qualifier"] == JsonNull) {
                    null
                } else {
                    visit(value["qualifier"]) as Expression<Scope>
                },
                value["field"].string()!!,
                value["nullSafe"].bool()!!
            )
            BinaryOp.fromToken(type) != null -> {
                BinaryExpression(
                    BinaryOp.fromToken(type) as BinaryOp<Any, Any, Any>,
                    visit(value["left"]) as Expression<Any>,
                    visit(value["right"]) as Expression<Any>
                )
            }
            UnaryOp.fromToken(type) != null -> {
                UnaryExpression(
                    UnaryOp.fromToken(type)!! as UnaryOp<Any, Any>,
                    visit(value["expr"]) as Expression<Any>
                )
            }
            type == "number" -> Expression.NumberLiteralExpression(fromNumber(value))
            type == "?" -> Expression.QueryParameterExpression<Any>(value["identifier"].string()!!)
            type == "from" ->
                Expression.FromExpression(
                    if (value["qualifier"] == JsonNull) {
                        null
                    } else {
                        visit(value["qualifier"].obj()!!) as Expression<Sequence<Scope>>
                    },
                    visit(value["source"].obj()!!) as Expression<Sequence<Any>>,
                    value["var"].string()!!
                )
            type == "where" ->
                Expression.WhereExpression(
                    visit(value["qualifier"].obj()!!) as Expression<Sequence<Scope>>,
                    visit(value["expr"]) as Expression<Boolean>
                )
            type == "let" ->
                Expression.LetExpression(
                    visit(value["qualifier"].obj()!!) as Expression<Sequence<Scope>>,
                    visit(value["expr"]) as Expression<Any>,
                    value["var"].string()!!
                )
            type == "select" ->
                Expression.SelectExpression(
                    visit(value["qualifier"].obj()!!) as Expression<Sequence<Scope>>,
                    visit(value["expr"]) as Expression<Sequence<Any>>
                )
            type == "new" ->
                Expression.NewExpression(
                    value["schemaName"].array()!!.value.map { it.string()!! }.toSet(),
                    value["fields"].obj()!!.value.map { (name, expr) ->
                        name to visit(expr)
                    }.toList()
                )
            type == "function" ->
                Expression.FunctionExpression<Any>(
                    GlobalFunction.of(value["functionName"].string()!!),
                    value["arguments"].array()!!.value.map { visit(it) }.toList()
                )
            type == "orderBy" ->
                Expression.OrderByExpression<Any>(
                    visit(value["qualifier"].obj()!!) as Expression<Sequence<Scope>>,
                    value["selectors"].array()!!.value.map {
                        val array = it as JsonArray
                        Expression.OrderByExpression.Selector(
                            visit(array[0]) as Expression<Any>,
                            it[1].bool()!!
                        )
                    }.toList()
                )
            else -> throw IllegalArgumentException("Unknown type $type during deserialization")
        }
    }
}

/** Given an expression, return a string representation. */
fun <T> Expression<T>.serialize() = this.accept(ExpressionSerializer(), Unit).toString()

/** Given a serialized [Expression], deserialize it. */
fun String.deserializeExpression() = ExpressionDeserializer().visit(Json.parse(this))

private fun toNumberType(value: Number) = when (value) {
    is Float -> "F"
    is Int -> "I"
    is Short -> "S"
    is Double -> "D"
    is BigInt -> "BI"
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
    "BI" -> value["value"].string()!!.toBigInt()
    else -> throw IllegalArgumentException("Unknown numeric type ${value["type"]}")
}

private fun toNumber(value: Number) = JsonObject(
    mutableMapOf(
        "op" to JsonString("number"),
        "type" to JsonString(toNumberType(value)),
        "value" to JsonString(value.toString())
    )
)
