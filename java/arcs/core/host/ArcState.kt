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
data class ArcState private constructor(val state: State, val cause: Throwable? = null) {

  /**
   * Only consider [state] as important for equals(), ignoring [cause].
   */
  override fun equals(other: Any?): Boolean = when (other) {
    is ArcState -> this.state === other.state
    else -> false
  }

  /**
   * Only consider [state] as important for hashCode(), ignoring [cause].
   */
  override fun hashCode(): Int {
    return state.hashCode()
  }

  override fun toString() = SerializedState(this).serializedState

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
    fun errorWith(cause: Throwable? = null) = ArcState(State.Error, cause)

    /**
     * Creates an ArcState instance from the given string. For the Error case, this may have
     * a reconstructed exception containing the original exception's toString result.
     */
    fun fromString(serializedState: String) =
      SerializedState(serializedState).let {
        ArcState(it.getState(), it.cause)
      }
  }
}

/** Inline class representing serialized exceptions as strings. */
inline class SerializedState(val serializedState: String) {
  /** Construct serialized [ParticleState]. */
  constructor(particleState: ParticleState) : this(
    particleState.state.name + (particleState.cause?.let { "|$it" } ?: "")
  )

  /** Construct serialized [ArcState]. */
  constructor(arcState: ArcState) : this(
    arcState.state.name + (arcState.cause?.let { "|$it" } ?: "")
  )

  /** Access the serialized exception of a serialized state. */
  val cause
    get() = parseState().let {
      if (it.size == 2) DeserializedException(it[1]) else null
    }

  fun parseState() = serializedState.split('|', limit = 2)
}

/** Return correct serialized state (Enum) via type inferencing. */
inline fun <reified T : Enum<T>> SerializedState.getState() =
  enumValueOf<T>(this.parseState()[0])

/**
 * State of an individual [Particle] in a recipe. The purpose is to catch [Particle]s that failed
 * for some reason during the last time the [Arc] was started, and re-initialize them to the
 * needed state the next time the [Arc] is restarted.
 */
data class ParticleState private constructor(val state: State, val cause: Exception? = null) {

  override fun equals(other: Any?): Boolean = when (other) {
    is ParticleState -> this.state === other.state
    else -> false
  }

  override fun hashCode(): Int {
    return state.hashCode()
  }

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

  override fun toString() = SerializedState(this).serializedState

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

    /** Creates [ParticleState] from serialized [toString] representation. */
    fun fromString(serializedState: String) =
      SerializedState(serializedState).let {
        ParticleState(it.getState(), it.cause)
      }

    /**
     * Creates a ParticleState.Failed instance with an exception attached. Note that the
     * exception is not included in equality comparisons, so two Failed instances with different
     * exceptions will still be considered equal, both to each other and to the singleton Failed
     * defined above.
     */
    fun failedWith(cause: Exception? = null) = ParticleState(State.Failed, cause)

    /** As per failedWith for ParticleState.Failed_NeverStarted. */
    fun failedNeverStartedWith(cause: Exception? = null) =
      ParticleState(State.Failed_NeverStarted, cause)

    /** As per failedWith for ParticleState.MaxFailed. */
    fun maxFailedWith(cause: Exception? = null) = ParticleState(State.MaxFailed, cause)
  }
}
