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

import arcs.core.data.Plan
import arcs.core.entity.Handle
import arcs.core.host.api.Particle
import arcs.core.storage.StorageProxy.StorageEvent
import arcs.core.util.Scheduler
import arcs.core.util.TaggedLog
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.withContext

/** Maximum number of times a particle may fail to be started before giving up. */
const val MAX_CONSECUTIVE_FAILURES = 5

/**
 * Holds per-[Particle] context state needed by [ArcHost] to implement [Particle] lifecycle.
 *
 * @property planParticle the [Plan.Particle] used to instantiate [particle]
 * @property particleState the current state the particle lifecycle is in
 * @property consecutiveFailureCount how many times this particle failed to start in a row; used
 *           to detect infinite-crash loop particles
 */
class ParticleContext(
  val planParticle: Plan.Particle,
  var particleState: ParticleState = ParticleState.Instantiated,
  var consecutiveFailureCount: Int = 0
) {
  private val log = TaggedLog {
    "ParticleContext(${planParticle.particleName}, state=$particleState)"
  }

  private lateinit var _particle: Particle
  /** Currently instantiated [Particle] class. */
  val particle: Particle
    get() = if (this::_particle.isInitialized) _particle else NoOpArcHostParticle

  /** Construct a [ParticleContext] with an initial [Particle] instance. */
  constructor(
    particle: Particle,
    planParticle: Plan.Particle,
    particleState: ParticleState = ParticleState.Instantiated,
    consecutiveFailureCount: Int = 0
  ) : this(planParticle, particleState, consecutiveFailureCount) {
    _particle = particle
  }

  // Indicates whether the particle has any readable handles or not.
  private var isWriteOnly = true

  // The set of handles that expect to receive StorageEvent.READY.
  private val awaitingReady: MutableSet<Handle> = mutableSetOf()

  // The set of handles that are currently desynchronized from storage.
  private val desyncedHandles: MutableSet<Handle> = mutableSetOf()

  // A list of deferreds that should be completed when the particle moves to the ready state.
  // Calling [runParticle] will add to this. The list is completed and cleared in [moveToReady].
  private var pendingReadyDeferred: CompletableDeferred<Unit>? = null

  override fun toString() = "ParticleContext(particle=$particle, particleState=$particleState, " +
    "consecutiveFailureCount=$consecutiveFailureCount, isWriteOnly=$isWriteOnly, " +
    "awaitingReady=$awaitingReady, desyncedHandles=$desyncedHandles)"

  /** Create a copy of [ParticleContext] with a new [particle]. */
  fun copyWith(newParticle: Particle) = ParticleContext(
    newParticle,
    planParticle,
    particleState,
    consecutiveFailureCount
  )

  /**
   * Sets up [StorageEvent] handling for [particle].
   */
  fun registerHandle(handle: Handle, onError: (Exception) -> Unit = {}) {
    log.debug { "registerHandle $handle" }

    // TODO(b/159257058): write-only handles still need to sync
    val canRead = handle.mode.canRead // left here to preserve mock ordering in tests
    isWriteOnly = false

    // Track the StorageEvent.READY notifications for readable handles
    // so we can invoke Particle.onReady once they have all fired.
    awaitingReady.add(handle)

    // Particles with readable handles need to be notified for storage events
    // against those handles, but a direct connection from StorageProxy to Particle
    // is difficult in the current architecture. Instead, we'll thread events from
    // the proxy to here via a callback.
    handle.registerForStorageEvents {
      // TODO(b/159257058): for write-only handles, only allow 'ready' events
      if (canRead || it == StorageEvent.READY) {
        notify(it, handle, onError)
      }
    }
  }

  /**
   * Performs the startup lifecycle on [particle].
   */
  suspend fun initParticle(scheduler: Scheduler) {
    withContext(scheduler.asCoroutineDispatcher()) {
      log.debug { "initParticle started" }

      check(particleState in ALLOWED_STATES_FOR_INIT) {
        "initParticle should not be called on a particle in state $particleState"
      }
      if (!particleState.hasBeenStarted) {
        try {
          particle.onFirstStart()
          particleState = ParticleState.FirstStart
        } catch (e: Exception) {
          throw markParticleAsFailed(e, "onFirstStart")
        }
      }
      try {
        particle.onStart()
        particleState = ParticleState.Waiting
      } catch (e: Exception) {
        throw markParticleAsFailed(e, "onStart")
      }

      log.debug { "initParticle finished" }
    }
  }

  /**
   * For write-only particles, immediately calls `onReady`, moves [particle] to
   * [ParticleState.Running] and fires the [notifyReady] callback.
   *
   * For particles with readable handles, triggers their underlying [StorageProxy] sync requests.
   * As each proxy is synced, [notify] will receive a [StorageEvent.READY] event; once all have
   * been received the particle is made ready as above.
   *
   * Returns a [Deferred] that will complete when the particle reaches [onReady], or throw an
   * exception if an exception occurs during execution of the [onReady] method for the particle.
   */
  suspend fun runParticleAsync(scheduler: Scheduler): Deferred<Unit> {
    val deferred = CompletableDeferred<Unit>()
    withContext(scheduler.asCoroutineDispatcher()) {
      log.debug { "runParticleAsync started" }

      when (particleState) {
        ParticleState.Running -> {
          log.debug { "runParticleAsync called for already running particle" }

          // If multiple particles read from the same StorageProxy, it is possible that
          // the proxy syncs and notifies READY before all the calls to runParticle are
          // invoked. In this case, the remaining particles may already be running.
          check(awaitingReady.isEmpty()) {
            "runParticleAsync called on an already running particle; awaitingReady should be " +
              "empty but still has ${awaitingReady.size} handles"
          }
          deferred.complete(Unit)
          return@withContext deferred
        }
        ParticleState.Waiting ->
          Unit
        else ->
          throw IllegalStateException(
            "runParticleAsync should not be called on a particle in state $particleState"
          )
      }

      check(pendingReadyDeferred == null) {
        "runParticleAsync called more than once on a waiting particle"
      }
      pendingReadyDeferred = deferred

      if (isWriteOnly) {
        moveToReady()
      } else {
        // Trigger the StorageProxy sync request for each readable handle. Once
        // the StorageEvent.READY notifications have all, been received, we can
        // call particle.onReady (handled by notify below).
        awaitingReady.forEach { it.maybeInitiateSync() }
      }

      log.debug { "runParticleAsync finished" }
    }
    return deferred
  }

  /**
   * Performs the shutdown lifecycle on [particle] and resets its handles.
   * This records exceptions from `onShutdown` but does not re-throw them.
   */
  suspend fun stopParticle(scheduler: Scheduler) {
    // Detach handle callbacks.
    // We want onShutdown to have access to the handles,
    // But this particle should never receive another `onUpdate`
    // callback from this point on.
    withContext(scheduler.asCoroutineDispatcher()) {
      particle.handles.detach()
    }

    // Execute the [onShutdown] method for each particle.
    //
    // We submit this next block as a separate scheduler task, so that
    // any storage events that got scheduled while the detach task above was queued
    // get processed. This guarantees that it will be safe to call handles.reset()
    // in this block without worrying about any latent storage events attempting to run
    // and access the now-null handle.
    withContext(scheduler.asCoroutineDispatcher()) {
      try {
        particle.onShutdown()
        particleState = ParticleState.Stopped
      } catch (e: Exception) {
        markParticleAsFailed(e, "onShutdown")
      }
      particle.handles.reset()
    }
  }

  /**
   * Called by [StorageProxy] (via the callback in [registerHandle]) when it receives storage
   * events. This is responsible for driving the particle lifecycle API after startup and
   * managing the running particle state.
   *
   * Write-only particles should not receive any of these events.
   *
   * This will be executed in the context of the StorageProxy's scheduler.
   */
  fun notify(event: StorageEvent, handle: Handle, onError: (Exception) -> Unit = {}) {
    log.debug { "received StorageEvent.$event for handle $handle" }

    check(particleState in ALLOWED_STATES_FOR_NOTIFY) {
      "storage events should not be received in state $particleState"
    }

    try {
      when (event) {
        StorageEvent.READY -> {
          if (awaitingReady.remove(handle) && awaitingReady.isEmpty()) {
            moveToReady()
          }
        }
        StorageEvent.UPDATE -> {
          // On update event, only notify the particle about the update if there are no handles
          // awaiting ready.
          if (awaitingReady.isEmpty()) {
            particle.onUpdate()
          }
        }
        StorageEvent.DESYNC -> {
          // On desync event, only notify the particle about the desync if it's the first desync'd
          // handle.
          if (desyncedHandles.isEmpty()) {
            particleState = ParticleState.Desynced
            particle.onDesync()
          }
          desyncedHandles.add(handle)
        }
        StorageEvent.RESYNC -> {
          // On resync event, always notify the particle.. even if the particle wasn't yet aware of
          // a desync state.
          desyncedHandles.remove(handle)
          if (desyncedHandles.isEmpty()) {
            particle.onResync()
            particleState = ParticleState.Running
          }
        }
      }
    } catch (error: Exception) {
      particleState = ParticleState.failedWith(error)
      onError(error)
    }
  }

  private fun moveToReady() {
    log.debug { "moving to ready state" }
    try {
      particle.onReady()
      particleState = ParticleState.Running
      pendingReadyDeferred?.complete(Unit)
    } catch (e: Exception) {
      markParticleAsFailed(e, "onReady")
      pendingReadyDeferred?.completeExceptionally(e)
    } finally {
      pendingReadyDeferred = null
    }
  }

  private fun markParticleAsFailed(error: Exception, eventName: String): Exception {
    // TODO(b/160251910): Make logging detail more cleanly conditional.
    log.debug(error) { "Failure in particle ${planParticle.particleName}.$eventName()" }
    log.info { "Failure in particle." }

    if (particleState != ParticleState.MaxFailed) {
      consecutiveFailureCount++
      particleState = when {
        consecutiveFailureCount > MAX_CONSECUTIVE_FAILURES ->
          ParticleState.maxFailedWith(error)
        particleState.hasBeenStarted -> ParticleState.failedWith(error)
        else -> ParticleState.failedNeverStartedWith(error)
      }
    }
    return error
  }

  companion object {
    private val ALLOWED_STATES_FOR_INIT = arrayOf(
      ParticleState.Instantiated,
      ParticleState.Stopped,
      ParticleState.Failed,
      ParticleState.Failed_NeverStarted
    )

    private val ALLOWED_STATES_FOR_NOTIFY = arrayOf(
      ParticleState.Waiting,
      ParticleState.Running,
      ParticleState.Desynced
    )
  }
}
