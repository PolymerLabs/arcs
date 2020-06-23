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
sealed class CapabilityNew<V : CapabilityNew<V>> {
    enum class Comparison { LessStrict, Equivalent, Stricter }

    fun isEquivalent(other: V): Boolean {
        return compare(other) == Comparison.Equivalent
    }
    fun contains(other: V) = isEquivalent(other)
    fun isLessStrict(other: V) = compare(other) == Comparison.LessStrict
    fun isSameOrLessStrict(other: V) = compare(other) != Comparison.Stricter
    fun isStricter(other: V) = compare(other) == Comparison.Stricter
    fun isSameOrStricter(other: V) = compare(other) != Comparison.LessStrict

    open fun compare(other: V): Comparison {
        return when (this) {
            is Persistence -> compare(other as Persistence)
            is Encryption -> compare(other as Encryption)
            is Ttl -> compare(other as Ttl)
            is Queryable -> compare(other as Queryable)
            is Shareable -> compare(other as Shareable)
        }
    }

    /** Capability describing persistence requirement for the store. */
    data class Persistence(val kind: Kind) : CapabilityNew<Persistence>() {
        enum class Kind { None, InMemory, OnDisk, Unrestricted }

        override fun compare(other: Persistence): Comparison {
            return when {
                kind.ordinal < other.kind.ordinal -> Comparison.Stricter
                kind.ordinal > other.kind.ordinal -> Comparison.LessStrict
                else -> Comparison.Equivalent
            }
        }

        companion object {
            val UNRESTRICTED = Persistence(Kind.Unrestricted)
            val ON_DISK = Persistence(Kind.OnDisk)
            val IN_MEMORY = Persistence(Kind.InMemory)
            val NONE = Persistence(Kind.None)
        }
    }

    /** Capability describing retention policy of the store. */
    sealed class Ttl(count: Int, val isInfinite: Boolean = false) : CapabilityNew<Ttl>() {
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
                "must be either positive count or infinite, " +
                    "but got count=$count and isInfinite=$isInfinite"
            }
        }

        override fun compare(other: Ttl): Comparison {
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
            const val MILLIS_IN_MIN = 60 * 1000L
        }
    }

    /** Capability describing whether the store needs to be encrypted. */
    data class Encryption(val value: Boolean) : CapabilityNew<Encryption>() {
        override fun compare(other: Encryption): Comparison {
            return when {
                value == other.value -> Comparison.Equivalent
                value -> Comparison.Stricter
                else -> Comparison.LessStrict
            }
        }
    }

    /** Capability describing whether the store needs to be queryable. */
    data class Queryable(val value: Boolean) : CapabilityNew<Queryable>() {
        override fun compare(other: Queryable): Comparison {
            return when {
                value == other.value -> Comparison.Equivalent
                value -> Comparison.Stricter
                else -> Comparison.LessStrict
            }
        }
    }

    /** Capability describing whether the store needs to be shareable across arcs. */
    data class Shareable(val value: Boolean) : CapabilityNew<Shareable>() {
        override fun compare(other: Shareable): Comparison {
            return when {
                value == other.value -> Comparison.Equivalent
                value -> Comparison.Stricter
                else -> Comparison.LessStrict
            }
        }
    }
}
