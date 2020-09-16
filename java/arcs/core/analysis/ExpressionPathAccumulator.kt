package arcs.core.analysis

import arcs.core.data.AccessPath
import arcs.core.data.expression.Expression

/** A visitor that accumulates field [Paths] from a Paxel [Expression]. */
class ExpressionPathAccumulator : Expression.Visitor<Paths, Unit> {

    fun <L, R, T> visit(expr: Expression.BinaryExpression<L, R, T>): Paths {
        return expr.left.accept(this, Unit) + expr.right.accept(this, Unit)
    }

    fun <T> visit(expr: Expression.FieldExpression<T>): Paths {
        val qualifiedPaths = expr.qualifier?.accept(this, Unit)?.first() ?: emptyList()
        return listOf(qualifiedPaths + listOf(AccessPath.Selector.Field(expr.field)))
    }

    fun visit(expr: Expression.NewExpression): Paths =
        expr.fields.flatMap { (_, expression) -> expression.accept(this, Unit) }

    override fun <E, T> visit(expr: Expression.UnaryExpression<E, T>, ctx: Unit): Paths {
        TODO("Not yet implemented")
    }

    override fun <L, R, T> visit(expr: Expression.BinaryExpression<L, R, T>, ctx: Unit): Paths {
        TODO("Not yet implemented")
    }

    override fun <T> visit(expr: Expression.FieldExpression<T>, ctx: Unit): Paths {
        TODO("Not yet implemented")
    }

    override fun <T> visit(expr: Expression.QueryParameterExpression<T>, ctx: Unit): Paths {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.NumberLiteralExpression, ctx: Unit): Paths {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.TextLiteralExpression, ctx: Unit): Paths {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.BooleanLiteralExpression, ctx: Unit): Paths {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.NullLiteralExpression, ctx: Unit): Paths {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.FromExpression, ctx: Unit): Paths {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.WhereExpression, ctx: Unit): Paths {
        TODO("Not yet implemented")
    }

    override fun <T> visit(expr: Expression.SelectExpression<T>, ctx: Unit): Paths {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.LetExpression, ctx: Unit): Paths {
        TODO("Not yet implemented")
    }

    override fun <T> visit(expr: Expression.FunctionExpression<T>, ctx: Unit): Paths {
        TODO("Not yet implemented")
    }

    override fun visit(expr: Expression.NewExpression, ctx: Unit): Paths {
        TODO("Not yet implemented")
    }

    override fun <T> visit(expr: Expression.OrderByExpression<T>, ctx: Unit): Paths {
        TODO("Not yet implemented")
    }

}
