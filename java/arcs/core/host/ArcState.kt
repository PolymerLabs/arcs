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
 * When an [Arc] in an error state is restarted after being serialized, this class is used to
 * provide an exception attached to the error state object. The original exception type no longer
 * matches, but information about the error is preserved to some extent.
 */
class DeserializedException(message: String) : Exception(message)

/**
 * The current state of an [Arc] for a given [ArcHost]. An [Arc] may be in a different state
 * on each [ArcHost] at various times.
 */
data class ArcState private constructor(val state: State) {

    /** For ArcState.Error instances, this may hold an exception for the error. */
    val cause: Exception?
        get() = _cause

    private var _cause: Exception? = null

    override fun toString(): String {
        return if (_cause != null) {
            "${state.name}|$_cause"
        } else {
            state.name
        }
    }

    enum class State {
        /**
         * The [Arc] is in between [Stopped] and [Running] states, with some [ArcHost]s or
         * [Particle]s started, and others not.
         */
        Indeterminate,

        /**
         * The [Plan.Partition] is running on this particular [ArcHost]. An [Arc] is considered
         * running if even one of its [ArcHost]s are in the [Running] state.
         */
        Running,

        /**
         * The [Plan.Partition] running on this particular [ArcHost] has been stopped, either
         * because it was explicitly stopped, or the [ArcHost] was restarted, but the arc has
         * not been resurrected yet. An [Arc] is considered stopped if and only if all of its
         * participating [ArcHost]s have reached the [Stopped] state.
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

    companion object {
        val Indeterminate = ArcState(State.Indeterminate)
        val Running = ArcState(State.Running)
        val Stopped = ArcState(State.Stopped)
        val NeverStarted = ArcState(State.NeverStarted)
        val Error = ArcState(State.Error)
        val Deleted = ArcState(State.Deleted)

        /**
         * Creates an ArcState.Error instance with an exception attached. Note that the exception
         * is not included in equality comparisons, so two Error instances with different exceptions
         * will still be considered equal, both to each other and to the singleton Error defined
         * above.
         */
        fun errorWith(cause: Exception? = null) = ArcState(State.Error).apply { _cause = cause }

        /**
         * Creates an ArcState instance from the given string. For the Error case, this may have
         * a reconstructed exception containing the original exception's toString result.
         */
        fun fromString(value: String): ArcState {
            val parts = value.split("|", limit = 2)
            return ArcState(State.valueOf(parts[0])).apply {
                if (parts.size == 2) {
                    _cause = DeserializedException(parts[1])
                }
            }
        }
    }
}

/**
 * State of an individual [Particle] in a recipe. The purpose is to catch [Particle]s that failed
 * for some reason during the last time the [Arc] was started, and re-initialize them to the
 * needed state the next time the [Arc] is restarted.
 */
data class ParticleState private constructor(val state: State) {
    /**
     * Indicates whether a particle in this state has ever been created before (i.e. startup
     * succeeded at least once).
     */
    val hasBeenStarted: Boolean
        get() = this in arrayOf(FirstStart, Waiting, Running, Desynced, Stopped, Failed)

    /**
     * Indicates whether the particle has failed during its lifecycle.
     */
    val failed: Boolean
        get() = this in arrayOf(Failed, Failed_NeverStarted, MaxFailed)

    /** For ParticleState failure instances, this may hold an exception for the error. */
    val cause: Exception?
        get() = _cause

    private var _cause: Exception? = null

    override fun toString(): String {
        return if (_cause != null) {
            "${state.name}|$_cause"
        } else {
            state.name
        }
    }

    enum class State {
        /** Instantiated, but onFirstStart() has not been called. */
        Instantiated,

        /** onFirstStart() has been called, possibly in a previous execution session. */
        FirstStart,

        /** onStart() has been called; the particle is awaiting handle synchronization. */
        Waiting,

        /** onReady() has been called; the particle is ready for execution. */
        Running,

        /** onDesync() has been called; one or more handles have desynchronized from storage. */
        Desynced,

        /** onStop() has been called; the arc is no longer executing. */
        Stopped,

        /**
         * Previous attempt to start this particle failed, but it has previously started. In
         * particular, we can transition from this state to [Waiting], but not [FirstStart] since
         * the [onFirstStart] lifecycle has already executed.
         */
        Failed,

        /**
         * This particle has failed, but it has never succeeded yet. It is safe to transition to
         * [FirstStart] from this state.
         */
        Failed_NeverStarted,

        /**
         * [Particle] has failed to start too many times and won't be started in this [Arc]
         * anymore.
         */
        MaxFailed;
    }

    companion object {
        val Instantiated = ParticleState(State.Instantiated)
        val FirstStart = ParticleState(State.FirstStart)
        val Waiting = ParticleState(State.Waiting)
        val Running = ParticleState(State.Running)
        val Desynced = ParticleState(State.Desynced)
        val Stopped = ParticleState(State.Stopped)
        val Failed = ParticleState(State.Failed)
        val Failed_NeverStarted = ParticleState(State.Failed_NeverStarted)
        val MaxFailed = ParticleState(State.MaxFailed)

        /**
         * Creates a ParticleState.Failed instance with an exception attached. Note that the
         * exception is not included in equality comparisons, so two Failed instances with different
         * exceptions will still be considered equal, both to each other and to the singleton Failed
         * defined above.
         */
        fun failedWith(cause: Exception? = null) =
            ParticleState(State.Failed).apply { _cause = cause }

        /** As per failedWith for ParticleState.Failed_NeverStarted. */
        fun failedNeverStartedWith(cause: Exception? = null) =
            ParticleState(State.Failed_NeverStarted).apply { _cause = cause }

        /** As per failedWith for ParticleState.MaxFailed. */
        fun maxFailedWith(cause: Exception? = null) =
            ParticleState(State.MaxFailed).apply { _cause = cause }
    }
}
