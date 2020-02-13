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
package arcs.core.host

/**
 * The current state of an [Arc] for a given [ArcHost]. An [Arc] may be in a different state
 * on each [ArcHost] at various times.
 */
enum class State {
    /**
     * This particular [ArcHost] has never started an [Arc] for this [PlanPartition] yet.
     */
    NeverStarted,

    /**
     * The [PlanPartition] is running on this particular [ArcHost]. An [Arc] is considered
     * running if even one of its [ArcHost]s are in the [Running] state.
     */
    Running,

    /**
     * The [PlanPartition] running on this particular [ArcHost] has been stopped, either because
     * it was explicitly stopped, or the [ArcHost] was restarted, but the arc has not been
     * resurrected yet. An [Arc] is considered stopped if and only if all of its participating
     * [ArcHost]s have reached the [Stopped] state.
     */
    Stopped,

    /**
     * [Deleted] implies [Stopped], but further more, subsequent attempts to restart this
     * [Arc] will fail, and potentially any data used by the [Arc] may be reclaimed.
     */
    Deleted
}

