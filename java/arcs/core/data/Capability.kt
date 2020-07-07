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
sealed class Capability(val tag: String) {
    enum class Comparison { LessStrict, Equivalent, Stricter }

    open fun isEquivalent(other: Capability): Boolean {
        return compare(other) == Comparison.Equivalent
    }
    open fun contains(other: Capability) = isEquivalent(other)
    fun isLessStrict(other: Capability) = compare(other) == Comparison.LessStrict
    fun isSameOrLessStrict(other: Capability) = compare(other) != Comparison.Stricter
    fun isStricter(other: Capability) = compare(other) == Comparison.Stricter
    fun isSameOrStricter(other: Capability) = compare(other) != Comparison.LessStrict

    fun compare(other: Capability): Comparison {
        return when (this) {
            is Persistence -> compare(other as Persistence)
            is Encryption -> compare(other as Encryption)
            is Ttl -> compare(other as Ttl)
            is Queryable -> compare(other as Queryable)
            is Shareable -> compare(other as Shareable)
            is Range -> throw UnsupportedOperationException(
                "Capability.Range comparison not supported yet."
            )
        }
    }

    /**
     * Returns its own tag if this is an individual capability, or the tag of the inner capability,
     * if this is a range.
     */
    fun getRealTag(): String {
        return when (tag) {
            Capability.Range.TAG -> (this as Capability.Range).min.tag
            else -> tag
        }
    }

    fun isCompatible(other: Capability): Boolean {
        return getRealTag() == other.getRealTag()
    }

    open fun toRange() = Range(this, this)

    /** Capability describing persistence requirement for the store. */
    data class Persistence(val kind: Kind) : Capability(TAG) {
        enum class Kind { None, InMemory, OnDisk, Unrestricted }

        fun compare(other: Persistence): Comparison {
            return when {
                kind.ordinal < other.kind.ordinal -> Comparison.Stricter
                kind.ordinal > other.kind.ordinal -> Comparison.LessStrict
                else -> Comparison.Equivalent
            }
        }

        companion object {
            const val TAG = "persistence"
            val UNRESTRICTED = Persistence(Kind.Unrestricted)
            val ON_DISK = Persistence(Kind.OnDisk)
            val IN_MEMORY = Persistence(Kind.InMemory)
            val NONE = Persistence(Kind.None)

            val ANY = Range(Persistence.UNRESTRICTED, Persistence.NONE)

            fun fromAnnotations(annotations: List<Annotation>): Persistence? {
                val kinds = mutableSetOf<Kind>()
                for (annotation in annotations) {
                    when (annotation.name) {
                        "onDisk", "persistent" -> kinds.add(Kind.OnDisk)
                        "inMemory", "tiedToArc", "tiedToRuntime" -> kinds.add(Kind.InMemory)
                    }
                }
                return when (kinds.size) {
                    0 -> null
                    1 -> Persistence(kinds.elementAt(0))
                    else -> throw IllegalStateException(
                        "Containing multiple persistence capabilities: $annotations"
                    )
                }
            }
        }
    }

    /** Capability describing retention policy of the store. */
    sealed class Ttl(count: Int, val isInfinite: Boolean = false) : Capability(TAG) {
        /** Number of minutes for retention, or -1 for infinite. */
        val minutes: Int = count * when (this) {
            is Minutes -> 1
            is Hours -> 60
            is Days -> 60 * 24
            is Infinite -> -1
        }
        /** Number of milliseconds for retention, or -1 for infinite. */
        val millis: Long = if (this is Infinite) -1 else minutes * MILLIS_IN_MIN
        init {
            require(count >= 0 || isInfinite) {
                "must be either non-negative count or infinite, " +
                    "but got count=$count and isInfinite=$isInfinite"
            }
        }

        fun compare(other: Ttl): Comparison {
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

        data class Minutes(val count: Int) : Ttl(count)
        data class Hours(val count: Int) : Ttl(count)
        data class Days(val count: Int) : Ttl(count)
        data class Infinite(val count: Int = TTL_INFINITE) : Ttl(count, true)

        companion object {
            const val TAG = "ttl"
            const val TTL_INFINITE = -1
            const val MILLIS_IN_MIN = 60 * 1000L

            val ZERO = Ttl.Minutes(0)
            val ANY = Range(Ttl.Infinite(), Ttl.ZERO)

            private val TTL_PATTERN =
                "^([0-9]+)[ ]*(day[s]?|hour[s]?|minute[s]?|[d|h|m])$".toRegex()

            fun fromString(ttlStr: String): Ttl {
                val ttlMatch = requireNotNull(TTL_PATTERN.matchEntire(ttlStr.trim())) {
                    "Invalid TTL $ttlStr."
                }
                val (_, count, units) = ttlMatch.groupValues
                // Note: consider using idiomatic KT types:
                // https://kotlinlang.org/api/latest/jvm/stdlib/kotlin.time/-duration-unit/
                return when (units.trim()) {
                    "m", "minute", "minutes" -> Ttl.Minutes(count.toInt())
                    "h", "hour", "hours" -> Ttl.Hours(count.toInt())
                    "d", "day", "days" -> Ttl.Days(count.toInt())
                    else -> throw IllegalStateException("Invalid TTL units $units")
                }
            }

            fun fromAnnotations(annotations: List<Annotation>): Ttl? {
                return annotations.find { it.name == "ttl" }?.let {
                    Capability.Ttl.fromString(it.getStringParam("value"))
                }
            }
        }
    }

    /** Capability describing whether the store needs to be encrypted. */
    data class Encryption(val value: Boolean) : Capability(TAG) {
        fun compare(other: Encryption): Comparison {
            return when {
                value == other.value -> Comparison.Equivalent
                value -> Comparison.Stricter
                else -> Comparison.LessStrict
            }
        }
        companion object {
            const val TAG = "encryption"
            val ANY = Range(Encryption(false), Encryption(true))

            fun fromAnnotations(annotations: List<Annotation>): Encryption? {
                return annotations.find { it.name == "encrypted" }?.let {
                    Capability.Encryption(true)
                }
            }
        }
    }

    /** Capability describing whether the store needs to be queryable. */
    data class Queryable(val value: Boolean) : Capability(TAG) {
        fun compare(other: Queryable): Comparison {
            return when {
                value == other.value -> Comparison.Equivalent
                value -> Comparison.Stricter
                else -> Comparison.LessStrict
            }
        }

        companion object {
            const val TAG = "queryable"
            val ANY = Range(Queryable(false), Queryable(true))

            fun fromAnnotations(annotations: List<Annotation>): Queryable? {
                return annotations.find { it.name == "queryable" }?.let {
                    Capability.Queryable(true)
                }
            }
        }
    }

    /** Capability describing whether the store needs to be shareable across arcs. */
    data class Shareable(val value: Boolean) : Capability(TAG) {
        fun compare(other: Shareable): Comparison {
            return when {
                value == other.value -> Comparison.Equivalent
                value -> Comparison.Stricter
                else -> Comparison.LessStrict
            }
        }

        companion object {
            const val TAG = "shareable"
            val ANY = Range(Shareable(false), Shareable(true))

            fun fromAnnotations(annotations: List<Annotation>): Shareable? {
                return annotations.find {
                    arrayOf("shareable", "tiedToRuntime").contains(it.name)
                }?.let { Capability.Shareable(true) }
            }
        }
    }

    data class Range(val min: Capability, val max: Capability) : Capability(TAG) {
        init {
            require(min.isSameOrLessStrict(max)) {
                "Minimum capability in a range must be equivalent or less strict than maximum."
            }
        }

        override fun isEquivalent(other: Capability): Boolean {
            return when (other) {
                is Range -> min.isEquivalent(other.min) && max.isEquivalent(other.max)
                else -> min.isEquivalent(other) && max.isEquivalent(other)
            }
        }

        override fun contains(other: Capability): Boolean {
            return when (other) {
                is Range ->
                    min.isSameOrLessStrict(other.min) && max.isSameOrStricter(other.max)
                else -> min.isSameOrLessStrict(other) && max.isSameOrStricter(other)
            }
        }

        override fun toRange() = this

        companion object {
            const val TAG = "range"
        }
    }
}
