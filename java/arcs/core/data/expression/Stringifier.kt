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
    Expression.Visitor<String, Unit> {
    /*
     * TODO: implement a precedence visitor to optimize parenthesis removal
     * If a parent expression has higher precedence than a child node, you don't need to emit
     * parens. e.g. let multiply/div = precedence 2, add/sub = precedence 1, then the
     * tree (* (+ 1 2) 3) representing 3 * (1 + 2) needs parens because precedence * > precedence +
     */
    private fun <E> maybeParen(expr: Expression<E>) = when (expr) {
        !is Expression.BinaryExpression<*, *, *> -> expr.accept(this, Unit)
        else -> "(" + expr.accept(this, Unit) + ")"
    }

    override fun <E, T> visit(expr: Expression.UnaryExpression<E, T>, ctx: Unit) =
        expr.op.token + expr.expr.accept(this, ctx)

    override fun <L, R, T> visit(expr: Expression.BinaryExpression<L, R, T>, ctx: Unit) =
        maybeParen(expr.left) + " ${expr.op.token} " + maybeParen(expr.right)

    override fun <T> visit(expr: Expression.FieldExpression<T>, ctx: Unit) =
        if (expr.qualifier != null) {
            "${expr.qualifier.accept(this, ctx)}${if (expr.nullSafe) "?." else "."}${expr.field}"
        } else {
            expr.field
        }

    override fun <T> visit(expr: Expression.QueryParameterExpression<T>, ctx: Unit) =
        "?${expr.paramIdentifier}"

    override fun visit(expr: Expression.NumberLiteralExpression, ctx: Unit) = expr.value.toString()

    override fun visit(expr: Expression.TextLiteralExpression, ctx: Unit) = "\"${expr.value}\""

    override fun visit(expr: Expression.BooleanLiteralExpression, ctx: Unit) = expr.value.toString()

    override fun visit(expr: Expression.NullLiteralExpression, ctx: Unit) = "null"

    override fun visit(expr: Expression.FromExpression, ctx: Unit): String =
        (expr.qualifier?.accept(this, ctx)?.plus("\n") ?: "") +
            "from ${expr.iterationVar} in ${expr.source.accept(this, ctx)}"

    override fun visit(expr: Expression.WhereExpression, ctx: Unit): String =
        expr.qualifier.accept(this, ctx) + "\nwhere " + expr.expr.accept(this, ctx)

    override fun visit(expr: Expression.LetExpression, ctx: Unit): String =
        expr.qualifier.accept(this, ctx) + "\n" +
        "let ${expr.variableName} = (${expr.variableExpr.accept(this, ctx)})"

    override fun <T> visit(expr: Expression.SelectExpression<T>, ctx: Unit): String =
        expr.qualifier.accept(this, ctx) + "\nselect " + expr.expr.accept(this, ctx) + "\n"

    override fun visit(expr: Expression.NewExpression, ctx: Unit): String =
        "new " + expr.schemaName.joinToString(" ") + expr.fields.joinToString(
            ",\n  ",
            " {\n  ",
            "\n}", transform = { (name, fieldExpr) ->
                "$name: " + fieldExpr.accept(this, ctx)
            }
        )

    override fun <T> visit(expr: Expression.FunctionExpression<T>, ctx: Unit): String =
        expr.function.name + expr.arguments.joinToString(
            ",\n  ",
            "(\n  ",
            "\n)", transform = { argExpr ->
                argExpr.accept(this, ctx)
            }
        )

    override fun <T> visit(expr: Expression.OrderByExpression<T>, ctx: Unit): String =
        expr.qualifier.accept(this, ctx) + "\norderby " + expr.selectors.joinToString(
            separator = ", "
        ) { sel ->
            sel.expr.accept(this, ctx) + (if (sel.descending) { " descending" } else { "" })
        } + "\n"
}

/** Given an expression, return a string representation. */
fun <T> Expression<T>.stringify() = this.accept(ExpressionStringifier(), Unit)
