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
 *
 * Non-primitive [Sequence] expressions are wrapped arguments are return values in another
 * [Sequence] because Kotlin lacks a Maybe/Option monad. Expressions are chained together via
 * composition, and arguments are passed between composed functions using an explicit stack.
 * Composition happens by [flatMap] semantics, so an [emptySequence] terminates the output of the
 * expression and it will not make it into the final result.
 *
 * As an example in ```FROM p in x WHERE p < 5 SELECT p```, [WhereExpression] returns
 * [emptySequence] for false conditions, thus `SELECT` isn't executed, and the output is
 * suppressed.
 */
class ExpressionEvaluator(
    val currentScope: Expression.Scope = CurrentScope<Any>(),
    val parameterScope: Expression.Scope = ParameterScope(),
    val scopeCreator: (String) -> Expression.Scope = { name -> MapScope<Any>(name, mutableMapOf()) }
) : Expression.Visitor<Any> {
    // Hold arguments to be passed to next "function" (e.g. SELECT, WHERE, NEW, etc)
    private val callStack = mutableListOf<Sequence<Any>>()

    // Push argument
    private fun push(value: Sequence<Any>) {
        callStack.add(value)
    }

    // Pop Argument
    @OptIn(ExperimentalStdlibApi::class)
    private fun pop(): Sequence<Any> = callStack.removeLast()

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

    override fun <T, R> visit(expr: Expression.FromExpression<T, R>): Any {
        var sequence = requireNotNull(currentScope.lookup<Any>(expr.source)) {
            "${expr.source} is null in current scope."
        }

        if (sequence is List<*>) {
           sequence = sequence.asSequence()
        }

        require(sequence is Sequence<*>) {
            "${expr.source} of type ${sequence::class} cannot be converted to a Sequence"
        }

        return sequence.flatMap { value ->
            currentScope.set(expr.iterationVar, value as Any)
            push(sequenceOf(value))
            expr.iterationExpr.accept(this) as Sequence<T>
        }
    }

    override fun <T, R> visit(expr: Expression.ComposeExpression<T, R>): Any {
        return when (val result = expr.leftExpr.accept(this)) {
            emptySequence<Any>() -> emptySequence<Any>()
            else -> {
                push(result as Sequence<Any>)
                expr.rightExpr.accept(this)
            }
        }
    }

    override fun <T> visit(expr: Expression.WhereExpression<T>): Any {
        val current = pop()
        if (expr.expr.accept(this) == true) {
            return current
        }
        return emptySequence<T>()
    }

    override fun <T> visit(expr: Expression.SelectExpression<T>): Any {
        return expr.expr.accept(this)
    }

    override fun <T> visit(expr: Expression.NewExpression<T>): Any {
        pop()
        val newScope = scopeCreator(expr.schemaName.firstOrNull() ?: "")
        expr.fields.forEach { (fieldName, fieldExpr) ->
            newScope.set(fieldName, fieldExpr.accept(this))
        }
        return sequenceOf(newScope)
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
