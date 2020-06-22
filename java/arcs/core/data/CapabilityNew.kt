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

package arcs.core.data

import arcs.core.util.Time

/** A base class for all the store capabilities. */
sealed class CapabilityNew {
    enum class Comparison { LessStrict, Equivalent, Stricter }

    fun isEquivalent(other: CapabilityNew): Boolean {
        return compare(other) == Comparison.Equivalent
    }
    fun contains(other: CapabilityNew) = isEquivalent(other)
    fun isLessStrict(other: CapabilityNew) = compare(other) == Comparison.LessStrict
    fun isSameOrLessStrict(other: CapabilityNew) = compare(other) != Comparison.Stricter
    fun isStricter(other: CapabilityNew) = compare(other) == Comparison.Stricter
    fun isSameOrStricter(other: CapabilityNew) = compare(other) != Comparison.LessStrict

    abstract fun compare(other: CapabilityNew): Comparison

    /** Capability describing persistence requirement for the store. */
    data class Persistence(val type: Type) : CapabilityNew() {
        enum class Type { None, InMemory, OnDisk, Unrestricted }

        override fun compare(other: CapabilityNew): Comparison {
            require(other is Persistence) { "Cannot compare Persistence with $other" }
            return when {
                type.ordinal < other.type.ordinal -> Comparison.Stricter
                type.ordinal > other.type.ordinal -> Comparison.LessStrict
                else -> Comparison.Equivalent
            }
        }

        companion object {
            fun unrestricted() = Persistence(Type.Unrestricted)
            fun onDisk() = Persistence(Type.OnDisk)
            fun inMemory() = Persistence(Type.InMemory)
            fun none() = Persistence(Type.None)
        }
    }

    /** Capability describing retention policy of the store. */
    sealed class Ttl(count: Int, val isInfinite: Boolean = false) : CapabilityNew() {
        /** Number of milliseconds for retention, or -1 for infinite. */
        val millis: Long = count * when (this) {
            is Millis -> 1
            is Minutes -> 1 * MILLIS_IN_MIN
            is Hours -> 60 * MILLIS_IN_MIN
            is Days -> 60 * 24 * MILLIS_IN_MIN
            is Infinite -> -1
        }
        init {
            require(count > 0 || isInfinite) {
                "must be either positive count on infinite, " +
                    "but got count=$count and isInfinite=$isInfinite"
            }
        }

        override fun compare(other: CapabilityNew): Comparison {
            require(other is Ttl) { "Cannot compare Ttl with $other" }
            return when {
                (isInfinite && other.isInfinite) || millis == other.millis -> Comparison.Equivalent
                isInfinite -> Comparison.LessStrict
                other.isInfinite -> Comparison.Stricter
                millis < other.millis -> Comparison.Stricter
                else -> Comparison.LessStrict
            }
        }

        fun calculateExpiration(time: Time): Long {
            return if (isInfinite) RawEntity.UNINITIALIZED_TIMESTAMP
            else time.currentTimeMillis + millis
        }

        data class Millis(val count: Int) : Ttl(count)
        data class Minutes(val count: Int) : Ttl(count)
        data class Hours(val count: Int) : Ttl(count)
        data class Days(val count: Int) : Ttl(count)
        data class Infinite(val count: Int = TTL_INFINITE) : Ttl(count, true)

        companion object {
            const val TTL_INFINITE = -1
            const val MILLIS_IN_MIN: Long = 60 * 1000
        }
    }

    /** Capability describing whether the store needs to be encrypted. */
    data class Encryption(val value: Boolean) : CapabilityNew() {
        override fun compare(other: CapabilityNew): Comparison {
            require(other is Encryption) { "Cannot compare Encryption with $other" }
            return when {
                value.equals(other.value) -> Comparison.Equivalent
                value -> Comparison.Stricter
                else -> Comparison.LessStrict
            }
        }
    }

    /** Capability describing whether the store needs to be queryable. */
    data class Queryable(val value: Boolean) : CapabilityNew() {
        override fun compare(other: CapabilityNew): Comparison {
            require(other is Queryable) { "Cannot compare Queryable with $other" }
            return when {
                value.equals(other.value) -> Comparison.Equivalent
                value -> Comparison.Stricter
                else -> Comparison.LessStrict
            }
        }
    }

    /** Capability describing whether the store needs to be shareable across arcs. */
    data class Shareable(val value: Boolean) : CapabilityNew() {
        override fun compare(other: CapabilityNew): Comparison {
            require(other is Shareable) { "Cannot compare Shareable with $other" }
            return when {
                value.equals(other.value) -> Comparison.Equivalent
                value -> Comparison.Stricter
                else -> Comparison.LessStrict
            }
        }
    }
}
