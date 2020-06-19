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

    data class Persistence(val type: Type) : CapabilityNew() {
        enum class Type { None, InMemory, OnDisk, Unrestricted }

        override fun compare(other: CapabilityNew): Comparison {
            return when (other) {
                is Persistence -> {
                    if (type.ordinal < other.type.ordinal) {
                        Comparison.Stricter
                    } else if (type.ordinal > other.type.ordinal) {
                        Comparison.LessStrict
                    } else Comparison.Equivalent
                }
                else -> throw IllegalArgumentException("Cannot compare Persistence with $other")
            }
        }

        companion object {
            fun unrestricted() = Persistence(Type.Unrestricted)
            fun onDisk() = Persistence(Type.OnDisk)
            fun inMemory() = Persistence(Type.InMemory)
            fun none() = Persistence(Type.None)
        }
    }

    sealed class TtlNew(count: Int, val isInfinite: Boolean = false) : CapabilityNew() {
        val millis: Int = count * when (this) {
            is Millis -> 1
            is Minutes -> 1 * MILLIS_IN_MIN
            is Hours -> 60 * MILLIS_IN_MIN
            is Days -> 60 * 24 * MILLIS_IN_MIN
            is Infinite -> 1
        }
        init {
            require(count > 0 || isInfinite) {
                "must be either positive count on infinite, " +
                    "but got count=$count and isInfinite=$isInfinite"
            }
        }

        override fun compare(other: CapabilityNew): Comparison {
            return when (other) {
                is TtlNew -> {
                    if ((isInfinite && other.isInfinite) || millis == other.millis) {
                        Comparison.Equivalent
                    } else if (isInfinite) {
                        Comparison.LessStrict
                    } else if (other.isInfinite) {
                        Comparison.Stricter
                    } else if (millis < other.millis) {
                        Comparison.Stricter
                    } else Comparison.LessStrict
                }
                else -> throw IllegalArgumentException("Cannot compare Ttl with $other")
            }
        }

        fun calculateExpiration(time: Time): Long =
            if (isInfinite) RawEntity.UNINITIALIZED_TIMESTAMP
            else time.currentTimeMillis + millis

        data class Millis(val count: Int) : TtlNew(count)
        data class Minutes(val count: Int) : TtlNew(count)
        data class Hours(val count: Int) : TtlNew(count)
        data class Days(val count: Int) : TtlNew(count)
        data class Infinite(val count: Int = TTL_INFINITE) : TtlNew(count, true)

        companion object {
            const val TTL_INFINITE = -1
            const val MILLIS_IN_MIN = 60 * 1000
        }
    }

    data class Queryable(val value: Boolean) : CapabilityNew() {
        override fun compare(other: CapabilityNew): Comparison {
            return when (other) {
                is Queryable -> {
                    if (value.equals(other.value)) {
                        Comparison.Equivalent
                    } else if (value) {
                        Comparison.Stricter
                    } else Comparison.LessStrict
                }
                else -> throw IllegalArgumentException("Cannot compare Queryable with $other")
            }
        }
    }

    data class Shareable(val value: Boolean) : CapabilityNew() {
        override fun compare(other: CapabilityNew): Comparison {
            return when (other) {
                is Shareable -> {
                    if (value.equals(other.value)) {
                        Comparison.Equivalent
                    } else if (value) {
                        Comparison.Stricter
                    } else Comparison.LessStrict
                }
                else -> throw IllegalArgumentException("Cannot compare Shareable with $other")
            }
        }
    }
}
