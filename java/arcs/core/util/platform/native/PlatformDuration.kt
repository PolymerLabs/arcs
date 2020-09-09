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

package arcs.core.util

/** Provides a platform-dependent version of [ArcsDuration]. */
class PlatformDuration {
    fun toString(): String = TODO("Add support for ArcsDuration in Kotlin Native")

    fun toMillis(): String = TODO("Add support for ArcsDuration in Kotlin Native")

    fun compareTo(other: PlatformDuration): Int =
        TODO("Add support for ArcsDuration in Kotlin Native")

    override fun equals(other: Any?): Boolean {
        if (other == null || other !is PlatformDuration) return false
        return this.compareTo(other) == 0
    }

    companion object {
        @Suppress("UNUSED_PARAMETER")
        fun ofMillis(value: Long): PlatformDuration =
            TODO("Add support for ArcsDuration in Kotlin Native")

        @Suppress("UNUSED_PARAMETER")
        fun valueOf(value: Long): PlatformDuration =
            TODO("Add support for ArcsDuration in Kotlin Native")

        @Suppress("UNUSED_PARAMETER")
        fun ofDays(days: Long): ArcsDuration = TODO("Add support for ArcsDuration in Kotlin Native")
    }
}
