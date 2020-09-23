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
    override fun toString(): String =
        TODO("Add support for ArcsDuration in Kotlin JS") // See b/169213588

    fun toMillis(): String = TODO("Add support for ArcsDuration in Kotlin JS") // See b/169213588

    fun compareTo(other: PlatformDuration): Int =
        TODO("Add support for ArcsDuration in Kotlin JS") // See b/169213588

    override fun equals(other: Any?): Boolean {
        if (other == null || other !is PlatformDuration) return false
        return this.compareTo(other) == 0
    }

    companion object {
        @Suppress("UNUSED_PARAMETER")
        fun ofMillis(value: Long): PlatformDuration =
            TODO("Add support for ArcsDuration in Kotlin JS") // See b/169213588

        @Suppress("UNUSED_PARAMETER")
        fun valueOf(value: Long): PlatformDuration =
            TODO("Add support for ArcsDuration in Kotlin JS") // See b/169213588

        @Suppress("UNUSED_PARAMETER")
        fun ofDays(days: Long): PlatformDuration =
            TODO("Add support for ArcsDuration in Kotlin JS") // See b/169213588
        @Suppress("UNUSED_PARAMETER")
        fun ofHours(days: Long): PlatformDuration =
            TODO("Add support for ArcsDuration in Kotlin JS") // See b/169213588
    }
}
