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
package arcs.core.data.expression

/** Traverses a tree of [Expression] objects, converting each node to manifest format (String). */
class ExpressionStringifier(val parameterScope: Expression.Scope = ParameterScope()) :
    Expression.Visitor<String> {
    /*
     * TODO: implement a precedence visitor to optimize parenthesis removal
     * If a parent expression has higher precedence than a child node, you don't need to emit
     * parens. e.g. let multiply/div = precedence 2, add/sub = precedence 1, then the
     * tree (* (+ 1 2) 3) representing 3 * (1 + 2) needs parens because precedence * > precedence +
     */
    private fun <E> maybeParen(expr: Expression<E>) = when (expr) {
        !is Expression.BinaryExpression<*, *, *> -> expr.accept(this)
        else -> "(" + expr.accept(this) + ")"
    }

    override fun <E, T> visit(expr: Expression.UnaryExpression<E, T>) =
        expr.op.token + expr.expr.accept(this)

    override fun <L, R, T> visit(expr: Expression.BinaryExpression<L, R, T>) =
        maybeParen(expr.left) + " ${expr.op.token} " + maybeParen(expr.right)

    override fun <E : Expression.Scope, T> visit(expr: Expression.FieldExpression<E, T>) =
        expr.qualifier.accept(this) + ".${expr.field}"

    override fun <T> visit(expr: Expression.QueryParameterExpression<T>) =
        "?${expr.paramIdentifier}"

    override fun visit(expr: Expression.NumberLiteralExpression) = expr.value.toString()

    override fun visit(expr: Expression.TextLiteralExpression) = "\"${expr.value}\""

    override fun visit(expr: Expression.BooleanLiteralExpression) = expr.value.toString()

    override fun <T> visit(expr: Expression.ObjectLiteralExpression<T>) =
        (expr.value as? Expression.Scope)?.scopeName ?: "<object>"
}

/** Given an expression, return a string representation. */
fun <T> Expression<T>.stringify() = this.accept(ExpressionStringifier())

