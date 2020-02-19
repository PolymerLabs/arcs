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

/** [Time] contains time related helper methods. */
abstract class Time {
    /** The current time, in nanoseconds past the Epoch. Implementations will vary by platform. */
    abstract val currentTimeNanos: Long

    /** The current time, in milliseconds past the Epoch. Implementations will vary by platform. */
    abstract val currentTimeMillis: Long
}
