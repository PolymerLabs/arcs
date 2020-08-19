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

import java.time.Duration as PlatformDuration

/** Provides a platform-dependent version of [Duration]. */
private typealias ArcsD = arcs.core.util.Duration

fun ArcsD.toNative(): PlatformDuration =
    PlatformDuration.ofMillis(this.millis)
fun PlatformDuration.toArcs(): ArcsD {
    val seconds = this.getSeconds()
    val nanos = this.getNano()
    return ArcsD(seconds*1000 + nanos/1000)
}

object PlatformDurationProvider {
}
