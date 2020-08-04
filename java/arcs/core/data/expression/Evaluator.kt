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

/**
 * Traverses a tree of [Expression] objects, evaluating each node, and returning a final
 * result. Note that types cannot be enforced statically, so it is possible for both
 * type cast errors and field or parameter errors to occur during evaluation. These will be
 * reflected as exceptions.
 */
class ExpressionEvaluator(
    val currentScope: Expression.Scope = CurrentScope<Any>(),
    val parameterScope: Expression.Scope = ParameterScope(),
    val scopeCreator: (String) -> Expression.Scope = { name -> MapScope<Any>(name, mutableMapOf()) }
) : Expression.Visitor<Any> {
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

    override fun visit(expr: Expression.BooleanLiteralExpression): Boolean = expr.value

    override fun <T : Expression.Scope> visit(expr: Expression.CurrentScopeExpression<T>) =
        currentScope

    override fun <T> visit(expr: Expression.ObjectLiteralExpression<T>): Any = expr.value as Any

    override fun <E, T> visit(expr: Expression.FromExpression<E, T>): Any {
        var sequence = requireNotNull(currentScope.lookup<Any>(expr.source)) {
            "${expr.source} is null in current scope."
        }

        if (sequence is List<*>) {
            sequence = sequence.asSequence()
        }

        require(sequence is Sequence<*>) {
            "${expr.source} of type ${sequence::class} cannot be converted to a Sequence"
        }

        return sequence.map { value ->
            currentScope.set(expr.iterationVar, value as Any)
            value
        }
    }

    override fun <T> visit(expr: Expression.WhereExpression<T>): Any {
        return (expr.qualifier.accept(this) as Sequence<T>).filter {
            expr.expr.accept(this) == true
        }
    }

    override fun <E, T> visit(expr: Expression.SelectExpression<E, T>): Any {
        return (expr.qualifier.accept(this) as Sequence<E>).map {
            expr.expr.accept(this) as T
        }
    }

    override fun <T> visit(expr: Expression.NewExpression<T>): Any {
        val newScope = scopeCreator(expr.schemaName.firstOrNull() ?: "")
        expr.fields.forEach { (fieldName, fieldExpr) ->
            newScope.set(fieldName, fieldExpr.accept(this))
        }
        return newScope
    }

    override fun <T> visit(expr: Expression.FunctionExpression<T>): Any {
        val arguments = expr.arguments.map { it.accept(this) }.toList()
        return expr.function.invoke(arguments)
    }
}

private fun <T> toSequence(value: Any?) = when (value) {
    null -> emptySequence<T>()
    is Sequence<*> -> value as Sequence<T>
    is Collection<*> -> value.asSequence() as Sequence<T>
    else -> sequenceOf<T>(value as T)
}

/** Global functions are invoked by [FunctionExpression] during evaluation. */
sealed class GlobalFunction(val name: String) {

    /** Functions accept a varargs list of [Sequence] and return any type. */
    abstract fun invoke(args: List<Any>): Any

    /** Performs [Sequence.union] of two [Sequence]s. */
    object Union : GlobalFunction("union") {
        override fun invoke(args: List<Any>) =
            toSequence<Any>(args[0]).asIterable().union(
                toSequence<Any>(args[1]).asIterable()
            ).asSequence()
    }

    /** Find the maximum of a [Sequence]. */
    object Max : GlobalFunction("max") {
        override fun invoke(args: List<Any>) = toSequence<Int>(args[0] as List<Int>).max()!!
    }

    /** Find the minimum of a [Sequence]. */
    object Min : GlobalFunction("min") {
        override fun invoke(args: List<Any>) = toSequence<Int>(args[0] as List<Int>).min()!!
    }

    /** Find the average of a [Sequence]. */
    object Average : GlobalFunction("average") {
        override fun invoke(args: List<Any>) = toSequence<Int>(args[0] as List<Int>).average()
    }

    /** Count the number of elements in a [Sequence]. */
    object Count : GlobalFunction("count") {
        override fun invoke(args: List<Any>) = toSequence<Any>(args[0]).count()
    }

    /** Return the first item of a [Sequence]. */
    object First : GlobalFunction("first") {
        override fun invoke(args: List<Any>) = toSequence<Int>(args[0]).first()
    }

    companion object {
        /** Lookup [GlobalFunction] by case-insensitive name. */
        fun of(functionName: String): GlobalFunction = requireNotNull(
            functions[functionName.toLowerCase()]
        ) {
            "Unknown function $functionName"
        }

        private val functions by lazy {
            listOf(Average, Union, Min, Max, Count, First).associateBy({ it.name }, { it })
        }
    }
}

/**
 * Given an expression, and a list of parameter mappings, evaluate the expression and return
 * the result using an [ExpressionEvaluator].
 * @param expression the expression to be evaluated
 * @param currentScope a [Scope] object for lookups in [Expression.CurrentScopeExpression]
 * @param params mappings of query-args by name for [Expression.QueryParameterExpression]
 */
fun <T, R> evalExpression(
    expression: Expression<T>,
    currentScope: Expression.Scope = mapOf<String, Any>().asScope(),
    vararg params: Pair<String, Any>
): R {
    val parameterScope = mapOf(*params)
    val evaluator = ExpressionEvaluator(currentScope, parameterScope.asScope())
    return expression.accept(evaluator) as R
}
