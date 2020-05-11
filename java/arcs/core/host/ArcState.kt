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
 *
 */
enum class ArcState {
    /**
     * The [Arc] is inbetween [Stopped] and [Running] states, with some [ArcHost]s or
     * [Particle]s started, and others not.
     */
    Indeterminate,

    /**
     * The [Plan.Partition] is running on this particular [ArcHost]. An [Arc] is considered
     * running if even one of its [ArcHost]s are in the [Running] state.
     */
    Running,

    /**
     * The [Plan.Partition] running on this particular [ArcHost] has been stopped, either because
     * it was explicitly stopped, or the [ArcHost] was restarted, but the arc has not been
     * resurrected yet. An [Arc] is considered stopped if and only if all of its participating
     * [ArcHost]s have reached the [Stopped] state.
     */
    Stopped,

    /**
     * This particular [ArcHost] has never started an [Arc] for this [Plan.Partition] yet.
     */
    NeverStarted,

    /**
     * The [Arc] could not be started for some reason, usually due to the failure of one of its
     * [Particle]s to be instantiated properly.
     */
    Error,

    /**
     * [Deleted] implies [Stopped], but furthermore, subsequent attempts to restart this
     * [Arc] will fail, and potentially any data used by the [Arc] may be reclaimed.
     */
    Deleted
}

/**
 * State of an individual [Particle] in a recipe. The purpose is to catch [Particle]s that failed
 * for some reason during the last time the [Arc] was started, and re-initialize them to the
 * needed state the next time the [Arc] is restarted.
 */
enum class ParticleState {
    /** Instantiated, but onCreate() not called */
    Instantiated,
    /** onCreate() has been successfully called. */
    Created,
    /** onStart() has been successfully called. */
    Started,
    /** onStop() has been successfully called. */
    Stopped,
    /**
     * Previous attempt to start this particle failed, but it has previously started. In particular,
     * we can transition from this state to [Started], but not [Created] since the [onCreate]
     * lifecycle has already executed.
     */
    Failed,
    /**
     * This particle has failed, but it has never succeeded yet. It is safe to transition to
     * [Created] from this state.
     */
    Failed_NeverStarted,
    /** [Particle] has failed to start too many times and won't be started in this [Arc] anymore. */
    MaxFailed;

    /**
     * Indicates whether a particle in this state has ever been created before (i.e. startup
     * succeeded at least once).
     */
    val hasBeenCreated: Boolean
        get() = this == Created || this == Started || this == Stopped || this == Failed

    /**
     * Indicates whether the particle has failed during its lifecycle.
     */
    val failed: Boolean
        get() = this == Failed || this == Failed_NeverStarted || this == MaxFailed
}
