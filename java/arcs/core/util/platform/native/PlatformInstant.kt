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

/** Provides a platform-dependent version of [ArcsInstant]. */
class PlatformInstant {
    override fun toString(): String = TODO("Add support for ArcsInstant in Kotlin Native")

    fun toEpochMilli(): Long =
        TODO("Add support for ArcsInstant in Kotlin Native")

    @Suppress("UNUSED_PARAMETER")
    fun compareTo(other: PlatformInstant): Int =
        TODO("Add support for ArcsInstant in Kotlin Native")

    @Suppress("UNUSED_PARAMETER")
    override fun equals(other: Any?): Boolean {
        if (other == null || other !is PlatformInstant) return false
        return this.compareTo(other) == 0
    }

    @Suppress("UNUSED_PARAMETER")
    fun plus(time: PlatformInstant): PlatformInstant =
        TODO("Add support for ArcsInstant in Kotlin Native")

    @Suppress("UNUSED_PARAMETER")
    fun minus(time: PlatformInstant): PlatformInstant =
        TODO("Add support for ArcsInstant in Kotlin Native")

    companion object {
        @Suppress("UNUSED_PARAMETER")
        fun ofEpochMilli(value: Long): PlatformInstant =
            TODO("Add support for ArcsInstant in Kotlin Native")
        fun now(): PlatformInstant =
            TODO("Add support for ArcsInstant in Kotlin Native")

        @Suppress("UNUSED_PARAMETER")
        fun valueOf(value: Long): PlatformInstant =
            TODO("Add support for ArcsInstant in Kotlin Native")
    }
}
