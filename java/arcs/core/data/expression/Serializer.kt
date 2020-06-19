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
import arcs.core.util.JsonValue.JsonBoolean
import arcs.core.util.JsonValue.JsonNumber
import arcs.core.util.JsonValue.JsonObject
import arcs.core.util.JsonValue.JsonString
import arcs.core.util.JsonVisitor
import arcs.core.util.ParseResult

/** Traverses a tree of [Expression] objects, serializing it into a JSON format. */
class ExpressionSerializer() :
    Expression.Visitor<JsonValue<*>> {

    override fun <E, T> visit(expr: UnaryExpression<E, T>) =
        JsonObject(
            mapOf(
                "type" to JsonString(expr.op.token),
                "expr" to expr.expr.accept(this)
            )
        )

    override fun <L, R, T> visit(expr: BinaryExpression<L, R, T>) =
        JsonObject(
            mapOf(
                "type" to JsonString(expr.op.token),
                "left" to expr.left.accept(this),
                "right" to expr.right.accept(this)
            )
        )

    override fun <E : Expression.Scope, T> visit(expr: Expression.FieldExpression<E, T>) =
        JsonObject(
            mapOf(
                "type" to JsonString("."),
                "qualifier" to expr.qualifier.accept(this),
                "field" to JsonString(expr.field)
            )
        )

    override fun <T> visit(expr: Expression.QueryParameterExpression<T>) =
        JsonObject(
            mapOf(
                "type" to JsonString("?"),
                "arg" to JsonString(expr.paramIdentifier)
            )
        )

    override fun visit(expr: Expression.NumberLiteralExpression) = JsonNumber(expr.value.toDouble())

    override fun visit(expr: Expression.TextLiteralExpression) = JsonString(expr.value)

    override fun visit(expr: Expression.BooleanLiteralExpression) = JsonBoolean(expr.value)

    override fun <T> visit(expr: Expression.ObjectLiteralExpression<T>) =
        throw IllegalArgumentException("Can't serialize an ObjectLiteralExpression")
}

/** Traverses a parsed [JsonValue] representation and returns decoded [Expression] */
class ExpressionDeserializer : JsonVisitor<Expression<*>> {
    override fun visit(value: JsonBoolean) = Expression.BooleanLiteralExpression(value.value)

    override fun visit(value: JsonString) = Expression.TextLiteralExpression(value.value)

    override fun visit(value: JsonNumber) = Expression.NumberLiteralExpression(value.value)

    override fun visit(value: JsonValue.JsonArray) =
        throw IllegalArgumentException("Arrays should not appear in JSON Serialized Expressions")

    override fun visit(value: JsonObject): Expression<*> {
        val type = value["type"].string()!!

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
            type == "?" -> Expression.QueryParameterExpression<Any>(value["arg"].string()!!)
            else -> throw IllegalArgumentException("Unknown type $type during deserialization")
        }
    }

    override fun visit(value: JsonValue.JsonNull) =
        throw IllegalArgumentException("Nulls should not appear in JSON serialized expressions")

}

/** Given an expression, return a string representation. */
fun <T> Expression<T>.serialize() = this.accept(ExpressionSerializer()).toString()

/** Given a serialized [Expression], deserialize it. */
fun String.deserializeExpression() = ExpressionDeserializer().visit(
    (Json.parse(this) as ParseResult.Success<JsonValue<*>>).value
)
