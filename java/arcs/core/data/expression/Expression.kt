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

import arcs.core.util.BigInt
import arcs.core.util.toBigInt

/**
 * A DSL for expressions used by queries, refinements, and adapters. Instances can be constructed
 * directly, from protos or deserialization, and eventually, from a Kotlin implementation of
 * the Arcs Manifest Parser. A number of operator overloads exist to make hand construction
 * terse and ergonomic, see Builders.kt.
 *
 * @param T the resulting type of the expression.
 */
sealed class Expression<out T> {

  /**
   * Implementors denote sub-properties that may be looked up. This is not necessarily limited
   * to entities, but could also be used for coercions, e.g. 'numberField.integerPart'.
   */
  interface Scope {
    /** Used to construct new immutable scopes as children of the current [Scope]. */
    interface Builder {
      /** Set's the parameter to the given entry. */
      fun set(param: String, value: Any?): Builder

      /** builds a new [Scope] as a child of this [Scope] with entries collected via [set] */
      fun build(): Scope
    }

    /** The name of the scope, used for debugging and stringification */
    val scopeName: String

    /** Lookup an entry in a given scope. */
    fun <T> lookup(param: String): T

    /** Return a builder used to create a new immutable scope. */
    fun builder(subName: String? = null): Builder

    /** Return a new scope with the given entry. */
    fun set(param: String, value: Any?) = builder().set(param, value).build()

    /** Return a set of all property names in the scope. */
    fun properties(): Set<String>
  }

  /**
   * Visitor pattern for traversing expressions. Implementations of visitor are used for
   * evaluation, serialization, and type flow.
   * @param Result type returned from processing a visitation of an [Expression]
   * @param Context a user defined context for any evaluation or traversal
   */
  interface Visitor<Result, Context> {
    /** Called when [UnaryExpression] encountered. */
    fun <E, T> visit(expr: UnaryExpression<E, T>, ctx: Context): Result

    /** Called when [BinaryExpression] encountered. */
    fun <L, R, T> visit(expr: BinaryExpression<L, R, T>, ctx: Context): Result

    /** Called when [FieldExpression] encountered. */
    fun <T> visit(expr: FieldExpression<T>, ctx: Context): Result

    /** Called when [QueryParameterExpression] encountered. */
    fun <T> visit(expr: QueryParameterExpression<T>, ctx: Context): Result

    /** Called when [NumberLiteralExpression] encountered. */
    fun visit(expr: NumberLiteralExpression, ctx: Context): Result

    /** Called when [TextLiteralExpression] encountered. */
    fun visit(expr: TextLiteralExpression, ctx: Context): Result

    /** Called when [BooleanLiteralExpression] encountered. */
    fun visit(expr: BooleanLiteralExpression, ctx: Context): Result

    /** Called when [NullLiteralExpression] encountered. */
    fun visit(expr: NullLiteralExpression, ctx: Context): Result

    /** Called when [FromExpression] encountered. */
    fun visit(expr: FromExpression, ctx: Context): Result

    /** Called when [WhereExpression] encountered. */
    fun visit(expr: WhereExpression, ctx: Context): Result

    /** Called when [SelectExpression] encountered. */
    fun <T> visit(expr: SelectExpression<T>, ctx: Context): Result

    /** Called when [LetExpression] encountered. */
    fun visit(expr: LetExpression, ctx: Context): Result

    /** Called when [FunctionExpression] encountered. */
    fun <T> visit(expr: FunctionExpression<T>, ctx: Context): Result

    /** Called when [NewExpression] encountered. */
    fun visit(expr: NewExpression, ctx: Context): Result

    /** Called when [OrderByExpression] encountered. */
    fun <T> visit(expr: OrderByExpression<T>, ctx: Context): Result
  }

  /** Accepts a visitor and invokes the appropriate [Visitor.visit] method. */
  abstract fun <Result, Context> accept(visitor: Visitor<Result, Context>, ctx: Context): Result

  override fun toString() = this.stringify()

  /**
   * Type that represents all supported binary operations of the [BinaryExpression] node.
   * @param L the left side type of the binary op
   * @param R the right side type of the binary op
   * @param T the result of applying the binary op to [L] and [R]
   */
  sealed class BinaryOp<L, R, T> {
    /** Apply the binary operation to the left and right arguments. */
    abstract operator fun invoke(l: L, r: R): T
    abstract val token: String

    /** Boolean AND of two Boolean values. */
    object And : BinaryOp<Boolean, Boolean, Boolean>() {
      override operator fun invoke(l: Boolean, r: Boolean): Boolean = l && r
      override val token = "and"
    }

    /** Boolean OR of two Boolean values. */
    object Or : BinaryOp<Boolean, Boolean, Boolean>() {
      override operator fun invoke(l: Boolean, r: Boolean): Boolean = l || r
      override val token = "or"
    }

    /** Numeric 'less than' comparison of two numeric arguments, returning Boolean. */
    object LessThan : BinaryOp<Number, Number, Boolean>() {
      override operator fun invoke(l: Number, r: Number): Boolean = l < r
      override val token = "<"
    }

    /** Numeric 'greater than' comparison of two numeric arguments, returning Boolean. */
    object GreaterThan : BinaryOp<Number, Number, Boolean>() {
      override operator fun invoke(l: Number, r: Number): Boolean = l > r
      override val token = ">"
    }

    /** Numeric 'less than equals' comparison of two numeric arguments, returning Boolean. */
    object LessThanOrEquals : BinaryOp<Number, Number, Boolean>() {
      override operator fun invoke(l: Number, r: Number): Boolean = l <= r
      override val token = "<="
    }

    /** Numeric 'greater than equals' comparison of two numeric arguments, returning Boolean. */
    object GreaterThanOrEquals : BinaryOp<Number, Number, Boolean>() {
      override operator fun invoke(l: Number, r: Number): Boolean = l >= r
      override val token = ">="
    }

    /** Numeric addition (Double Precision). */
    object Add : BinaryOp<Number, Number, Number>() {
      override operator fun invoke(l: Number, r: Number): Number = l + r
      override val token = "+"
    }

    /** Numeric subtraction (Double Precision). */
    object Subtract : BinaryOp<Number, Number, Number>() {
      override operator fun invoke(l: Number, r: Number): Number = l - r
      override val token = "-"
    }

    /** Numeric multiplication (Double Precision). */
    object Multiply : BinaryOp<Number, Number, Number>() {
      override operator fun invoke(l: Number, r: Number): Number = l * r
      override val token = "*"
    }

    /** Numeric division (Double Precision). */
    object Divide : BinaryOp<Number, Number, Number>() {
      override operator fun invoke(l: Number, r: Number): Number = l / r
      override val token = "/"
    }

    /** Equality of two arguments (default equality operator) */
    object Equals : BinaryOp<Any?, Any?, Boolean>() {
      override operator fun invoke(l: Any?, r: Any?): Boolean = l == r
      override val token = "=="
    }

    /** Non-Equality of two arguments (default equality operator) */
    object NotEquals : BinaryOp<Any?, Any?, Boolean>() {
      override operator fun invoke(l: Any?, r: Any?): Boolean = l != r
      override val token = "!="
    }

    object IfNull : BinaryOp<Any?, Any?, Any?>() {
      override operator fun invoke(l: Any?, r: Any?): Any? = l ?: r
      override val token = "?:"
    }

    companion object {
      val allOps: List<BinaryOp<*, *, *>> by lazy {
        listOf(
          And,
          Or,
          Add,
          Subtract,
          Multiply,
          Divide,
          Equals,
          NotEquals,
          LessThan,
          LessThanOrEquals,
          GreaterThan,
          GreaterThanOrEquals,
          IfNull
        )
      }

      /** Given a [BinaryOp]'s string token, return the associated [BinaryOp] */
      fun fromToken(token: String): BinaryOp<*, *, *>? {
        return allOps.find {
          it.token == token
        }
      }
    }
  }

  /**
   * Type that represents all operations supported by [UnaryExpression].
   * @param E the type of the expression before invoking the op
   * @param T the resulting type of the expression after invoking the op
   */
  sealed class UnaryOp<E, T> {
    /** Apply the unary operation to the expression. */
    abstract operator fun invoke(expression: E): T
    abstract val token: String

    /** Boolean negation. */
    object Not : UnaryOp<Boolean, Boolean>() {
      override operator fun invoke(expression: Boolean): Boolean = !expression
      override val token = "not"
    }

    /** Numeric negation. */
    object Negate : UnaryOp<Number, Number>() {
      override operator fun invoke(expression: Number): Number = -expression
      override val token = "-"
    }

    companion object {
      /** Given a [UnaryOp]'s token, return the associated [UnaryOp] */
      fun fromToken(token: String): UnaryOp<*, *>? = when (token) {
        Not.token -> Not
        Negate.token -> Negate
        else -> null
      }
    }
  }

  /**
   * Represents a binary operation between two expressions.
   * @param L the type of the left side expression
   * @param R the type of the right side expression
   * @param T the resulting type of the expression
   */
  data class BinaryExpression<L, R, T>(
    val op: BinaryOp<L, R, T>,
    val left: Expression<L>,
    val right: Expression<R>
  ) : Expression<T>() {
    override fun <Result, Context> accept(visitor: Visitor<Result, Context>, ctx: Context) =
      visitor.visit(this, ctx)

    override fun toString() = this.stringify()
  }

  /**
   * Represents a unary operation on an expression.
   * @param E the type of the expression to apply the [UnaryOp] to
   * @param T the result type of the expression after applying the [UnaryOp]
   */
  data class UnaryExpression<E, T>(
    val op: UnaryOp<E, T>,
    val expr: Expression<E>
  ) : Expression<T>() {
    override fun <Result, Context> accept(visitor: Visitor<Result, Context>, ctx: Context) =
      visitor.visit(this, ctx)

    override fun toString() = this.stringify()
  }

  /**
   * Represents a lookup of a field on a [Scope] by [field] name.
   * [nullSafe] specifies if nulls should be propagated - signifying the '?.' operator.
   * @param T the type of the expression yielded by looking up the field
   */
  data class FieldExpression<T>(
    val qualifier: Expression<Scope?>?,
    val field: String,
    val nullSafe: Boolean
  ) : Expression<T>() {
    override fun <Result, Context> accept(visitor: Visitor<Result, Context>, ctx: Context) =
      visitor.visit(this, ctx)

    override fun toString() = this.stringify()
  }

  /**
   *  Represents a query parameter (supplied during execution) identified by [paramIdentifier].
   *  @param T the type of the resulting query parameter
   */
  data class QueryParameterExpression<T>(val paramIdentifier: String) : Expression<T>() {
    override fun <Result, Context> accept(visitor: Visitor<Result, Context>, ctx: Context) =
      visitor.visit(this, ctx)

    override fun toString() = this.stringify()
  }

  /**
   * Base class for all simple immutable values in an expression.
   * @param T the type of the literal value
   */
  abstract class LiteralExpression<T>(val value: T) : Expression<T>() {
    override fun equals(other: Any?): Boolean {
      if (this === other) return true
      if (other !is LiteralExpression<*>) return false

      if (value != other.value) return false

      return true
    }

    override fun hashCode(): Int {
      return value?.hashCode() ?: 0
    }
  }

  /** A reference to a literal [Number] value, e.g. 42.0 */
  class NumberLiteralExpression(number: Number) : LiteralExpression<Number>(number) {
    override fun <Result, Context> accept(visitor: Visitor<Result, Context>, ctx: Context) =
      visitor.visit(this, ctx)
  }

  /** A reference to a literal text value, e.g. "Hello" */
  class TextLiteralExpression(text: String) : LiteralExpression<String>(text) {
    override fun <Result, Context> accept(visitor: Visitor<Result, Context>, ctx: Context) =
      visitor.visit(this, ctx)
  }

  /** A reference to a literal boolean value, e.g. true/false */
  class BooleanLiteralExpression(boolean: Boolean) : LiteralExpression<Boolean>(boolean) {
    override fun <Result, Context> accept(visitor: Visitor<Result, Context>, ctx: Context) =
      visitor.visit(this, ctx)
  }

  /** A reference to a literal null */
  class NullLiteralExpression() : LiteralExpression<Any?>(null) {
    override fun <Result, Context> accept(visitor: Visitor<Result, Context>, ctx: Context) =
      visitor.visit(this, ctx)
  }

  /** Subtypes represent a [Expression]s that operate over the result of the [qualifier]. */
  interface QualifiedExpression {
    val qualifier: Expression<Sequence<Scope>>?
    fun withQualifier(qualifier: QualifiedExpression?): QualifiedExpression
  }

  /**
   * Represents an iteration over a [Sequence] in the current scope under the identifier [source],
   * placing each member of the sequence in a scope under [iterationVar] and returning
   * a new sequence.
   */
  data class FromExpression(
    override val qualifier: Expression<Sequence<Scope>>?,
    val source: Expression<Sequence<Any>>,
    val iterationVar: String
  ) : QualifiedExpression, Expression<Sequence<Scope>>() {
    override fun <Result, Context> accept(visitor: Visitor<Result, Context>, ctx: Context) =
      visitor.visit(this, ctx)

    @Suppress("UNCHECKED_CAST")
    override fun withQualifier(qualifier: QualifiedExpression?): QualifiedExpression =
      this.copy(qualifier = qualifier as? Expression<Sequence<Scope>>)

    override fun toString() = this.stringify()
  }

  /**
   * Represents a filter expression that returns true or false.
   */
  data class WhereExpression(
    override val qualifier: Expression<Sequence<Scope>>,
    val expr: Expression<Boolean>
  ) : QualifiedExpression, Expression<Sequence<Scope>>() {
    override fun <Result, Context> accept(visitor: Visitor<Result, Context>, ctx: Context) =
      visitor.visit(this, ctx)

    @Suppress("UNCHECKED_CAST")
    override fun withQualifier(qualifier: QualifiedExpression?): QualifiedExpression =
      qualifier?.let { this.copy(qualifier = qualifier as Expression<Sequence<Scope>>) }
        ?: this

    override fun toString() = this.stringify()
  }

  /**
   * Represents introducing a new identifier into the scope.
   */
  data class LetExpression(
    override val qualifier: Expression<Sequence<Scope>>,
    val variableExpr: Expression<*>,
    val variableName: String
  ) : QualifiedExpression, Expression<Sequence<Scope>>() {
    override fun <Result, Context> accept(visitor: Visitor<Result, Context>, ctx: Context) =
      visitor.visit(this, ctx)

    @Suppress("UNCHECKED_CAST")
    override fun withQualifier(qualifier: QualifiedExpression?): QualifiedExpression =
      qualifier?.let { this.copy(qualifier = qualifier as Expression<Sequence<Scope>>) }
        ?: this

    override fun toString() = this.stringify()
  }

  /**
   * Represents an expression that outputs a value.
   *
   * @param T the type of the new elements in the sequence
   */
  data class SelectExpression<T>(
    override val qualifier: Expression<Sequence<Scope>>,
    val expr: Expression<T>
  ) : QualifiedExpression, Expression<Sequence<T>>() {
    override fun <Result, Context> accept(visitor: Visitor<Result, Context>, ctx: Context) =
      visitor.visit(this, ctx)

    @Suppress("UNCHECKED_CAST")
    override fun withQualifier(qualifier: QualifiedExpression?): QualifiedExpression =
      qualifier?.let { this.copy(qualifier = qualifier as Expression<Sequence<Scope>>) }
        ?: this

    override fun toString() = this.stringify()
  }

  /**
   * Represents an expression that constructs a new value corresponding to the given
   * [schemaName] with a field for each declared (name, expression) in [fields].
   */
  data class NewExpression(
    val schemaName: Set<String>,
    val fields: List<Pair<String, Expression<*>>>
  ) : Expression<Scope>() {
    override fun <Result, Context> accept(visitor: Visitor<Result, Context>, ctx: Context) =
      visitor.visit(this, ctx)

    override fun toString() = this.stringify()
  }

  /**
   * Represents an expression that invokes a builtin function by name.
   *
   * @param T the type of the result of the [FunctionExpression]
   */
  data class FunctionExpression<T>(
    val function: GlobalFunction,
    val arguments: List<Expression<*>>
  ) : Expression<T>() {
    override fun <Result, Context> accept(visitor: Visitor<Result, Context>, ctx: Context) =
      visitor.visit(this, ctx)

    override fun toString() = this.stringify()
  }

  /**
   * Represents an expression that sorts a sequence to produce a new sequence. Note that this
   * operator can be expensive, and must traverse its qualifying sequence entirely.
   *
   * [selectors] is a non-empty list of expressions that return values to be used for ordering.
   */
  data class OrderByExpression<T>(
    override val qualifier: Expression<Sequence<Scope>>,
    val selectors: List<Selector>
  ) : QualifiedExpression, Expression<Sequence<T>>() {

    /** the orderby [expr] and a boolean whether it is a descending sort. */
    data class Selector(val expr: Expression<Any>, val descending: Boolean)

    init {
      require(!selectors.isEmpty()) {
        "OrderBy expressions must have at least 1 selector."
      }
    }

    override fun <Result, Context> accept(visitor: Visitor<Result, Context>, ctx: Context) =
      visitor.visit(this, ctx)

    override fun toString() = this.stringify()

    @Suppress("UNCHECKED_CAST")
    override fun withQualifier(qualifier: QualifiedExpression?): QualifiedExpression =
      qualifier?.let { this.copy(qualifier = qualifier as Expression<Sequence<Scope>>) }
        ?: this
  }
}

/**
 * Although this function looks weird, it exists to overcome a shortcoming in Kotlin's numeric
 * type hierarchy, namely that operator overloads don't exist on [Number], and [BigInt]
 * doesn't have them either. This function also widens types to the nearest compatible type
 * for the operation (e.g. Double, Long, Int, or BigInt) and then narrows the type afterwards.
 * Currently, Double + BigInt and Float + BigInt will not return the right answer,
 * unless * we either round the Double, or truncate the BigInt, at least until we perhaps
 * support [BigDecimal].
 * TODO: Write out own BigInt facade that is multiplatform and works on JS/JVM/WASM.
 */
private fun widenAndApply(
  l: Number,
  r: Number,
  floatBlock: (Double, Double) -> Number,
  longBlock: (Long, Long) -> Number,
  intBlock: (Int, Int) -> Number,
  bigBlock: (BigInt, BigInt) -> Number
): Number {
  if (l is Double || r is Double) return floatBlock(l.toDouble(), r.toDouble())
  if (l is Float || r is Float) return floatBlock(l.toDouble(), r.toDouble()).toFloat()
  if (l is BigInt || r is BigInt) return bigBlock(l.toBigInt(), r.toBigInt())
  if (l is Long || r is Long) return longBlock(l.toLong(), r.toLong())
  if (l is Int || r is Int) return intBlock(l.toInt(), r.toInt())
  if (l is Short || r is Short) return intBlock(l.toInt(), r.toInt()).toShort()
  if (l is Byte || r is Byte) return intBlock(l.toInt(), r.toInt()).toByte()
  throw IllegalArgumentException("Unable to widenType for ${l::class}, ${r::class}")
}

@Suppress("UNCHECKED_CAST")
private operator fun Number.compareTo(other: Number) = widenAndApply(
  this,
  other,
  { l, r -> l.compareTo(r) },
  { l, r -> l.compareTo(r) },
  { l, r -> l.compareTo(r) },
  { l, r -> l.compareTo(r) }
).toInt()

private operator fun Number.plus(other: Number): Number {
  return widenAndApply(this, other,
    { l, r -> l + r },
    { l, r -> l + r },
    { l, r -> l + r },
    { l, r -> l.add(r) }
  )
}

private operator fun Number.minus(other: Number): Number {
  return widenAndApply(this, other,
    { l, r -> l - r },
    { l, r -> l - r },
    { l, r -> l - r },
    { l, r -> l.subtract(r) }
  )
}

private operator fun Number.times(other: Number): Number {
  return widenAndApply(this, other,
    { l, r -> l * r },
    { l, r -> l * r },
    { l, r -> l * r },
    { l, r -> l.multiply(r) }
  )
}

private operator fun Number.div(other: Number): Number {
  return widenAndApply(this, other,
    { l, r -> l / r },
    { l, r -> l / r },
    { l, r -> l / r },
    { l, r -> l.divide(r) }
  )
}

operator fun Number.unaryMinus() = this * -1
