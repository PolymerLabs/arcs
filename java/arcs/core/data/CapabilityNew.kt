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

    open fun isEquivalent(other: CapabilityNew): Boolean {
        return compare(other) == Comparison.Equivalent
    }
    open fun contains(other: CapabilityNew) = isEquivalent(other)
    fun isLessStrict(other: CapabilityNew) = compare(other) == Comparison.LessStrict
    fun isSameOrLessStrict(other: CapabilityNew) = compare(other) != Comparison.Stricter
    fun isStricter(other: CapabilityNew) = compare(other) == Comparison.Stricter
    fun isSameOrStricter(other: CapabilityNew) = compare(other) != Comparison.LessStrict

    fun compare(other: CapabilityNew): Comparison {
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

    open fun toRange() = Range(this, this)

    /** Capability describing persistence requirement for the store. */
    data class Persistence(val kind: Kind) : CapabilityNew() {
        enum class Kind { None, InMemory, OnDisk, Unrestricted }

        fun compare(other: Persistence): Comparison {
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

        data class Millis(val count: Int) : Ttl(count)
        data class Minutes(val count: Int) : Ttl(count)
        data class Hours(val count: Int) : Ttl(count)
        data class Days(val count: Int) : Ttl(count)
        data class Infinite(val count: Int = TTL_INFINITE) : Ttl(count, true)

        companion object {
            const val TTL_INFINITE = -1
            const val MILLIS_IN_MIN = 60 * 1000L

            val ZERO = Ttl.Millis(0)
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
                    CapabilityNew.Ttl.fromString(it.getStringParam("value"))
                }
            }
        }
    }

    /** Capability describing whether the store needs to be encrypted. */
    data class Encryption(val value: Boolean) : CapabilityNew() {
        fun compare(other: Encryption): Comparison {
            return when {
                value == other.value -> Comparison.Equivalent
                value -> Comparison.Stricter
                else -> Comparison.LessStrict
            }
        }
        companion object {
            val ANY = Range(Encryption(false), Encryption(true))

            fun fromAnnotations(annotations: List<Annotation>): Encryption? {
                return annotations.find { it.name == "encrypted" }?.let {
                    CapabilityNew.Encryption(true)
                }
            }
        }
    }

    /** Capability describing whether the store needs to be queryable. */
    data class Queryable(val value: Boolean) : CapabilityNew() {
        fun compare(other: Queryable): Comparison {
            return when {
                value == other.value -> Comparison.Equivalent
                value -> Comparison.Stricter
                else -> Comparison.LessStrict
            }
        }

        companion object {
            val ANY = Range(Queryable(false), Queryable(true))

            fun fromAnnotations(annotations: List<Annotation>): Queryable? {
                return annotations.find { it.name == "queryable" }?.let {
                    CapabilityNew.Queryable(true)
                }
            }
        }
    }

    /** Capability describing whether the store needs to be shareable across arcs. */
    data class Shareable(val value: Boolean) : CapabilityNew() {
        fun compare(other: Shareable): Comparison {
            return when {
                value == other.value -> Comparison.Equivalent
                value -> Comparison.Stricter
                else -> Comparison.LessStrict
            }
        }

        companion object {
            val ANY = Range(Shareable(false), Shareable(true))

            fun fromAnnotations(annotations: List<Annotation>): Shareable? {
                return annotations.find {
                    arrayOf("shareable", "tiedToRuntime").contains(it.name)
                }?.let { CapabilityNew.Shareable(true) }
            }
        }
    }

    data class Range(val min: CapabilityNew, val max: CapabilityNew) : CapabilityNew() {
        init {
            require(min.isSameOrLessStrict(max)) {
                "Minimum capability in a range must be equivalent or less strict than maximum."
            }
        }

        override fun isEquivalent(other: CapabilityNew): Boolean {
            return when (other) {
                is Range -> min.isEquivalent(other.min) && max.isEquivalent(other.max)
                else -> min.isEquivalent(other) && max.isEquivalent(other)
            }
        }

        override fun contains(other: CapabilityNew): Boolean {
            return when (other) {
                is Range ->
                    min.isSameOrLessStrict(other.min) && max.isSameOrStricter(other.max)
                else -> min.isSameOrLessStrict(other) && max.isSameOrStricter(other)
            }
        }

        override fun toRange() = this
    }
}
