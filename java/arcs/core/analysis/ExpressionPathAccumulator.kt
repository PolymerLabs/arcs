package arcs.core.analysis

import arcs.core.data.AccessPath
import arcs.core.data.expression.Expression

/** A visitor that accumulates field [Paths] from a Paxel [Expression]. */
class ExpressionPathAccumulator : Expression.Visitor<Paths> {

    override fun <L, R, T> visit(expr: Expression.BinaryExpression<L, R, T>): Paths {
        return expr.left.accept(this) + expr.right.accept(this)
    }

    override fun <T> visit(expr: Expression.FieldExpression<T>): Paths {
        val qualifiedPaths = expr.qualifier?.accept(this)?.first() ?: emptyList()
        return listOf(qualifiedPaths + listOf(AccessPath.Selector.Field(expr.field)))
    }

    override fun visit(expr: Expression.NewExpression): Paths =
        expr.fields.flatMap { (_, expression) -> expression.accept(this) }

    override fun <E, T> visit(expr: Expression.UnaryExpression<E, T>): Paths {
        TODO("Not yet implemented")
    }

    override fun <T> visit(expr: Expression.QueryParameterExpression<T>): Paths {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.NumberLiteralExpression): Paths {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.TextLiteralExpression): Paths {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.BooleanLiteralExpression): Paths {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.NullLiteralExpression): Paths {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.FromExpression): Paths {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.WhereExpression): Paths {
        TODO("Not yet implemented")
    }

    override fun <T> visit(expr: Expression.SelectExpression<T>): Paths {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.LetExpression): Paths {
        TODO("Not yet implemented")
    }

    override fun <T> visit(expr: Expression.FunctionExpression<T>): Paths {
        TODO("Not yet implemented")
    }
}
