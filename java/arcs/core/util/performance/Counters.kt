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

package arcs.core.util.performance

import kotlinx.atomicfu.AtomicInt
import kotlinx.atomicfu.atomic

/** Simple thread-safe class capable of tracking counts of named operations/items/etc. */
class Counters private constructor(
    private val counts: Map<String, AtomicInt>
) {
    /** Creates a [Counters] instance with the provided [counterNames]. */
    constructor(vararg counterNames: String) : this(counterNames.toSet())

    /** Creates a [Counters] instance with the provided [counterNames]. */
    constructor(counterNames: Set<String>) :
        this(counterNames.associateWith { atomic(0) })

    /** Increments the counter specified by the given [counterName] and returns its new value. */
    fun increment(counterName: String): Int =
        requireNotNull(counts[counterName]?.incrementAndGet()) {
            "Counter with name \"$counterName\" not registered"
        }

    /** Gets the current value of the counter specified by the given [counterName]. */
    operator fun get(counterName: String): Int =
        requireNotNull(counts[counterName]?.value) {
            "Counter with name \"$counterName\" not registered"
        }
}
