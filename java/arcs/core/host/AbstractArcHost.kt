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

import arcs.core.data.Capabilities
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.Plan
import arcs.core.data.SingletonType
import arcs.core.entity.Handle
import arcs.core.host.api.HandleHolder
import arcs.core.host.api.Particle
import arcs.core.storage.ActivationFactory
import arcs.core.storage.StoreManager
import arcs.core.util.LruCacheMap
import arcs.core.util.TaggedLog
import arcs.core.util.Time

typealias ParticleConstructor = suspend () -> Particle
typealias ParticleRegistration = Pair<ParticleIdentifier, ParticleConstructor>

/** Maximum number of times a particle may fail to be started before giving up. */
const val MAX_CONSECUTIVE_FAILURES = 5

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
abstract class AbstractArcHost(vararg initialParticles: ParticleRegistration) : ArcHost {
    private val log = TaggedLog { "AbstractArcHost" }
    private val particleConstructors: MutableMap<ParticleIdentifier, ParticleConstructor> =
        mutableMapOf()
    /** In memory cache of [ArcHostContext] state. */
    private val contextCache: MutableMap<String, ArcHostContext> = LruCacheMap()

    /** Arcs currently running in memory. */
    private val runningArcs: MutableMap<String, ArcHostContext> = mutableMapOf()

    override val hostId = this::class.className()

    init {
        initialParticles.toList().associateByTo(particleConstructors, { it.first }, { it.second })
    }

    /**
     * Determines if [arcId] is currently running. It's state must be [ArcState.Running] and
     * it must be memory resident (not serialized and dormant).
     */
    protected fun isRunning(arcId: String) = runningArcs[arcId]?.arcState == ArcState.Running

    /**
     * This property is true if this [ArcHost] has no running, memory resident arcs, e.g.
     * running [Particle]s with active connected [Handle]s.
     */
    protected val isArcHostIdle = runningArcs.isEmpty()

    // VisibleForTesting
    protected fun clearCache() = contextCache.clear()

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
    protected fun getArcHostContext(arcId: String) = contextCache[arcId]

    protected suspend fun lookupOrCreateArcHostContext(
        partition: Plan.Partition
    ): ArcHostContext = contextCache[partition.arcId] ?: readContextFromStorage(
        createArcHostContext(partition.arcId)
    )

    private fun createArcHostContext(arcId: String) = ArcHostContext(
        arcId = arcId,
        entityHandleManager = entityHandleManager(arcId)
    )

    /**
     * Called to persist [ArcHostContext] after [context] for [arcId] has been modified.
     */
    protected suspend fun updateArcHostContext(arcId: String, context: ArcHostContext) {
        contextCache[arcId] = context
        writeContextToStorage(arcId, context)
        if (context.arcState == ArcState.Running) {
            runningArcs[arcId] = context
        } else {
            runningArcs.remove(arcId)
        }
    }

    /**
     * Creates a specialized [ArcHostContextParticle] used for serializing [ArcHostContext] state
     * to storage.
     */
    private suspend fun createArcHostContextParticle(arcHostContext: ArcHostContext) =
        ArcHostContextParticle().apply {
            val partition = createArcHostContextPersistencePlan(
                arcHostContextCapability,
                arcHostContext.arcId,
                hostId
            )
            partition.particles.get(0).handles.forEach { handleSpec ->
                createHandle(arcHostContext, handleSpec.key, handleSpec.value, handles)
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
    ): ArcHostContext = createArcHostContextParticle(arcHostContext).let {
        it.readArcHostContext(arcHostContext, hostId, this::instantiateParticle)
    }?.also {
        contextCache[arcHostContext.arcId] = it
    } ?: arcHostContext

    /**
     * Serializes [ArcHostContext] into [Entity] types generated by 'schema2kotlin', and
     * use [ArcHostContextParticle] to write them to storage under the given [arcId].
     *
     * Subclasses may override this to store the [context] using a different implementation.
     */
    protected open suspend fun writeContextToStorage(arcId: String, context: ArcHostContext) =
        createArcHostContextParticle(context).run {
            writeArcHostContext(context.arcId, hostId, context)
        }

    override suspend fun startArc(partition: Plan.Partition) {
        val context = lookupOrCreateArcHostContext(partition)

        // Arc is already currently running, don't restart it
        if (isRunning(partition.arcId)) {
            return
        }

        // Can't restart a deleted arc
        if (context.arcState == ArcState.Deleted) {
            return
        }

        partition.particles.forEach { particleSpec ->
            context.particles[particleSpec.particleName] = startParticle(particleSpec, context)
        }

        // Call lifecycle methods given current state.
        performLifecycleForContext(context)

        // If the platform supports resurrection, request it for this Arc's StorageKeys
        maybeRequestResurrection(context)

        updateArcHostContext(partition.arcId, context)
    }

    /**
     * Instantiates a [Particle] by looking up an associated [ParticleConstructor], allocates
     * all of the [Handle]s connected to it, and returns a [ParticleContext] indicating the
     * current lifecycle state of the particle.
     */
    protected suspend fun startParticle(
        spec: Plan.Particle,
        context: ArcHostContext
    ): ParticleContext {
        val particle = instantiateParticle(ParticleIdentifier.from(spec.location))

        val particleContext = lookupParticleContextOrCreate(
            context,
            spec,
            particle
        )

        if (particleContext.particleState == ParticleState.MaxFailed) {
            // Don't try recreating the particle anymore.
            return particleContext
        }

        // Instantiation succeeded. Move to either Created or Instantiated state based on past
        // particle state.
        particleContext.particleState =
            if (particleContext.particleState.hasBeenCreated) {
                ParticleState.Created
            } else {
                ParticleState.Instantiated
            }

        spec.handles.forEach { handleSpec ->
            particleContext.handles[handleSpec.key] = createHandle(
                context,
                handleSpec.key,
                handleSpec.value,
                particle.handles
            )
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
        particle: Particle
    ) = context.particles[spec.particleName]?.copy(particle = particle) ?: ParticleContext(
        particle,
        spec
    )

    /**
     * Invokes any necessary lifecycle methods for the current [ArcHostContext.arcState] and any
     * [Particle]s it may refer to, and may alter the current [ArcState].
     */
    private suspend fun performLifecycleForContext(context: ArcHostContext) {
        context.particles.values.forEach { particleContext ->
            performParticleLifecycle(particleContext)
            if (particleContext.particleState == ParticleState.Failed ||
                particleContext.particleState == ParticleState.MaxFailed) {
                context.arcState = ArcState.Error
                return@forEach
            }
        }

        if (context.arcState != ArcState.Error) {
            context.arcState = ArcState.Running
        }
    }

    /**
     * Invokes necessary [Particle] lifecycle methods given the current
     * [ParticleContext.particleState], and changes that state if necessary. For example by
     * insuring that [Particle.onCreate()], [Particle.onShutdown()] are properly called.
     */
    private suspend fun performParticleLifecycle(particleContext: ParticleContext) {
        if (particleContext.particleState == ParticleState.Instantiated) {
            try {
                // onCreate() must succeed, else we consider the particle startup failed
                particleContext.particle.onCreate()
                particleContext.particleState = ParticleState.Created
            } catch (e: Exception) {
                log.error(e) { "Failure in particle during onCreate." }
                markParticleAsFailed(particleContext)
                return
            }
        }

        // Should only happen if host crashes, restarts, and last persisted state was Running
        if (particleContext.particleState == ParticleState.Started) {
            particleContext.particleState == ParticleState.Stopped
        }

        // If we reach here, particle is being restarted
        if (particleContext.particleState == ParticleState.Stopped) {
            particleContext.particleState = ParticleState.Created
        }

        // This is temporary until the BaseParticle PR lands and onStartup() API lands.
        // We force sync() calls in lieu of onStartup() API for demos
        if (particleContext.particleState == ParticleState.Created) {
            try {
                particleContext.handles.values.forEach { handle ->
                    particleContext.run {
                        particleContext.particle.onHandleSync(handle, false)
                    }
                }
            } catch (e: Exception) {
                log.error(e) { "Failure in particle during onHandleSync." }
                markParticleAsFailed(particleContext)
            }
            particleContext.particleState = ParticleState.Started
        }
    }

    /**
     * Move to [ParticleState.Failed] if this particle had previously successfully invoked
     * [Particle.onCreate()], else move to [ParticleState.Failed_NeverStarted]. Increments
     * consecutive failure count, and if it reaches maximum, transitions to
     * [ParticleState.MaxFailed].
     */
    private fun markParticleAsFailed(particleContext: ParticleContext) {
        particleContext.run {
            if (particleState == ParticleState.MaxFailed) {
                return
            }

            particleState = if (particleState.hasBeenCreated) {
                ParticleState.Failed
            } else {
                ParticleState.Failed_NeverStarted
            }
            consecutiveFailureCount++

            if (consecutiveFailureCount > MAX_CONSECUTIVE_FAILURES) {
                particleState = ParticleState.MaxFailed
            }
        }
    }

    /**
     * Lookup [StorageKey]s used in the current [ArcHostContext] and potentially register them
     * with a [ResurrectorService], so that this [ArcHost] is instructed to automatically
     * restart in the event of a crash.
     */
    protected open suspend fun maybeRequestResurrection(context: ArcHostContext) {
        if (context.arcState == ArcState.NeverStarted) {
            // TODO: First time, request resurrection for context.
        }
    }

    /**
     * Inform [ResurrectorService] to cancel requests for resurrection for the [StorageKey]s in
     * this [ArcHostContext].
     */
    protected open suspend fun maybeCancelResurrection(context: ArcHostContext) {
        // TODO: wire up resurrection cancellation
    }

    /**
     * Given a handle name, a [Plan.HandleConnection], and a [HandleHolder] construct an Entity
     * [Handle] of the right type.
     */
    private suspend fun createHandle(
        arcHostContext: ArcHostContext,
        handleName: String,
        handleSpec: Plan.HandleConnection,
        holder: HandleHolder
    ) = when (handleSpec.type) {
        is SingletonType<*>, is EntityType ->
            arcHostContext.entityHandleManager.createSingletonHandle(
                handleSpec.mode,
                handleName,
                holder.getEntitySpec(handleName),
                handleSpec.storageKey
            )
        is CollectionType<*> ->
            arcHostContext.entityHandleManager.createCollectionHandle(
                handleSpec.mode,
                handleName,
                holder.getEntitySpec(handleName),
                handleSpec.storageKey
            )
        else -> throw IllegalArgumentException("Unknown type ${handleSpec.type}")
    }.also { holder.setHandle(handleName, it) }

    override suspend fun stopArc(partition: Plan.Partition) {
        val arcId = partition.arcId
        contextCache[partition.arcId]?.let { context ->
            when (context.arcState) {
                ArcState.Running -> stopArcInternal(arcId, context)
                ArcState.NeverStarted -> stopArcError(context, "Arc $arcId was never started")
                ArcState.Stopped -> stopArcError(context, "Arc $arcId already stopped")
                ArcState.Deleted -> stopArcError(context, "Arc $arcId is deleted.")
                ArcState.Error -> stopArcError(context, "Arc $arcId encounted an error.")
            }
        }
    }

    /**
     * If an attempt to [ArcHost.stopArc] fails, this method should report the error message.
     * For example, throw an exception or log.
     */
    @Suppress("UNUSED_PARAMETER")
    private suspend fun stopArcError(context: ArcHostContext, message: String) {
        // TODO: decide how to propagate this
    }

    /**
     * Stops an [Arc], stopping all running [Particle]s, cancelling pending resurrection requests,
     * releasing [Handle]s, and modifying [ArcState] and [ParticleState] to stopped states.
     */
    private suspend fun stopArcInternal(arcId: String, context: ArcHostContext) {
        context.particles.values.forEach { particleContext ->
            stopParticle(particleContext)
        }
        maybeCancelResurrection(context)
        context.arcState = ArcState.Stopped
        updateArcHostContext(arcId, context)
    }

    /**
     * Shuts down a [Particle] by invoking its shutdown lifecycle methods, moving it to a
     * [ParticleState.Stopped], and releasing any used [Handle]s.
     */
    private suspend fun stopParticle(context: ParticleContext) {
        try {
            context.particle.onShutdown()
        } catch (e: Exception) {
            log.error(e) { "Failure in particle during onShutdown." }
            // TODO: Shutdown failed, how to handle?
        }

        // TODO: wait for all stores linked to handles to reach idle() state?
        context.particleState = ParticleState.Stopped
        cleanupHandles(context)
    }

    /**
     * Until Kotlin Multiplatform adds a common API for retrieving time, each platform that
     * implements an [ArcHost] needs to supply an implementation of the [Time] interface.
     */
    abstract val platformTime: Time

    open val arcHostContextCapability = Capabilities.TiedToRuntime

    /**
     * Unregisters [Handle]s from [StorageProxy]s, and clears references to them from [Particle]s.
     */
    private suspend fun cleanupHandles(context: ParticleContext) {
        context.particle.handles.reset()
    }

    override suspend fun isHostForParticle(particle: Plan.Particle) =
        registeredParticles().contains(ParticleIdentifier.from(particle.location))

    /**
     * Return an instance of [EntityHandleManager] to be used to create [Handle]s.
     */
    open fun entityHandleManager(arcId: String) = EntityHandleManager(
        arcId,
        hostId,
        platformTime,
        stores,
        activationFactory
    )

    /**
     * The map of [Store] objects that this [ArcHost] will use. By default, it uses a shared
     * singleton defined statically by this package.
     */
    open val stores = singletonStores

    /**
     * The [ActivationFactory] to use when activating stores. By default this is `null`,
     * indicating that the default [ActivationFactory] will be used.
     */
    open val activationFactory: ActivationFactory? = null

    /**
     * Instantiate a [Particle] implementation for a given [ParticleIdentifier].
     *
     * @property identifier a [ParticleIdentifier] from a [Plan.Particle] spec
     */
    open suspend fun instantiateParticle(identifier: ParticleIdentifier): Particle {
        return particleConstructors[identifier]?.invoke() ?: throw IllegalArgumentException(
            "Particle $identifier not found."
        )
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
