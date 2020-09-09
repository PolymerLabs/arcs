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
    fun toString(): String = TODO("Add support for ArcsInstant in Kotlin JS")

    fun toEpochMilli(): Long =
        TODO("Add support for ArcsInstant in Kotlin JS")

    fun compareTo(other: PlatformInstant): Int = TODO("Add support for ArcsInstant in Kotlin JS")

    override fun equals(other: Any?): Boolean {
        if (other == null || other !is PlatformInstant) return false
        return this.compareTo(other) == 0
    }

    companion object {
        @Suppress("UNUSED_PARAMETER")
        fun ofEpochMilli(value: Long): PlatformInstant =
            TODO("Add support for ArcsInstant in Kotlin JS")
        fun now(): PlatformInstant =
            TODO("Add support for ArcsInstant in Kotlin JS")

        @Suppress("UNUSED_PARAMETER")
        fun valueOf(value: Long): PlatformInstant =
            TODO("Add support for ArcsInstant in Kotlin JS")
    }
}
