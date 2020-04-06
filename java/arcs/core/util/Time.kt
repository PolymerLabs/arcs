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
    /**
     * The current time, in nanoseconds. Implementations will vary by platform.
     *
     * Note that this is not time since the Epoch, so this value can only be used for measuring
     * durations, not the actual time. See [System.nanoTime] for details.
     */
    abstract val nanoTime: Long

    /** The current time, in milliseconds past the Epoch. Implementations will vary by platform. */
    abstract val currentTimeMillis: Long
}
