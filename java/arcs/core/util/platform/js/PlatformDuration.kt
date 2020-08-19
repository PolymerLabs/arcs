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

/** Provides a platform-dependent version of [Duration]. */
private typealias ArcsD = arcs.core.util.Duration

// Placeholder for platform implementation.
class PlatformDuration {
    companion object {
        fun ofMillis(value: Long): PlatformDuration =
            TODO("Add support for Duration in Kotlin JS")
    }
}

fun ArcsD.toNative(): PlatformDuration =
    PlatformDuration.ofMillis(this.millis)
fun PlatformDuration.toArcs(): ArcsD =
    TODO("Add support for Duration in Kotlin JS")

object PlatformDurationProvider {
    // fun compareTo(left: ArcsD, right: ArcsD): Int =
        // left.toNative().compareTo(right.toNative())
    // inline fun toShort(millis: ArcsD): Short = millis.toNative().toShort()
}
