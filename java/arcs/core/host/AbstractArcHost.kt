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

import arcs.core.analytics.Analytics
import arcs.core.common.ArcId
import arcs.core.data.Capabilities
import arcs.core.data.Capability.Shareable
import arcs.core.data.EntitySchemaProviderType
import arcs.core.data.Plan
import arcs.core.data.Schema
import arcs.core.entity.Entity
import arcs.core.entity.ForeignReferenceChecker
import arcs.core.entity.ForeignReferenceCheckerImpl
import arcs.core.entity.Handle
import arcs.core.entity.HandleSpec
import arcs.core.host.api.HandleHolder
import arcs.core.host.api.Particle
import arcs.core.storage.StorageEndpointManager
import arcs.core.storage.StorageKey
import arcs.core.util.LruCacheMap
import arcs.core.util.Scheduler
import arcs.core.util.TaggedLog
import arcs.core.util.Time
import arcs.core.util.guardedBy
import arcs.core.util.withTaggedTimeout
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.cancel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlin.coroutines.CoroutineContext

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
 * @property initialParticles The initial set of [Particle]s that this host contains.
 */
@OptIn(ExperimentalCoroutinesApi::class)
abstract class AbstractArcHost(
  /**
   * This coroutineContext is used to create a [CoroutineScope] that will be used to launch
   * Arc resurrection jobs and shut down the Arc when errors occur in different contexts.
   */
  coroutineContext: CoroutineContext,
  /**
   * When arc states change, the state changes are serialized to handles. This serialization will
   * happen asynchronously from the state change operation, on the [CoroutineContext] provided
   * here.
   */
  updateArcHostContextCoroutineContext: CoroutineContext,
  protected val schedulerProvider: SchedulerProvider,
  /**
   * The [StorageEndpointManager] this [ArcHost] will use to create handles.
   */
  protected val storageEndpointManager: StorageEndpointManager,
  private val analytics: Analytics? = null,
  private val foreignReferenceChecker: ForeignReferenceChecker = ForeignReferenceCheckerImpl(
    emptyMap()
  ),
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
  private val auxillaryScope = CoroutineScope(coroutineContext)

  open val serializationEnabled = true

  /**
   * Time limit in milliseconds for all particles to reach the Running state during startup.
   * Public and mutable for testing.
   * TODO(mykmartin): use a better approach for this; companion object causes build issues,
   *                  ctor argument is awkward to use in individual tests
   */
  var particleStartupTimeoutMs = 60_000L

  /**
   * Supports asynchronous [ArcHostContext] serializations in observed order.
   *
   * TODO:
   * make the channel per-Arc instead of per-Host for better serialization
   * performance under multiple running and to-be-run Arcs.
   */
  private val contextSerializationChannel: Channel<suspend () -> Unit> =
    Channel(Channel.UNLIMITED)
  private val contextSerializationJob = serializationEnabled?.let {
    CoroutineScope(updateArcHostContextCoroutineContext).launch {
      for (task in contextSerializationChannel) task()
    }
  }

  init {
    initialParticles.toList().associateByTo(particleConstructors, { it.first }, { it.second })
  }

  /** Wait until all observed context serializations got flushed. */
  private suspend fun drainSerializations() {
    if (!contextSerializationChannel.isClosedForSend) {
      val deferred = CompletableDeferred<Boolean>()
      contextSerializationChannel.send { deferred.complete(true) }
      deferred.await()
    }
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
    drainSerializations()
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
    drainSerializations()
  }

  override suspend fun shutdown() {
    pause()
    runningMutex.withLock { runningArcs.clear() }
    clearContextCache()
    pausedArcs.clear()
    contextSerializationChannel.cancel()
    auxillaryScope.cancel()
    schedulerProvider.cancelAll()
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
    drainSerializations()
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
  ): ArcHostContext = getContextCache(arcId) ?: readContextFromStorage(
    createArcHostContext(arcId)
  )

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
    lookupOrCreateArcHostContext(registration.arcId()).remoteOnArcStateChange(registration)
  }

  /**
   * Called to persist [ArcHostContext] after [context] for [arcId] has been modified.
   */
  protected suspend fun updateArcHostContext(arcId: String, runningArc: RunningArc) {
    val context = runningArc.context
    putContextCache(arcId, context)
    writeContextToStorage(arcId, context)
    runningMutex.withLock {
      if (context.arcState == ArcState.Running) {
        runningArcs[arcId] = runningArc
      } else {
        runningArcs.remove(arcId)
      }
    }
  }

  /**
   * Creates a specialized [ArcHostContextParticle] used for serializing [ArcHostContext] state
   * to storage.
   */
  private suspend fun createArcHostContextParticle(
    arcHostContext: ArcHostContext
  ): ArcHostContextParticle {
    val handleManager = entityHandleManager("$hostId-${arcHostContext.arcId}")

    return ArcHostContextParticle(hostId, handleManager, this::instantiateParticle).apply {
      val partition = createArcHostContextPersistencePlan(
        arcHostContextCapability,
        arcHostContext.arcId
      )
      partition.particles[0].handles.forEach { handleSpec ->
        createHandle(
          handleManager,
          handleSpec.key,
          handleSpec.value,
          handles,
          this.toString(),
          true,
          (handleSpec.value.handle.type as? EntitySchemaProviderType)?.entitySchema
        )
      }
    }
  }

  /**
   * Deserializes [ArcHostContext] from [Entity] types read from storage by
   * using [ArcHostContextParticle].
   *
   * Subclasses may override this to retrieve the [ArcHostContext] using a different implementation.
   *
   * @property arcHostContext a prototype for the final arcHost containing [EntityHandleManager]
   */
  protected open suspend fun readContextFromStorage(
    arcHostContext: ArcHostContext
  ): ArcHostContext {
    if (!serializationEnabled) return arcHostContext

    val particle = createArcHostContextParticle(arcHostContext)
    val readContext = particle.readArcHostContext(arcHostContext)

    readContext?.let { putContextCache(arcHostContext.arcId, it) }

    return readContext ?: arcHostContext
  }

  /**
   * Serializes [ArcHostContext] into [Entity] types generated by 'schema2kotlin', and
   * use [ArcHostContextParticle] to write them to storage under the given [arcId].
   *
   * Subclasses may override this to store the [context] using a different implementation.
   */
  private suspend fun writeContextToStorageInternal(arcId: String, context: ArcHostContext) {
    try {
      /** TODO: reuse [ArcHostContextParticle] instances if possible. */
      createArcHostContextParticle(context).run {
        writeArcHostContext(context.arcId, context)
      }
    } catch (e: Exception) {
      log.info { "Error serializing Arc" }
      log.debug(e) {
        """
                Error serializing $arcId, restart will reinvoke Particle.onFirstStart()
        """.trimIndent()
      }
    }
  }

  /** Serializes [ArcHostContext] onto storage asynchronously or synchronously as fall-back. */
  protected open suspend fun writeContextToStorage(arcId: String, context: ArcHostContext) {
    if (!serializationEnabled) return

    if (!contextSerializationChannel.isClosedForSend) {
      /** Serialize the [context] to storage in observed order asynchronously. */
      contextSerializationChannel.send {
        writeContextToStorageInternal(
          arcId,
          ArcHostContext(
            context.arcId,
            context.particles,
            context.arcState
          )
        )
      }
    } else {
      /** fall back to synchronous serialization. */
      writeContextToStorageInternal(arcId, context)
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
        context.particles[idx] = particleContext
      } else {
        context.particles.add(particleContext)
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
    spec.handles.forEach { (handleName, handleConnection) ->
      val handle = createHandle(
        runningArc.handleManager,
        handleName,
        handleConnection,
        particle.handles,
        particle.toString(),
        immediateSync = false,
        storeSchema = (
          handleConnection.handle.type as? EntitySchemaProviderType
          )?.entitySchema
      )
      val onError: (Exception) -> Unit = { error ->
        context.arcState = ArcState.errorWith(error)
        auxillaryScope.launch {
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

  /**
   * Given a handle name, a [Plan.HandleConnection], and a [HandleHolder] construct an Entity
   * [Handle] of the right type.
   *
   * [particleId] is meant to be a namespace for the handle, wherein handle callbacks will be
   * triggered according to the rules of the [Scheduler].
   */
  protected suspend fun createHandle(
    handleManager: HandleManager,
    handleName: String,
    connectionSpec: Plan.HandleConnection,
    holder: HandleHolder,
    particleId: String = "",
    immediateSync: Boolean = true,
    storeSchema: Schema? = null
  ): Handle {
    val handleSpec = HandleSpec(
      handleName,
      connectionSpec.mode,
      connectionSpec.type,
      holder.getEntitySpecs(handleName)
    )
    return handleManager.createHandle(
      handleSpec,
      connectionSpec.storageKey,
      connectionSpec.ttl,
      particleId,
      immediateSync,
      storeSchema
    ).also { holder.setHandle(handleName, it) }
  }

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

  /**
   * Until Kotlin Multiplatform adds a common API for retrieving time, each platform that
   * implements an [ArcHost] needs to supply an implementation of the [Time] interface.
   */
  abstract val platformTime: Time

  open val arcHostContextCapability = Capabilities(Shareable(true))

  override suspend fun isHostForParticle(particle: Plan.Particle) =
    registeredParticles().contains(ParticleIdentifier.from(particle.location))

  /**
   * Return an instance of [EntityHandleManager] to be used to create [Handle]s.
   */
  open fun entityHandleManager(arcId: String): HandleManager = EntityHandleManager(
    arcId = arcId,
    hostId = hostId,
    time = platformTime,
    scheduler = schedulerProvider(arcId),
    storageEndpointManager = storageEndpointManager,
    analytics = analytics,
    foreignReferenceChecker = foreignReferenceChecker
  )

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
