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

import arcs.core.common.ArcId
import arcs.core.data.Plan
import arcs.core.entity.Handle
import arcs.core.host.api.Particle
import arcs.core.storage.StorageKey
import arcs.core.util.LruCacheMap
import arcs.core.util.Scheduler
import arcs.core.util.TaggedLog
import arcs.core.util.guardedBy
import arcs.core.util.withTaggedTimeout
import kotlin.coroutines.CoroutineContext
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

typealias ParticleConstructor = suspend (Plan.Particle?) -> Particle
typealias ParticleRegistration = Pair<ParticleIdentifier, ParticleConstructor>

/**
 * Base helper class for [ArcHost] implementations.
 *
 * Subclasses of [AbstractArcHost] may provide  platform dependent functionality such as for
 * (JS, Android, WASM). Another type of [ArcHost] are those specialized for different
 * [Particle] execution environments within a platform such as isolatable [ArcHosts] (dev-mode
 * and prod-mode), ArcHosts embedded into Android Services, and remote ArcHosts which run on
 * other devices.
 *
 * @property handleManagerFactory An object that builds [HandleManager]s.
 * @property arcHostContextSerializer Serializing [ArcHostContext]s, often for storage. By default,
 *   it will not serialize.
 * @param initialParticles The initial set of [Particle]s that this host contains.
 */
@OptIn(ExperimentalCoroutinesApi::class)
abstract class AbstractArcHost(
  /**
   * This coroutineContext is used to create a [CoroutineScope] that will be used to launch
   * Arc resurrection jobs and shut down the Arc when errors occur in different contexts.
   */
  coroutineContext: CoroutineContext,
  private val handleManagerFactory: HandleManagerFactory,
  private val arcHostContextSerializer: ArcHostContextSerializer = NoOpArcHostContextSerializer(),
  vararg initialParticles: ParticleRegistration
) : ArcHost {
  private val log = TaggedLog { "AbstractArcHost" }

  private val particleConstructors: MutableMap<ParticleIdentifier, ParticleConstructor> =
    mutableMapOf()

  private val cacheMutex = Mutex()

  /** In memory cache of [ArcHostContext] state. */
  private val contextCache: MutableMap<String, ArcHostContext> by guardedBy(
    cacheMutex,
    LruCacheMap()
  )

  private val runningMutex = Mutex()

  /** Arcs currently running in memory. */
  private val runningArcs: MutableMap<String, RunningArc> by guardedBy(
    runningMutex,
    mutableMapOf()
  )

  private var paused = atomic(false)

  /** Arcs to be started after unpausing. */
  private val pausedArcs: MutableList<Plan.Partition> = mutableListOf()

  // There can be more then one instance of a host, hashCode is used to disambiguate them.
  override val hostId = "${this.hashCode()}"

  // TODO: add lifecycle API for ArcHosts shutting down to cancel running coroutines
  private val auxiliaryScope = CoroutineScope(coroutineContext)

  /**
   * Time limit in milliseconds for all particles to reach the Running state during startup.
   * Public and mutable for testing.
   * TODO(mykmartin): use a better approach for this; companion object causes build issues,
   *                  ctor argument is awkward to use in individual tests
   */
  var particleStartupTimeoutMs = 60_000L

  init {
    initialParticles.toList().associateByTo(particleConstructors, { it.first }, { it.second })
  }

  private suspend fun putContextCache(id: String, context: ArcHostContext) = cacheMutex.withLock {
    contextCache[id] = context
  }

  private suspend fun clearContextCache() = cacheMutex.withLock {
    contextCache.clear()
  }

  private suspend fun removeContextCache(arcId: String) = cacheMutex.withLock {
    contextCache.remove(arcId)
  }

  private suspend fun getContextCache(arcId: String) = cacheMutex.withLock {
    contextCache[arcId]
  }

  /**
   * Determines if [arcId] is currently running. It's state must be [ArcState.Running] and
   * it must be memory resident (not serialized and dormant).
   */
  private suspend fun isRunning(arcId: String) =
    runningMutex.withLock { runningArcs[arcId]?.context?.arcState == ArcState.Running }

  /**
   * Lookup the [ArcHostContext] associated with the [ArcId] in [partition] and return its
   * [ArcState].
   **/
  override suspend fun lookupArcHostStatus(partition: Plan.Partition) =
    lookupOrCreateArcHostContext(partition.arcId).arcState

  override suspend fun pause() {
    if (!paused.compareAndSet(false, true)) {
      return
    }

    val running = runningMutex.withLock { runningArcs.toMap() }
    running.forEach { (arcId, runningArc) ->
      try {
        val partition = contextToPartition(arcId, runningArc.context)
        stopArc(partition)
        pausedArcs.add(partition)
      } catch (e: Exception) {
        // TODO(b/160251910): Make logging detail more cleanly conditional.
        log.debug(e) { "Failure stopping arc." }
        log.info { "Failure stopping arc." }
      }
    }

    /** Wait until all [runningArcs] are stopped and their [ArcHostContext]s are serialized. */
    arcHostContextSerializer.drainSerializations()
  }

  override suspend fun unpause() {
    if (!paused.compareAndSet(true, false)) {
      return
    }

    pausedArcs.forEach {
      try {
        startArc(it)
      } catch (e: Exception) {
        // TODO(b/160251910): Make logging detail more cleanly conditional.
        log.debug(e) { "Failure starting arc." }
        log.info { "Failure starting arc." }
      }
    }
    pausedArcs.clear()

    /**
     * Wait until all [pausedArcs]s are started or resurrected and
     * their [ArcHostContext]s are serialized.
     */
    arcHostContextSerializer.drainSerializations()
  }

  override suspend fun shutdown() {
    pause()
    runningMutex.withLock { runningArcs.clear() }
    clearContextCache()
    pausedArcs.clear()
    arcHostContextSerializer.cancel()
    auxiliaryScope.cancel()
    handleManagerFactory.cancel()
  }

  /**
   * This property is true if this [ArcHost] has no running, memory resident arcs, e.g.
   * running [Particle]s with active connected [Handle]s.
   */
  protected suspend fun isArcHostIdle() = runningMutex.withLock { runningArcs.isEmpty() }

  override suspend fun waitForArcIdle(arcId: String) {
    while (true) {
      getRunningArc(arcId)?.handleManager?.allStorageProxies()?.forEach { it.waitForIdle() }
      if (arcIsIdle(arcId)) {
        return
      }
    }
  }

  /**
   * Returns whether or not the arc for a given [arcId] is idle. If the arc is not currently
   * running, or doesn't exist at all, this method will return true.
   */
  suspend fun arcIsIdle(arcId: String) = getRunningArc(arcId)
    ?.handleManager
    ?.allStorageProxies()
    ?.all { it.isIdle() }
    ?: true

  // VisibleForTesting
  suspend fun clearCache() {
    // Ensure all contexts are flushed onto storage prior to clear context cache.
    arcHostContextSerializer.drainSerializations()
    clearContextCache()
    runningMutex.withLock {
      runningArcs.clear()
    }
  }

  /** Used by subclasses to register particles dynamically after [ArcHost] construction */
  protected fun registerParticle(particle: ParticleIdentifier, constructor: ParticleConstructor) {
    particleConstructors.put(particle, constructor)
  }

  /** Used by subclasses to unregister particles dynamically after [ArcHost] construction. */
  protected fun unregisterParticle(particle: ParticleIdentifier) {
    particleConstructors.remove(particle)
  }

  /** Returns a list of all [ParticleIdentifier]s this [ArcHost] can instantiate. */
  override suspend fun registeredParticles(): List<ParticleIdentifier> =
    particleConstructors.keys.toList()

  // VisibleForTesting
  protected suspend fun getArcHostContext(arcId: String) = getContextCache(arcId)

  protected suspend fun lookupOrCreateArcHostContext(
    arcId: String
  ): ArcHostContext = getContextCache(arcId) ?: arcHostContextSerializer.readContextFromStorage(
    createArcHostContext(arcId),
    hostId
  ).also {
    putContextCache(arcId, it)
  }

  suspend fun getRunningArc(arcId: String) = runningMutex.withLock {
    runningArcs[arcId]
  }

  suspend fun removeRunningArc(arcId: String) = runningMutex.withLock {
    runningArcs.remove(arcId)
  }

  private fun createArcHostContext(arcId: String) = ArcHostContext(
    arcId = arcId
  )

  override suspend fun addOnArcStateChange(
    arcId: ArcId,
    block: ArcStateChangeCallback
  ): ArcStateChangeRegistration {
    val registration = ArcStateChangeRegistration(arcId, block)
    val context = lookupOrCreateArcHostContext(arcId.toString())
    return context.addOnArcStateChange(
      registration,
      block
    ).also {
      block(arcId, context.arcState)
    }
  }

  override suspend fun removeOnArcStateChange(registration: ArcStateChangeRegistration) {
    lookupOrCreateArcHostContext(registration.arcId()).removeOnArcStateChange(registration)
  }

  /**
   * Called to persist [ArcHostContext] after [context] for [arcId] has been modified.
   */
  protected suspend fun updateArcHostContext(arcId: String, runningArc: RunningArc) {
    val context = runningArc.context
    putContextCache(arcId, context)
    arcHostContextSerializer.writeContextToStorage(context, hostId)
    runningMutex.withLock {
      if (context.arcState == ArcState.Running) {
        runningArcs[arcId] = runningArc
      } else {
        runningArcs.remove(arcId)
      }
    }
  }

  override suspend fun startArc(partition: Plan.Partition) {
    val runningArc = getRunningArc(partition.arcId) ?: run {
      val context = lookupOrCreateArcHostContext(partition.arcId)
      RunningArc(context, entityHandleManager(partition.arcId))
    }

    val context = runningArc.context

    if (paused.value) {
      pausedArcs.add(partition)
      return
    }

    // If the arc is already running or has been deleted, don't restart it.
    // TODO: Ensure this can't race once arcs are actually moved to the Deleted state
    if (isRunning(partition.arcId) || context.arcState == ArcState.Deleted) {
      return
    }

    for (idx in 0 until partition.particles.size) {
      val particleSpec = partition.particles[idx]
      val existingParticleContext = context.particles.elementAtOrNull(idx)
      val particleContext =
        setUpParticleAndHandles(partition, particleSpec, existingParticleContext, runningArc)
      if (context.particles.size > idx) {
        context.setParticle(idx, particleContext)
      } else {
        context.addParticle(particleContext)
      }
      if (particleContext.particleState.failed) {
        context.arcState = ArcState.errorWith(particleContext.particleState.cause)
        break
      }
    }

    // Get each particle running.
    if (context.arcState != ArcState.Error) {
      try {
        performParticleStartup(context.particles, runningArc.handleManager.scheduler())

        // TODO(b/164914008): Exceptions in handle lifecycle methods are caught on the
        // StorageProxy scheduler context, then communicated here via the callback attached with
        // setErrorCallbackForHandleEvents in setUpParticleAndHandles. Unfortunately that doesn't
        // prevent the startup process continuing (i.e. the awaiting guard in performParticleStartup
        // will still be completed), so we need to check for the error state here as well. The
        // proposed lifecycle refactor should make this much cleaner.
        if (context.arcState != ArcState.Error) {
          context.arcState = ArcState.Running

          // If the platform supports resurrection, request it for this Arc's StorageKeys
          maybeRequestResurrection(context)
        }
      } catch (e: Exception) {
        context.arcState = ArcState.errorWith(e)
        // TODO(b/160251910): Make logging detail more cleanly conditional.
        log.debug(e) { "Failure performing particle startup." }
        log.info { "Failure performing particle startup." }
      }
    } else {
      stopArc(partition)
    }

    updateArcHostContext(partition.arcId, runningArc)
  }

  /**
   * Instantiates a [Particle] by looking up an associated [ParticleConstructor], allocates
   * all of the [Handle]s connected to it, and returns a [ParticleContext] indicating the
   * current lifecycle state of the particle.
   */
  protected suspend fun setUpParticleAndHandles(
    partition: Plan.Partition,
    spec: Plan.Particle,
    existingParticleContext: ParticleContext?,
    runningArc: RunningArc
  ): ParticleContext {
    val context = runningArc.context
    val particle = instantiateParticle(ParticleIdentifier.from(spec.location), spec)

    val particleContext = existingParticleContext?.copyWith(particle)
      ?: ParticleContext(particle, spec)

    if (particleContext.particleState == ParticleState.MaxFailed) {
      // Don't try recreating the particle anymore.
      return particleContext
    }

    // Create the handles and register them with the ParticleContext. On construction, readable
    // handles notify their underlying StorageProxy's that they will be synced at a later
    // time by the ParticleContext state machine.
    particle.createAndSetHandles(runningArc.handleManager, spec, immediateSync = false)
      .forEach { handle ->
        val onError: (Exception) -> Unit = { error ->
          context.arcState = ArcState.errorWith(error)
          auxiliaryScope.launch {
            stopArc(partition)
          }
        }
        particleContext.registerHandle(handle, onError)
        handle.getProxy().setErrorCallbackForHandleEvents(onError)
      }

    return particleContext
  }

  /**
   * Invokes the [Particle] startup lifecycle methods and waits until all particles
   * have reached the Running state.
   */
  private suspend fun performParticleStartup(
    particleContexts: Collection<ParticleContext>,
    scheduler: Scheduler
  ) {
    if (particleContexts.isEmpty()) return

    // Call the lifecycle startup methods.
    particleContexts.forEach { it.initParticle(scheduler) }

    val awaiting = particleContexts.map { it.runParticleAsync(scheduler) }
    withTaggedTimeout(particleStartupTimeoutMs, { "waiting for all particles to be ready" }) {
      awaiting.awaitAll()
    }
  }

  /**
   * Lookup [StorageKey]s used in the current [ArcHostContext] and potentially register them
   * with a [ResurrectorService], so that this [ArcHost] is instructed to automatically
   * restart in the event of a crash.
   */
  protected open fun maybeRequestResurrection(context: ArcHostContext) = Unit

  /**
   * Inform [ResurrectorService] to cancel requests for resurrection for the [StorageKey]s in
   * this [ArcHostContext].
   */
  protected open fun maybeCancelResurrection(context: ArcHostContext) = Unit

  /** Helper used by implementors of [ResurrectableHost]. */
  @Suppress("UNUSED_PARAMETER")
  suspend fun onResurrected(arcId: String, affectedKeys: List<StorageKey>) {
    if (isRunning(arcId)) {
      return
    }
    val context = lookupOrCreateArcHostContext(arcId)
    val partition = contextToPartition(arcId, context)
    startArc(partition)
  }

  private fun contextToPartition(arcId: String, context: ArcHostContext) =
    Plan.Partition(
      arcId,
      hostId,
      context.particles.map { it.planParticle }
    )

  override suspend fun stopArc(partition: Plan.Partition) {
    val arcId = partition.arcId
    removeRunningArc(arcId)?.let { runningArc ->
      when (runningArc.context.arcState) {
        ArcState.Running, ArcState.Indeterminate -> stopArcInternal(arcId, runningArc)
        ArcState.NeverStarted -> stopArcError(runningArc, "Arc $arcId was never started")
        ArcState.Stopped -> stopArcError(runningArc, "Arc $arcId already stopped")
        ArcState.Deleted -> stopArcError(runningArc, "Arc $arcId is deleted.")
        ArcState.Error -> stopArcError(runningArc, "Arc $arcId encountered an error.")
      }
    }
  }

  /**
   * If an attempt to [ArcHost.stopArc] fails, this method should report the error message.
   * For example, throw an exception or log.
   */
  @Suppress("UNUSED_PARAMETER", "RedundantSuspendModifier")
  private suspend fun stopArcError(runningArc: RunningArc, message: String) {
    log.debug { "Error stopping arc: $message" }
    val context = runningArc.context
    try {
      runningArc.context.particles.forEach {
        try {
          it.stopParticle(runningArc.handleManager.scheduler())
        } catch (e: Exception) {
          log.debug(e) { "Error stopping particle $it" }
        }
      }
      maybeCancelResurrection(context)
      updateArcHostContext(context.arcId, runningArc)
    } finally {
      removeContextCache(context.arcId)
      runningArc.handleManager.close()
    }
  }

  /**
   * Stops an [Arc], stopping all running [Particle]s, cancelling pending resurrection requests,
   * releasing [Handle]s, and modifying [ArcState] and [ParticleState] to stopped states.
   */
  private suspend fun stopArcInternal(arcId: String, runningArc: RunningArc) {
    val context = runningArc.context
    try {
      context.particles.forEach { it.stopParticle(runningArc.handleManager.scheduler()) }
      maybeCancelResurrection(context)
      context.arcState = ArcState.Stopped
      updateArcHostContext(arcId, runningArc)
    } finally {
      runningArc.handleManager.close()
    }
  }

  override suspend fun isHostForParticle(particle: Plan.Particle) =
    registeredParticles().contains(ParticleIdentifier.from(particle.location))

  /**
   * Return an instance of [HandleManagerImpl] to be used to create [Handle]s.
   */
  fun entityHandleManager(arcId: String): HandleManager =
    handleManagerFactory.build(arcId, hostId)

  /**
   * Instantiate a [Particle] implementation for a given [ParticleIdentifier].
   *
   * @property identifier a [ParticleIdentifier] from a [Plan.Particle] spec
   */
  open suspend fun instantiateParticle(
    identifier: ParticleIdentifier,
    spec: Plan.Particle?
  ): Particle {
    return particleConstructors[identifier]?.invoke(spec)
      ?: throw IllegalArgumentException("Particle $identifier not found.")
  }

  /**
   * A simple structure that combines the [ArcHostContext] of an Arc with its active
   * [HandleManager], resident in memory. These are maintained in the `residentArcs` structure.
   */
  class RunningArc(
    val context: ArcHostContext,
    val handleManager: HandleManager
  )
}
