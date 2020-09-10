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

    override fun <T> visit(expr: Expression.FieldExpression<T>) =
        if (expr.qualifier != null) {
            "${expr.qualifier.accept(this)}${if (expr.nullSafe) "?." else "."}${expr.field}"
        } else {
            expr.field
        }

    override fun <T> visit(expr: Expression.QueryParameterExpression<T>) =
        "?${expr.paramIdentifier}"

    override fun visit(expr: Expression.NumberLiteralExpression) = expr.value.toString()

    override fun visit(expr: Expression.TextLiteralExpression) = "\"${expr.value}\""

    override fun visit(expr: Expression.BooleanLiteralExpression) = expr.value.toString()

    override fun visit(expr: Expression.FromExpression): String =
        (expr.qualifier?.accept(this)?.plus("\n") ?: "") +
            "from ${expr.iterationVar} in ${expr.source.accept(this)}"

    override fun visit(expr: Expression.WhereExpression): String =
        expr.qualifier.accept(this) + "\nwhere " + expr.expr.accept(this)

    override fun visit(expr: Expression.LetExpression): String =
        expr.qualifier.accept(this) + "\n" +
        "let ${expr.variableName} = (${expr.variableExpr.accept(this)})"

    override fun <T> visit(expr: Expression.SelectExpression<T>): String =
        expr.qualifier.accept(this) + "\nselect " + expr.expr.accept(this) + "\n"

    override fun visit(expr: Expression.NewExpression): String =
        "new " + expr.schemaName.joinToString(" ") + expr.fields.joinToString(
            ",\n  ",
            " {\n  ",
            "\n}", transform = { (name, fieldExpr) ->
                "$name: " + fieldExpr.accept(this)
            }
        )

    override fun <T> visit(expr: Expression.FunctionExpression<T>): String =
        expr.function.name + expr.arguments.joinToString(
            ",\n  ",
            "(\n  ",
            "\n)", transform = { argExpr ->
                argExpr.accept(this)
            }
        )
}

/** Given an expression, return a string representation. */
fun <T> Expression<T>.stringify() = this.accept(ExpressionStringifier())
