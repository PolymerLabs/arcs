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

/**
 * Provides a platform-independent version of [ArcsDuration]
 * from java.time.Duration.
 */
class ArcsDuration private constructor(
    val platformDuration: PlatformDuration
) : Comparable<ArcsDuration> {
    constructor(millis: Long) : this(PlatformDuration.ofMillis(millis))

    fun toMillis(): Long = platformDuration.toMillis()

    override fun compareTo(other: ArcsDuration): Int =
        platformDuration.compareTo(other.platformDuration)

    override fun toString(): String = platformDuration.toString()
    override fun equals(other: Any?): Boolean {
        if (other == null || other !is ArcsDuration) return false
        return platformDuration.equals(other.platformDuration)
    }

    companion object {
        fun valueOf(long: Long): ArcsDuration = ArcsDuration(long)
        fun ofDays(days: Long): ArcsDuration = ArcsDuration(PlatformDuration.ofDays(days))
    }
}
