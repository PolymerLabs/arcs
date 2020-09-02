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

import arcs.core.util.PlatformTime
import arcs.core.util.Time

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

    // TODO: allow this to be plumbed through via injection
    val time = object : Time() {
        override val nanoTime: Long
            get() = PlatformTime.nanoTime
        override val currentTimeMillis: Long
            get() = PlatformTime.currentTimeMillis
    }

    override fun <E, T> visit(expr: Expression.UnaryExpression<E, T>): Any {
        return expr.op(expr.expr.accept(this) as E) as Any
    }

    override fun <L, R, T> visit(expr: Expression.BinaryExpression<L, R, T>): Any {
        return expr.op(expr.left.accept(this) as L, expr.right.accept(this) as R) as Any
    }

    override fun <T> visit(expr: Expression.FieldExpression<T>): Any =
        (expr.qualifier?.accept(this) as Expression.Scope? ?: currentScope)
            .lookup(expr.field) ?: throw IllegalArgumentException("Field '${expr.field}' not found")

    override fun <E> visit(expr: Expression.QueryParameterExpression<E>): Any {
        return parameterScope.lookup(expr.paramIdentifier) as? Any
            ?: throw IllegalArgumentException(
                "Unbound parameter '${expr.paramIdentifier}'"
            )
    }

    override fun visit(expr: Expression.NumberLiteralExpression): Number = expr.value

    override fun visit(expr: Expression.TextLiteralExpression): String = expr.value

    override fun visit(expr: Expression.BooleanLiteralExpression): Boolean = expr.value

    override fun visit(expr: Expression.FromExpression): Any {
        return (expr.qualifier?.accept(this) as Sequence<*>? ?: sequenceOf(null)).flatMap {
            asSequence<Any>(expr.source.accept(this)).map {
                currentScope.set(expr.iterationVar, it)
            }
        }
    }

    override fun visit(expr: Expression.WhereExpression): Any {
        return (expr.qualifier.accept(this) as Sequence<*>).filter {
            expr.expr.accept(this) == true
        }
    }

    override fun visit(expr: Expression.LetExpression): Any {
        return (expr.qualifier.accept(this) as Sequence<*>).map {
            currentScope.set(expr.variableName, expr.variableExpr.accept(this))
        }
    }

    override fun <T> visit(expr: Expression.SelectExpression<T>): Any {
        return (expr.qualifier.accept(this) as Sequence<*>).map {
            expr.expr.accept(this) as T
        }
    }

    override fun visit(expr: Expression.NewExpression): Any {
        val newScope = scopeCreator(expr.schemaName.firstOrNull() ?: "")
        expr.fields.forEach { (fieldName, fieldExpr) ->
            newScope.set(fieldName, fieldExpr.accept(this))
        }
        return newScope
    }

    override fun <T> visit(expr: Expression.FunctionExpression<T>): Any {
        val arguments = expr.arguments.map { it.accept(this) }.toList()
        return expr.function.invoke(this, arguments)
    }
}

/** Coerces anything, including nulls and single values, to a sequence */
private fun <T> toSequence(value: Any?) = when (value) {
    null -> emptySequence()
    is Sequence<*> -> value as Sequence<T>
    is Collection<*> -> value.asSequence() as Sequence<T>
    else -> sequenceOf(value as T)
}

/** Transforms or casts any kind of collection (or a sequence) to a sequence */
private fun <T> asSequence(value: Any?) = when (value) {
    is Sequence<*> -> value as Sequence<T>
    is Collection<*> -> value.asSequence() as Sequence<T>
    else -> throw java.lang.IllegalArgumentException(
        "Value '$value' cannot be converted to a sequence"
    )
}

/** Global functions are invoked by [FunctionExpression] during evaluation. */
sealed class GlobalFunction(val name: String) {

    /** Functions accept a varargs list of [Sequence] and return any type. */
    abstract fun invoke(evaluator: ExpressionEvaluator, args: List<Any>): Any

    object Now : GlobalFunction("now") {
        override fun invoke(evaluator: ExpressionEvaluator, args: List<Any>) =
            evaluator.time.currentTimeMillis
    }

    /** Performs [Sequence.union] of two [Sequence]s. */
    object Union : GlobalFunction("union") {
        override fun invoke(evaluator: ExpressionEvaluator, args: List<Any>) =
            toSequence<Any>(args[0]).asIterable().union(
                toSequence<Any>(args[1]).asIterable()
            ).asSequence()
    }

    /** Find the maximum of a [Sequence]. */
    object Max : GlobalFunction("max") {
        override fun invoke(evaluator: ExpressionEvaluator, args: List<Any>) =
            toSequence<Int>(args[0]).max()!!
    }

    /** Find the minimum of a [Sequence]. */
    object Min : GlobalFunction("min") {
        override fun invoke(evaluator: ExpressionEvaluator, args: List<Any>) =
            toSequence<Int>(args[0]).min()!!
    }

    /** Find the average of a [Sequence]. */
    object Average : GlobalFunction("average") {
        override fun invoke(evaluator: ExpressionEvaluator, args: List<Any>) =
            toSequence<Int>(args[0]).average()
    }

    /** Count the number of elements in a [Sequence]. */
    object Count : GlobalFunction("count") {
        override fun invoke(evaluator: ExpressionEvaluator, args: List<Any>) =
            toSequence<Any>(args[0]).count()
    }

    /** Return the first item of a [Sequence]. */
    object First : GlobalFunction("first") {
        override fun invoke(evaluator: ExpressionEvaluator, args: List<Any>) =
            toSequence<Int>(args[0]).first()
    }

    companion object {
        /** Lookup [GlobalFunction] by case-insensitive name. */
        fun of(functionName: String): GlobalFunction = requireNotNull(
            functions[functionName.toLowerCase()]
        ) {
            "Unknown function $functionName"
        }

        private val functions by lazy {
            listOf(Average, Union, Min, Max, Count, First, Now).associateBy({ it.name }, { it })
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
fun <T> evalExpression(
    expression: Expression<T>,
    currentScope: Expression.Scope = mapOf<String, Any>().asScope(),
    vararg params: Pair<String, Any>
): T {
    val parameterScope = mapOf(*params)
    val evaluator = ExpressionEvaluator(currentScope, parameterScope.asScope())
    return expression.accept(evaluator) as T
}
