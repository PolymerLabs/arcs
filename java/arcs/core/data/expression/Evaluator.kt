@file:Suppress("UNCHECKED_CAST")

package arcs.core.data.expression

/**
 * Traverses a tree of [Expression] objects, evaluating each node, and returning a final
 * result. Note that types cannot be enforced statically, so it is possible for both
 * type cast errors and field or parameter errors to occur during evaluation. These will be
 * reflected as exceptions.
 */
class ExpressionEvaluator(val parameterScope: Expression.Scope = ParameterScope()) :
    Expression.Visitor<Any> {
    override fun <E, T> visit(expr: Expression.UnaryExpression<E, T>): Any {
        return expr.op(expr.expr.accept(this) as E) as Any
    }

    override fun <L, R, T> visit(expr: Expression.BinaryExpression<L, R, T>): Any {
        return expr.op(expr.left.accept(this) as L, expr.right.accept(this) as R) as Any
    }

    override fun <E : Expression.Scope, T> visit(expr: Expression.FieldExpression<E, T>): Any =
        (expr.qualifier.accept(this) as E).lookup(expr.field) ?: throw IllegalArgumentException(
            "Field ${expr.field} not found"
        )

    override fun <E> visit(expr: Expression.QueryParameterExpression<E>): Any {
        return parameterScope.lookup(expr.paramIdentifier) as? Any
            ?: throw IllegalArgumentException(
                "Unbound parameter ${expr.paramIdentifier}"
            )
    }

    override fun visit(expr: Expression.NumberLiteralExpression): Number = expr.value

    override fun visit(expr: Expression.TextLiteralExpression): String = expr.value

    override fun visit(expr: Expression.BooleanLiteralExpresson): Boolean = expr.value

    override fun <T> visit(expr: Expression.ObjectLiteralExpression<T>): Any = expr.value as Any
}

/**
 * Given an expression, and a list of parameter mappings, evaluate the expression and return
 * the result using an [ExpressionEvaluator].
 */
fun <T, R> evalExpression(expression: Expression<T>, vararg params: Pair<String, Any>): R {
    val parameterScope = mapOf(*params)
    val evaluator = ExpressionEvaluator(parameterScope.asScope())
    return expression.accept(evaluator) as R
}
