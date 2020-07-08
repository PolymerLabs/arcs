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
import arcs.core.data.Capabilities
import arcs.core.data.Capability.Shareable
import arcs.core.data.Plan
import arcs.core.entity.Entity
import arcs.core.entity.Handle
import arcs.core.entity.HandleSpec
import arcs.core.host.api.HandleHolder
import arcs.core.host.api.Particle
import arcs.core.storage.ActivationFactory
import arcs.core.storage.StorageKey
import arcs.core.storage.StoreManager
import arcs.core.util.LruCacheMap
import arcs.core.util.Scheduler
import arcs.core.util.TaggedLog
import arcs.core.util.Time
import arcs.core.util.guardedBy
import kotlinx.atomicfu.atomic
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withTimeout

/** Time limit in milliseconds for all particles to reach the Running state during startup. */
const val PARTICLE_STARTUP_TIMEOUT_MS = 60_000L

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
@ExperimentalCoroutinesApi
abstract class AbstractArcHost(
    protected val coroutineContext: CoroutineContext = Dispatchers.Default,
    protected val schedulerProvider: SchedulerProvider,
    open val activationFactory: ActivationFactory? = null,
    vararg initialParticles: ParticleRegistration
) : ArcHost {

    constructor(
        schedulerProvider: SchedulerProvider,
        vararg initialParticles: ParticleRegistration
    ) : this(Dispatchers.Default, schedulerProvider, null, *initialParticles)

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
    private val runningArcs: MutableMap<String, ArcHostContext> by guardedBy(
        runningMutex,
        mutableMapOf()
    )

    private var paused = atomic(false)

    /** Arcs to be started after unpausing. */
    private val pausedArcs: MutableList<Plan.Partition> = mutableListOf()

    // There can be more then one instance of a host, hashCode is used to disambiguate them
    override val hostId = "${this::class.className()}@${this.hashCode()}"

    // TODO: add lifecycle API for ArcHosts shutting down to cancel running coroutines
    private val scope = CoroutineScope(coroutineContext)

    init {
        initialParticles.toList().associateByTo(particleConstructors, { it.first }, { it.second })
    }

    private suspend fun putContextCache(id: String, context: ArcHostContext) = cacheMutex.withLock {
        contextCache[id] = context
    }

    private suspend fun clearContextCache() = cacheMutex.withLock {
        contextCache.clear()
    }

    private suspend fun getContextCache(arcId: String) = cacheMutex.withLock {
        contextCache[arcId]
    }

    /**
     * Determines if [arcId] is currently running. It's state must be [ArcState.Running] and
     * it must be memory resident (not serialized and dormant).
     */
    protected fun isRunning(arcId: String) = runBlocking {
        runningMutex.withLock { runningArcs[arcId]?.arcState == ArcState.Running }
    }

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
        running.forEach { (arcId, context) ->
            try {
                val partition = contextToPartition(arcId, context)
                stopArc(partition)
                pausedArcs.add(partition)
            } catch (e: Exception) {
                // TODO(b/160251910): Make logging detail more cleanly conditional.
                log.debug(e) { "Failure stopping arc." }
                log.info { "Failure stopping arc." }
            }
        }
    }

    override suspend fun unpause() {
        if (!paused.compareAndSet(true, false)) {
            return
        }

        stores.reset()

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
    }

    override suspend fun shutdown() {
        pause()
        runningMutex.withLock { runningArcs.clear() }
        clearContextCache()
        pausedArcs.clear()
        scope.cancel()
        schedulerProvider.cancelAll()
    }

    /**
     * This property is true if this [ArcHost] has no running, memory resident arcs, e.g.
     * running [Particle]s with active connected [Handle]s.
     */
    protected val isArcHostIdle = runBlocking {
        runningMutex.withLock { runningArcs.isEmpty() }
    }

    // VisibleForTesting
    protected fun clearCache() {
        runBlocking {
            clearContextCache()
            runningMutex.withLock {
                runningArcs.clear()
            }
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
    protected fun getArcHostContext(arcId: String) = runBlocking {
        getContextCache(arcId)
    }

    protected suspend fun lookupOrCreateArcHostContext(
        arcId: String
    ): ArcHostContext = getContextCache(arcId) ?: readContextFromStorage(
        createArcHostContext(arcId)
    )

    private fun createArcHostContext(arcId: String) = ArcHostContext(
        arcId = arcId,
        entityHandleManager = entityHandleManager(arcId)
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

    private fun setArcState(context: ArcHostContext, state: ArcState) {
        context.arcState = state
    }

    /**
     * Called to persist [ArcHostContext] after [context] for [arcId] has been modified.
     */
    protected suspend fun updateArcHostContext(arcId: String, context: ArcHostContext) {
        putContextCache(arcId, context)
        runningMutex.withLock {
            writeContextToStorage(arcId, context)
            if (context.arcState == ArcState.Running) {
                runningArcs[arcId] = context
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
                    this.toString()
                )
            }
        }
    }

    /**
     * Deserializes [ArcHostContext] from [Entity] types read from storage by
     * using [ArcHostContextParticle].
     *
     * Subclasses may override this to retrieve the [context] using a different implementation.
     *
     * @property arcHostContext a prototype for the final arcHost containing [EntityHandleManager]
     */
    protected open suspend fun readContextFromStorage(
        arcHostContext: ArcHostContext
    ): ArcHostContext =
        createArcHostContextParticle(arcHostContext)
            .readArcHostContext(arcHostContext)
            ?.also { putContextCache(arcHostContext.arcId, it) } ?: arcHostContext

    /**
     * Serializes [ArcHostContext] into [Entity] types generated by 'schema2kotlin', and
     * use [ArcHostContextParticle] to write them to storage under the given [arcId].
     *
     * Subclasses may override this to store the [context] using a different implementation.
     */
    protected open suspend fun writeContextToStorage(arcId: String, context: ArcHostContext) =
        createArcHostContextParticle(context).run {
            writeArcHostContext(context.arcId, context)
        }

    override suspend fun startArc(partition: Plan.Partition) {
        val context = lookupOrCreateArcHostContext(partition.arcId)

        if (paused.value) {
            pausedArcs.add(partition)
            return
        }

        // If the arc is already running or has been deleted, don't restart it.
        // TODO: Ensure this can't race once arcs are actually moved to the Deleted state
        if (isRunning(partition.arcId) || context.arcState == ArcState.Deleted) {
            return
        }

        // Instantiate each particle and its handles in a ParticleContext.
        for (particleSpec in partition.particles) {
            val particleContext = setUpParticleAndHandles(particleSpec, context)
            context.particles[particleSpec.particleName] = particleContext
            if (particleContext.particleState.failed) {
                context.arcState = ArcState.Error
                break
            }
        }

        // Get each particle running.
        if (context.arcState != ArcState.Error) {
            try {
                performParticleStartup(context.particles.values)
                context.arcState = ArcState.Running

                // If the platform supports resurrection, request it for this Arc's StorageKeys
                maybeRequestResurrection(context)
            } catch (e: Exception) {
                // TODO: capture the exception in context?
                context.arcState = ArcState.Error
                // TODO(b/160251910): Make logging detail more cleanly conditional.
                log.debug(e) { "Failure performing particle startup." }
                log.info { "Failure performing particle startup." }
            }
        }

        updateArcHostContext(partition.arcId, context)
    }

    /**
     * Instantiates a [Particle] by looking up an associated [ParticleConstructor], allocates
     * all of the [Handle]s connected to it, and returns a [ParticleContext] indicating the
     * current lifecycle state of the particle.
     */
    protected suspend fun setUpParticleAndHandles(
        spec: Plan.Particle,
        context: ArcHostContext
    ): ParticleContext {
        val particle = instantiateParticle(ParticleIdentifier.from(spec.location), spec)

        val particleContext = lookupParticleContextOrCreate(
            context,
            spec,
            particle,
            schedulerProvider(context.arcId)
        )

        if (particleContext.particleState == ParticleState.MaxFailed) {
            // Don't try recreating the particle anymore.
            return particleContext
        }

        // Create the handles and register them with the ParticleContext. On construction, readable
        // handles notify their underlying StorageProxy's that they will be synced at a later
        // time by the ParticleContext state machine.
        spec.handles.forEach { (handleName, handleConnection) ->
            createHandle(
                context.entityHandleManager,
                handleName,
                handleConnection,
                particle.handles,
                particle.toString(),
                immediateSync = false
            ).also {
                particleContext.registerHandle(it)
            }
        }

        return particleContext
    }

    /**
     * Look up an existing [ParticleContext] in the current [ArcHostContext] if it exists for
     * the specified [Plan.Particle] and [Particle], otherwise create and initialize a new
     * [ParticleContext].
     */
    protected fun lookupParticleContextOrCreate(
        context: ArcHostContext,
        spec: Plan.Particle,
        particle: Particle,
        scheduler: Scheduler
    ) = context.particles[spec.particleName]?.copyWith(particle)
            ?: ParticleContext(particle, spec, scheduler)

    /**
     * Invokes the [Particle] startup lifecycle methods and waits until all particles
     * have reached the Running state.
     */
    private suspend fun performParticleStartup(particleContexts: Collection<ParticleContext>) {
        if (particleContexts.isEmpty()) return

        // Call the lifecycle startup methods.
        particleContexts.forEach { it.initParticle() }

        // Track the particles as they move to ParticleState.Running; once all have done so,
        // the arc itself can move to ArcState.Running.
        val readyGate = Job()
        val awaitingReady = particleContexts.map { it.particle }.toMutableSet()
        val notifyReady: (Particle) -> Unit = {
            if (awaitingReady.remove(it) && awaitingReady.isEmpty()) {
                readyGate.complete()
            }
        }

        // All particles have now received their startup events; move them to the running state.
        particleContexts.forEach { it.runParticle(notifyReady) }

        // Wait for the particles to get running.
        withTimeout(PARTICLE_STARTUP_TIMEOUT_MS) {
            readyGate.join()
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
    fun onResurrected(arcId: String, affectedKeys: List<StorageKey>) {
        scope.launch {
            if (isRunning(arcId)) {
                return@launch
            }
            val context = lookupOrCreateArcHostContext(arcId)
            val partition = contextToPartition(arcId, context)
            startArc(partition)
        }
    }

    private fun contextToPartition(arcId: String, context: ArcHostContext) =
        Plan.Partition(
            arcId,
            hostId,
            context.particles.map { (_, particleContext) ->
                particleContext.planParticle
            }
        )

    /**
     * Given a handle name, a [Plan.HandleConnection], and a [HandleHolder] construct an Entity
     * [Handle] of the right type.
     *
     * [particleId] is meant to be a namespace for the handle, wherein handle callbacks will be
     * triggered according to the rules of the [Scheduler].
     */
    protected suspend fun createHandle(
        handleManager: EntityHandleManager,
        handleName: String,
        connectionSpec: Plan.HandleConnection,
        holder: HandleHolder,
        particleId: String = "",
        immediateSync: Boolean = true
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
            immediateSync
        ).also { holder.setHandle(handleName, it) }
    }

    override suspend fun stopArc(partition: Plan.Partition) {
        val arcId = partition.arcId
        getContextCache(partition.arcId)?.let { context ->
            when (context.arcState) {
                ArcState.Running, ArcState.Indeterminate -> stopArcInternal(arcId, context)
                ArcState.NeverStarted -> stopArcError(context, "Arc $arcId was never started")
                ArcState.Stopped -> stopArcError(context, "Arc $arcId already stopped")
                ArcState.Deleted -> stopArcError(context, "Arc $arcId is deleted.")
                ArcState.Error -> stopArcError(context, "Arc $arcId encountered an error.")
            }
        }
    }

    /**
     * If an attempt to [ArcHost.stopArc] fails, this method should report the error message.
     * For example, throw an exception or log.
     */
    @Suppress("UNUSED_PARAMETER", "RedundantSuspendModifier")
    private suspend fun stopArcError(context: ArcHostContext, message: String) {
        // TODO: decide how to propagate this
        log.debug { "Error stopping arc: $message" }
    }

    /**
     * Stops an [Arc], stopping all running [Particle]s, cancelling pending resurrection requests,
     * releasing [Handle]s, and modifying [ArcState] and [ParticleState] to stopped states.
     */
    private suspend fun stopArcInternal(arcId: String, context: ArcHostContext) {
        try {
            context.particles.values.forEach { it.stopParticle() }
            maybeCancelResurrection(context)
            context.arcState = ArcState.Stopped
            updateArcHostContext(arcId, context)
        } finally {
            context.entityHandleManager.close()
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
    open fun entityHandleManager(arcId: String) = EntityHandleManager(
        arcId,
        hostId,
        platformTime,
        schedulerProvider(arcId),
        stores,
        coroutineContext = coroutineContext
    )

    /**
     * The map of [Store] objects that this [ArcHost] will use. By default, it uses a shared
     * singleton defined statically by this package.
     */
    open val stores = singletonStores

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

    companion object {
        /**
         * Shared [StoreManager] instance. This is used to share [Store]s among multiple [ArcHost]s or
         * even across different arcs. On Android, [StorageService] runs as a single process so all
         * [ArcHost]s share the same Storage layer and this singleton is not needed, but on other
         * platforms the [StoreManager] object provides Android-like functionality. If your platform
         * supports its own [Service]-level analogue like Android, override this method to return
         * a new instance each time.
         */
        val singletonStores = StoreManager()
    }
}
