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

/**
 * A DSL for expressions used by queries, refinements, and adapters. Instances can be constructed
 * directly, from protos or deserialization, and eventually, from a Kotlin implementation of
 * the Arcs Manifest Parser. A number of operator overloads exist to make hand construction
 * terse and ergonomic, see Builders.kt.
 */
sealed class Expression<T> {

    /**
     * Implementors denote sub-properties that may be looked up. This is not necessarily limited
     * to entities, but could also be used for coercions, e.g. 'numberField.integerPart'.
     */
    interface Scope {
        /** The name of the scope, used for debugging and stringification */
        val scopeName: String

        /** Lookup an entry in a given scope. */
        fun <T> lookup(param: String): T
    }

    /**
     * Visitor pattern for traversing expressions. Implementations of visitor are used for
     * evaluation, serialization, and type flow.
     * @param Result type returned from processing a visitation of an [Expression]
     */
    interface Visitor<Result> {
        /** Called when [UnaryExpression] encountered. */
        fun <E, T> visit(expr: UnaryExpression<E, T>): Result

        /** Called when [BinaryExpression] encountered. */
        fun <L, R, T> visit(expr: BinaryExpression<L, R, T>): Result

        /** Called when [FieldExpression] encountered. */
        fun <E : Scope, T> visit(expr: FieldExpression<E, T>): Result

        /** Called when [QueryParameterExpression] encountered. */
        fun <T> visit(expr: QueryParameterExpression<T>): Result

        /** Called when [NumberLiteralExpression] encountered. */
        fun visit(expr: NumberLiteralExpression): Result

        /** Called when [TextLiteralExpression] encountered. */
        fun visit(expr: TextLiteralExpression): Result

        /** Called when [BooleanLiteralExpresson] encountered. */
        fun visit(expr: BooleanLiteralExpresson): Result

        /** Called when [ObjectLiteralExpression] encountered. */
        fun <T> visit(expr: ObjectLiteralExpression<T>): Result
    }

    /** Accepts a visitor and invokes the appropriate [Visitor.visit] method. */
    abstract fun <Result> accept(visitor: Visitor<Result>): Result

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
            override val token = "&&"
        }

        /** Boolean OR of two Boolean values. */
        object Or : BinaryOp<Boolean, Boolean, Boolean>() {
            override operator fun invoke(l: Boolean, r: Boolean): Boolean = l || r
            override val token = "||"
        }

        /** Numeric 'less than' comparison of two numeric arguments, returning Boolean. */
        object LessThan : BinaryOp<Number, Number, Boolean>() {
            override operator fun invoke(l: Number, r: Number): Boolean =
                l.toDouble() < r.toDouble()
            override val token = "<"
        }

        /** Numeric 'greater than' comparison of two numeric arguments, returning Boolean. */
        object GreaterThan : BinaryOp<Number, Number, Boolean>() {
            override operator fun invoke(l: Number, r: Number): Boolean =
                l.toDouble() > r.toDouble()
            override val token = ">"
        }

        /** Numeric 'less than equals' comparison of two numeric arguments, returning Boolean. */
        object LessThanOrEquals : BinaryOp<Number, Number, Boolean>() {
            override operator fun invoke(l: Number, r: Number): Boolean =
                l.toDouble() <= r.toDouble()
            override val token = "<="
        }

        /** Numeric 'greater than equals' comparison of two numeric arguments, returning Boolean. */
        object GreaterThanOrEquals : BinaryOp<Number, Number, Boolean>() {
            override operator fun invoke(l: Number, r: Number): Boolean =
                l.toDouble() >= r.toDouble()
            override val token = ">="
        }

        /** Numeric addition (Double Precision). */
        object Add : BinaryOp<Number, Number, Number>() {
            override operator fun invoke(l: Number, r: Number): Number = l.toDouble() + r.toDouble()
            override val token = "+"
        }

        /** Numeric subtraction (Double Precision). */
        object Subtract : BinaryOp<Number, Number, Number>() {
            override operator fun invoke(l: Number, r: Number): Number = l.toDouble() - r.toDouble()
            override val token = "-"
        }

        /** Numeric multiplication (Double Precision). */
        object Multiply : BinaryOp<Number, Number, Number>() {
            override operator fun invoke(l: Number, r: Number): Number = l.toDouble() * r.toDouble()
            override val token = "*"
        }

        /** Numeric division (Double Precision). */
        object Divide : BinaryOp<Number, Number, Number>() {
            override operator fun invoke(l: Number, r: Number): Number = l.toDouble() / r.toDouble()
            override val token = "/"
        }

        /** Equality of two arguments (default equality operator) */
        object Equals : BinaryOp<Any, Any, Boolean>() {
            override operator fun invoke(l: Any, r: Any): Boolean = l == r
            override val token = "=="
        }

        /** Non-Equality of two arguments (default equality operator) */
        object NotEquals : BinaryOp<Any, Any, Boolean>() {
            override operator fun invoke(l: Any, r: Any): Boolean = l != r
            override val token = "!="
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
            override val token = "!"
        }

        /** Numeric negation. */
        object Negate : UnaryOp<Number, Number>() {
            override operator fun invoke(expression: Number): Number = -expression.toDouble()
            override val token = "-"
        }
    }

    /**
     * Represents a binary operation between two expressions.
     * @param L the type of the left side expression
     * @param R the type of the right side expression
     * @param T the resulting type of the expression
     */
    class BinaryExpression<L, R, T>(
        val op: BinaryOp<L, R, T>,
        val left: Expression<L>,
        val right: Expression<R>
    ) : Expression<T>() {
        override fun <Result> accept(visitor: Visitor<Result>) = visitor.visit(this)
    }

    /**
     * Represents a unary operation on an expression.
     * @param E the type of the expression to apply the [UnaryOp] to
     * @param T the result type of the expression after applying the [UnaryOp]
     */
    class UnaryExpression<E, T>(val op: UnaryOp<E, T>, val expr: Expression<E>) : Expression<T>() {
        override fun <Result> accept(visitor: Visitor<Result>) = visitor.visit(this)
    }

    /**
     * Represents a lookup of a field on a [Scope] by [field] name.
     * @param E the type of the qualifying expression
     * @param T the type of the expression yielded by looking up the field
     */
    class FieldExpression<E : Scope, T>(val qualifier: Expression<E>, val field: String) :
        Expression<T>() {
        override fun <Result> accept(visitor: Visitor<Result>) = visitor.visit(this)
    }

    /**
     *  Represents a query parameter (supplied during execution) identified by [paramIdentifier].
     *  @param T the type of the resulting query parameter
     */
    class QueryParameterExpression<T>(val paramIdentifier: String) : Expression<T>() {
        override fun <Result> accept(visitor: Visitor<Result>) = visitor.visit(this)
    }

    /**
     * Base class for all simple immutable values in an expression.
     * @param T the type of the literal value
     */
    abstract class LiteralExpression<T>(val value: T) : Expression<T>()

    /**
     * A reference to an object (typically implementing [Scope].
     * @param T the type of the object held by the [LiteralExpression]
     */
    class ObjectLiteralExpression<T>(value: T) : LiteralExpression<T>(value) {
        override fun <Result> accept(visitor: Visitor<Result>) = visitor.visit(this)
    }

    /** A reference to a literal [Number] value, e.g. 42.0 */
    class NumberLiteralExpression(double: Number) : LiteralExpression<Number>(double) {
        override fun <Result> accept(visitor: Visitor<Result>) = visitor.visit(this)
    }

    /** A reference to a literal text value, e.g. "Hello" */
    class TextLiteralExpression(text: String) : LiteralExpression<String>(text) {
        override fun <Result> accept(visitor: Visitor<Result>) = visitor.visit(this)
    }

    /** A reference to a literal boolean value, e.g. true/false */
    class BooleanLiteralExpresson(boolean: Boolean) : LiteralExpression<Boolean>(boolean) {
        override fun <Result> accept(visitor: Visitor<Result>) = visitor.visit(this)
    }
}
