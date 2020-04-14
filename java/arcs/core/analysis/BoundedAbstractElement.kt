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
 * value) and top (the largest value) in the lattice. For example, `bottom.join(other)` is always
 * equal to `other` for any value of `other`, because `bottom` is the lowest value in the lattice.
 *
 * Here is a sample use of this class for implementing an abstract domain of integer elements,
 * where the elements are ordered by [Int]'s `<=` operator.
 * ```
 * class IntegerDomain(
 *     val abstractInt: BoundedAbstractElement<Int>
 * ) : AbstractValue<IntegerDomain> {
 *     override infix fun join(other: IntegerDomain): IntegerDomain {
 *         return abstractInt.join(other.abstractInt) { a, b -> maxOf(a, b) }
 *     }
 *     // . . .
 * }
 * ```
 */
data class BoundedAbstractElement<V: Any> private constructor(
    private val kind: Kind,
    val value: V?
) {
    private enum class Kind { TOP, BOTTOM, VALUE }

    /** True if this is top. */
    val isTop: Boolean
        get() = kind == Kind.TOP

    /** True if this is bottom. */
    val isBottom: Boolean
        get() = kind == Kind.BOTTOM

    /** A helper for implementing [AbstractValue.join]. */
    fun join(other: BoundedAbstractElement<V>, joiner: (V, V) -> V): BoundedAbstractElement<V> {
        return when (this.kind) {
            Kind.BOTTOM -> other
            Kind.TOP -> this /* returns top */
            Kind.VALUE -> when (other.kind) {
                Kind.VALUE -> makeValue(
                    joiner(requireNotNull(this.value), requireNotNull(other.value))
                )
                Kind.TOP -> other /* returns top */
                Kind.BOTTOM -> this
            }
        }
    }

    /** A helper for implementing [AbstractValue.meet]. */
    fun meet(other: BoundedAbstractElement<V>, meeter: (V, V) -> V): BoundedAbstractElement<V> {
        return when (this.kind) {
            Kind.BOTTOM -> this /* returns bottom */
            Kind.TOP -> other
            Kind.VALUE -> when (other.kind) {
                Kind.VALUE -> makeValue(
                    meeter(requireNotNull(this.value), requireNotNull(other.value))
                )
                Kind.TOP -> this
                Kind.BOTTOM -> other /* returns bottom */
            }
        }
    }

    companion object {
        /** Returns a canonical top value. */
        fun <V: Any> getTop() = BoundedAbstractElement<V>(Kind.TOP, null)

        /** Returns a canonical bottom value. */
        fun <V: Any> getBottom() = BoundedAbstractElement<V>(Kind.BOTTOM, null)

        /** Returns an instance that wraps [value]. */
        fun <V: Any> makeValue(value: V) = BoundedAbstractElement<V>(Kind.VALUE, value)
    }
}
