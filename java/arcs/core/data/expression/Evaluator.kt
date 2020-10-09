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

import arcs.core.data.expression.Expression.Scope
import arcs.core.util.PlatformTime
import arcs.core.util.Time

/**
 * Traverses a tree of [Expression] objects, evaluating each node, and returning a final
 * result. Note that types cannot be enforced statically, so it is possible for both
 * type cast errors and field or parameter errors to occur during evaluation. These will be
 * reflected as exceptions.
 */
class ExpressionEvaluator(
  val parameterScope: Scope = ParameterScope(),
  val scopeCreator: (String) -> Scope = { name -> MapScope<Any?>(name, mutableMapOf()) }
) : Expression.Visitor<Any?, Scope> {

  // TODO: allow this to be plumbed through via injection
  val time = object : Time() {
    override val nanoTime: Long
      get() = PlatformTime.nanoTime
    override val currentTimeMillis: Long
      get() = PlatformTime.currentTimeMillis
  }

  override fun <E, T> visit(expr: Expression.UnaryExpression<E, T>, ctx: Scope): Any? {
    return expr.op(expr.expr.accept(this, ctx) as E) as Any
  }

  override fun <L, R, T> visit(expr: Expression.BinaryExpression<L, R, T>, ctx: Scope): Any? {
    return expr.op(expr.left.accept(this, ctx) as L, expr.right.accept(this, ctx) as R)
  }

  override fun <T> visit(expr: Expression.FieldExpression<T>, ctx: Scope): Any? =
    (if (expr.qualifier == null) {
      ctx
    } else {
      expr.qualifier.accept(this, ctx) as Scope?
    }).apply {
      @Suppress("SENSELESS_COMPARISON") if (this == null && !expr.nullSafe) {
        throw IllegalArgumentException("Field '${expr.field}' not looked up on null scope")
      }
    }?.lookup(expr.field)

  override fun <E> visit(expr: Expression.QueryParameterExpression<E>, ctx: Scope): Any {
    return parameterScope.lookup(expr.paramIdentifier) as? Any
      ?: throw IllegalArgumentException(
        "Unbound parameter '${expr.paramIdentifier}'"
      )
  }

  override fun visit(expr: Expression.NumberLiteralExpression, ctx: Scope): Number = expr.value

  override fun visit(expr: Expression.TextLiteralExpression, ctx: Scope): String = expr.value

  override fun visit(expr: Expression.BooleanLiteralExpression, ctx: Scope): Boolean = expr.value

  override fun visit(expr: Expression.NullLiteralExpression, ctx: Scope): Any? = expr.value

  override fun visit(expr: Expression.FromExpression, ctx: Scope): Any {
    val qualSequence = expr.qualifier?.accept(this, ctx) as? Sequence<Scope> ?: sequenceOf(null)
    return qualSequence.flatMap { scope ->
      asSequence<Any>(expr.source.accept(this, scope ?: ctx)).map { it: Any? ->
        (scope ?: ctx).set(expr.iterationVar, it)
      }
    }
  }

  override fun visit(expr: Expression.WhereExpression, ctx: Scope): Any {
    return (expr.qualifier.accept(this, ctx) as Sequence<Scope>).filter {
      expr.expr.accept(this, it) == true
    }
  }

  override fun visit(expr: Expression.LetExpression, ctx: Scope): Any {
    return (expr.qualifier.accept(this, ctx) as Sequence<Scope>).map { scope ->
      scope.set(expr.variableName, expr.variableExpr.accept(this, scope))
    }
  }

  override fun <T> visit(expr: Expression.SelectExpression<T>, ctx: Scope): Any? {
    return (expr.qualifier.accept(this, ctx) as Sequence<Scope>).map {
      expr.expr.accept(this, it) as T
    }
  }

  override fun visit(expr: Expression.NewExpression, ctx: Scope): Any {
    val initScope = scopeCreator(expr.schemaName.firstOrNull() ?: "")
    return expr.fields.fold(initScope.builder()) { builder, (fieldName, fieldExpr) ->
      builder.set(fieldName, fieldExpr.accept(this, ctx))
    }.build()
  }

  override fun <T> visit(expr: Expression.FunctionExpression<T>, ctx: Scope): Any? {
    val arguments = expr.arguments.map { it.accept(this, ctx) }.toList()
    return expr.function.invoke(this, arguments)
  }

  private fun compareBy(selector: Expression.OrderByExpression.Selector): Comparator<Scope> {
    val comparator = { scope: Scope ->
      selector.expr.accept(this@ExpressionEvaluator, scope) as Comparable<Any>
    }

    return if (selector.descending) {
      compareByDescending(comparator)
    } else {
      compareBy(comparator)
    }
  }

  override fun <T> visit(expr: Expression.OrderByExpression<T>, ctx: Scope): Any {
    val nullComp: Comparator<Scope>? = null
    return (expr.qualifier.accept(this, ctx) as Sequence<Scope>).sortedWith(
      expr.selectors.fold(nullComp) { previous, selector ->
        previous?.then(compareBy(selector)) ?: compareBy(selector)
      } as Comparator<Scope>
    )
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
  else -> throw IllegalArgumentException(
    "Value '$value' cannot be converted to a sequence"
  )
}

/** Global functions are invoked by [FunctionExpression] during evaluation. */
sealed class GlobalFunction(val name: String) {

  /** Functions accept a varargs list of [Sequence] and return any type. */
  abstract fun invoke(evaluator: ExpressionEvaluator, args: List<Any?>): Any?
  abstract fun inferredType(evaluator: TypeEvaluator, args: List<InferredType>): InferredType

  object Now : GlobalFunction("now") {
    override fun invoke(evaluator: ExpressionEvaluator, args: List<Any?>) =
      evaluator.time.currentTimeMillis

    override fun inferredType(evaluator: TypeEvaluator, args: List<InferredType>) =
      InferredType.Primitive.LongType
  }

  /** Performs [Sequence.union] of two [Sequence]s. */
  object Union : GlobalFunction("union") {
    override fun invoke(evaluator: ExpressionEvaluator, args: List<Any?>) =
      toSequence<Any>(args[0]).asIterable().union(
        toSequence<Any>(args[1]).asIterable()
      ).asSequence()

    override fun inferredType(evaluator: TypeEvaluator, args: List<InferredType>) =
      InferredType.UnionType(args.toSet())
  }

  /** Find the maximum of a [Sequence]. */
  object Max : GlobalFunction("max") {
    override fun invoke(evaluator: ExpressionEvaluator, args: List<Any?>) =
      toSequence<Comparable<Comparable<*>>>(args[0]).max()

    override fun inferredType(evaluator: TypeEvaluator, args: List<InferredType>) =
      widen(*args.toTypedArray())
  }

  /** Find the minimum of a [Sequence]. */
  object Min : GlobalFunction("min") {
    override fun invoke(evaluator: ExpressionEvaluator, args: List<Any?>) =
      toSequence<Comparable<Comparable<*>>>(args[0]).min()

    override fun inferredType(evaluator: TypeEvaluator, args: List<InferredType>) =
      widen(*args.toTypedArray())
  }

  /** Find the average of a [Sequence]. */
  object Average : GlobalFunction("average") {
    override fun invoke(evaluator: ExpressionEvaluator, args: List<Any?>) =
      toSequence<Int>(args[0]).average()

    override fun inferredType(evaluator: TypeEvaluator, args: List<InferredType>) =
      InferredType.Primitive.DoubleType
  }

  /** Find the average of a [Sequence]. */
  object Sum : GlobalFunction("sum") {
    override fun invoke(evaluator: ExpressionEvaluator, args: List<Any?>) =
      toSequence<Int>(args[0]).sum()

    override fun inferredType(evaluator: TypeEvaluator, args: List<InferredType>) =
      widen(*args.toTypedArray())
  }

  /** Count the number of elements in a [Sequence]. */
  object Count : GlobalFunction("count") {
    override fun invoke(evaluator: ExpressionEvaluator, args: List<Any?>) =
      toSequence<Any>(args[0]).count()

    override fun inferredType(evaluator: TypeEvaluator, args: List<InferredType>) =
      InferredType.Primitive.IntType
  }

  /** Return the first item of a [Sequence]. */
  object First : GlobalFunction("first") {
    override fun invoke(evaluator: ExpressionEvaluator, args: List<Any?>) =
      toSequence<Any>(args[0]).firstOrNull()

    override fun inferredType(evaluator: TypeEvaluator, args: List<InferredType>) =
      InferredType.UnionType(
        InferredType.Primitive.NullType,
        when (val it = args[0]) {
          is InferredType.SeqType -> it.type
          else -> it
        }
      )
  }

  companion object {
    /** Lookup [GlobalFunction] by case-insensitive name. */
    fun of(functionName: String): GlobalFunction = requireNotNull(
      functions[functionName.toLowerCase()]
    ) {
      "Unknown function $functionName"
    }

    private val functions by lazy {
      listOf(
        Average,
        Union,
        Min,
        Max,
        Count,
        Sum,
        First,
        Now
      ).associateBy({ it.name }, { it })
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
  currentScope: Scope = mapOf<String, Any>().asScope(),
  vararg params: Pair<String, Any>
): T {
  val parameterScope = mapOf(*params)
  val evaluator = ExpressionEvaluator(parameterScope.asScope())
  return expression.accept(evaluator, currentScope) as T
}
