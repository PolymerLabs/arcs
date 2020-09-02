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

package arcs.android.common

import android.os.Trace

/**
 * Harness [android.os.Trace] trace points identified by
 * the trace [tag] to the entry and the exit of the [block].
 */
inline fun <T> scopedTrace(tag: String, block: () -> T): T {
    Trace.beginSection(tag)
    val result = block()
    Trace.endSection()
    return result
}
