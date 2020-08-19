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

import java.time.Instant as PlatformInstant

/** Provides a platform-dependent version of [Instant]. */
private typealias ArcsI = arcs.core.util.Instant

fun ArcsI.toNative(): PlatformInstant = PlatformInstant.ofEpochMilli(this.value)
fun PlatformInstant.toArcs(): ArcsI = ArcsI(this.toEpochMilli())

object PlatformInstantProvider {

    fun ofEpochMillis(millis: Long) =
        PlatformInstant.ofEpochMilli(millis)
    fun toEpochMillis(value: ArcsI) =
        value.toNative().toEpochMilli()
    // fun compareTo(left: ArcsI, right: ArcsI): Int =
        // left.toNative().compareTo(right.toNative())
    // inline fun toShort(value: ArcsI): Short = value.toNative().toShort()
}
