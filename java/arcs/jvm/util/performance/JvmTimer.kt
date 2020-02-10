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

package arcs.jvm.util.performance

import arcs.core.util.performance.Timer

/** Implementation of [Timer] for the JVM. */
object JvmTimer : Timer() {
    override val currentTimeNanos: Long
        get() = System.nanoTime()
}
