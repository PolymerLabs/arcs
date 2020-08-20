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

/** Provides a platform-dependent version of [ArcsInstant]. */
private typealias ArcsI = arcs.core.util.ArcsInstant

fun ArcsI.toNative(): PlatformInstant = PlatformInstant.ofEpochMilli(this.millis)
fun PlatformInstant.toArcs(): ArcsI = ArcsI(this.toEpochMilli())

object PlatformInstantProvider {
    fun ofEpochMilli(millis: Long): ArcsI =
        PlatformInstant.ofEpochMilli(millis).toArcs()
    fun toEpochMilli(value: ArcsI): Long =
        value.toNative().toEpochMilli()

    fun now(): ArcsI = PlatformInstant.now().toArcs()
}
