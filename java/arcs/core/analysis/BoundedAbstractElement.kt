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

package arcs.core.analysis

/**
 * A class that lifts any type [V] with a special bottom and top value.
 *
 * This class may be used to represent the elements of a lattice when implementing the
 * [AbstractValue] interface. Specifically, it provides helpers for various methods in the
 * [AbstractValue] interface that have well-known semantics with respect to bottom (the smallest
 * value) and top (the largest value) in the lattice. For example, `bottom.isLessThan(other)`
 * is always true for any value of `other` because `bottom` is the lowest value in the lattice.
 *
 * Here is a sample use of this class for implementing an abstract domain of integer elements,
 * where the elements are ordered by [Int]'s `<=` operator.
 * ```
 * class IntegerDomain(
 *     val abstractInt: BoundedAbstractElement<Int>
 * ) : AbstractValue<IntegerDomain> {
 *     override infix fun isLessThanEqual(other: IntegerDomain): Boolean {
 *         return abstractInt.isLessThanEqual(other.abstractInt) { a, b -> a <= b }
 *     }
 *     // . . .
 * }
 * ```
 */
sealed class BoundedAbstractElement<V> {
    /** Represents the smallest value in a lattice. */
    private class Bottom<V> : BoundedAbstractElement<V>()
    /** Represents the largest value in a lattice. */
    private class Top<V> : BoundedAbstractElement<V>()
    /** Wraps a non-top/non-bottom value of type [V]. */
    private data class Value<V>(val value: V) : BoundedAbstractElement<V>()

    /** Returns true if this is a [Top] value. */
    fun isTop() = this is Top

    /** Returns true if this is a [Bottom] value. */
    fun isBottom() = this is Bottom

    /** Returns the underlying value if this is a [Value] type. Otherwise, returns null. */
    fun value(): V? = if (this is Value) value else null

    /** A helper for implementing [AbstractValue.isLessThanEqual]. */
    fun isLessThanEqual(other: BoundedAbstractElement<V>, compare: (V, V) -> Boolean): Boolean {
        return when (this) {
            is Bottom -> true
            is Top -> other is Top
            is Value -> when (other) {
                is Value -> compare(this.value, other.value)
                is Top -> true
                is Bottom -> false
            }
        }
    }

    companion object {
        /** Returns a canonical [Top] value. */
        fun <V> getTop(): BoundedAbstractElement<V> = lazy { Top<V>() }.value

        /** Returns a canonical [Bottom] value. */
        fun <V> getBottom(): BoundedAbstractElement<V> = lazy { Bottom<V>() }.value

        /** Returns a [Value] instance that wraps [value]. */
        fun <V> makeValue(value: V): BoundedAbstractElement<V> = Value<V>(value)
    }
}
