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

import arcs.core.data.CollectionType
import arcs.core.data.Plan
import arcs.core.data.SingletonType
import arcs.core.storage.api.Handle
import arcs.core.storage.handle.HandleManager
import arcs.core.util.Time

typealias ParticleConstructor = suspend () -> Particle
typealias ParticleRegistration = Pair<ParticleIdentifier, ParticleConstructor>

/**
 * Base helper class for [ArcHost] implementations to provide implementation of
 * registration.
 *
 * @property initialParticles The initial set of [Particle]s that this host contains.
 */
abstract class AbstractArcHost(vararg initialParticles: ParticleRegistration) : ArcHost {
    private val particles: MutableMap<ParticleIdentifier, ParticleConstructor> = mutableMapOf()
    private val runningArcs: MutableMap<String, ArcHostContext> = mutableMapOf()

    init {
        initialParticles.toList().associateByTo(particles, { it.first }, { it.second })
    }

    override val hostId = this::class.className()

    protected fun registerParticle(particle: ParticleIdentifier, constructor: ParticleConstructor) {
        particles.put(particle, constructor)
    }

    protected fun unregisterParticle(particle: ParticleIdentifier) {
        particles.remove(particle)
    }

    override suspend fun registeredParticles(): List<ParticleIdentifier> = particles.keys.toList()

    // VisibleForTesting
    protected fun getArcHostContext(arcId: String) = runningArcs[arcId]

    /** Subclasses may override this to load persistent context state. */
    protected suspend fun lookupOrCreateArcHostContext(partition: Plan.Partition): ArcHostContext =
        runningArcs[partition.arcId] ?: ArcHostContext()

    /** Subclasses may override this to store persistent context state. */
    protected suspend fun updateArcHostContext(arcId: String, context: ArcHostContext) {
        runningArcs[arcId] = context
    }

    override suspend fun startArc(partition: Plan.Partition) {
        val context = lookupOrCreateArcHostContext(partition)

        // Arc is already currently running, don't restart it
        if (context.arcState == ArcState.Running) {
            return
        }

        // Can't restart a deleted arc
        if (context.arcState == ArcState.Deleted) {
            return
        }

        for (particleSpec in partition.particles) {
            context.particles[particleSpec] = startParticle(particleSpec, context)
        }

        performLifecycleForContext(context)
        maybeRequestResurrection(context)

        context.arcState = ArcState.Running
        updateArcHostContext(partition.arcId, context)
    }

    suspend fun startParticle(spec: Plan.Particle, context: ArcHostContext): ParticleContext {
        val particle = instantiateParticle(ParticleIdentifier.from(spec.location))

        val particleContext = lookupParticleContextOrCreate(
            context,
            spec,
            particle
        )

        for (handleSpec in spec.handles) {
            val handle = createHandle(handleSpec.key, handleSpec.value, particle.handles)
            particleContext.handles[handleSpec.key] = handle
        }

        return particleContext
    }

    fun lookupParticleContextOrCreate(
        context: ArcHostContext,
        spec: Plan.Particle,
        particle: Particle
    ) = context.particles[spec]?.copy(particle = particle) ?: ParticleContext(particle)

    suspend fun performLifecycleForContext(context: ArcHostContext) {
        for (particleContext in context.particles.values) {
            performParticleLifecycle(particleContext)
        }
    }

    suspend fun performParticleLifecycle(particleContext: ParticleContext) {
        if (particleContext.particleState == ParticleState.Instantiated) {
            particleContext.particle.onCreate()
            particleContext.particleState = ParticleState.Created
        }

        // TODO: verify this won't be true if the host crashes
        if (particleContext.particleState == ParticleState.Started) {
            // particle already started
            return
        }

        // If we reach here, particle is being restarted
        if (particleContext.particleState == ParticleState.Stopped) {
            particleContext.particleState = ParticleState.Created
        }

        // This is temporary until the BaseParticle PR lands and onStartup() API lands.
        // We force sync() calls in lieu of onStartup() API for demos
        if (particleContext.particleState == ParticleState.Created) {
            for ((handleName, handle) in particleContext.handles) {
                particleContext.run {
                    particle.onHandleSync(handle, false)
                }
            }
            particleContext.particleState = ParticleState.Started
        }
    }

    suspend fun maybeRequestResurrection(context: ArcHostContext) {
        if (context.arcState == ArcState.NeverStarted) {
            // TODO: First time, request resurrection for context.
        }
    }

    suspend fun maybeCancelResurrection(context: ArcHostContext) {
        // TODO: wire up resurrection cancellation
    }

    /**
     * Given a handle name, a [HandleConnection], and a [HandleHolder] construct an Entity
     * [Handle] of the right type.
     */
    suspend fun createHandle(
        handleName: String,
        handleSpec: Plan.HandleConnection,
        holder: HandleHolder
    ) = when (handleSpec.type) {
        is SingletonType<*> ->
            entityHandleManager().createSingletonHandle(
                holder,
                handleName,
                handleSpec.storageKey,
                handleSpec.type.toSchema()
            )
        is CollectionType<*> ->
            entityHandleManager().createSetHandle(
                holder,
                handleName,
                handleSpec.storageKey,
                handleSpec.type.toSchema()
            )
        else -> throw Exception("Unknown type ${handleSpec.type}")
    }

    override suspend fun stopArc(partition: Plan.Partition) {
        val arcId = partition.arcId
        val context = lookupOrCreateArcHostContext(partition)
        runningArcs[partition.arcId]?.let { context ->
            when (context.arcState) {
                ArcState.Running -> stopArcInternal(arcId, context)
                ArcState.NeverStarted -> stopArcError(context, "Arc $arcId was never started")
                ArcState.Stopped -> stopArcError(context, "Arc $arcId already stopped")
                ArcState.Deleted -> stopArcError(context, "Arc $arcId is deleted.")
            }
        }
    }

    suspend fun stopArcError(context: ArcHostContext, message: String) {
        // TODO: decide how to propagate this
    }

    suspend fun stopArcInternal(arcId: String, context: ArcHostContext) {
        for (particleContext in context.particles.values) {
            stopParticle(particleContext)
        }
        maybeCancelResurrection(context)
        context.arcState = ArcState.Stopped
        updateArcHostContext(arcId, context)
    }

    suspend fun stopParticle(context: ParticleContext) {
        context.particle.onShutdown()
        context.particleState = ParticleState.Stopped
        cleanupHandles(context.particle.handles)
    }

    suspend fun cleanupHandles(handles: HandleHolder) {
        for ((name, handle) in handles.handles) {
            // TODO: disconnect/unregister handle
        }
        (handles.handles as MutableMap).clear()
    }

    override suspend fun isHostForParticle(particle: Plan.Particle) =
        registeredParticles().contains(ParticleIdentifier.from(particle.location))

    // TODO: hack workaround, replace with portable core version?
    class TimeImpl : Time() {
        override val currentTimeNanos: Long
            get() = System.nanoTime()
        override val currentTimeMillis: Long
            get() = System.currentTimeMillis()
    }

    open fun platformTime(): Time = TimeImpl()

    /**
     * Return an instance of [EntityHandleManager] to be used to create [Handle]s.
     */
    open fun entityHandleManager(): EntityHandleManager = EntityHandleManager(
        HandleManager(platformTime())
    )

    /**
     * Instantiate a [Particle] implementation for a given [ParticleIdentifier].
     *
     * @property identifier A [ParticleIdentifier] from a [ParticleSpec].
     */
    open suspend fun instantiateParticle(identifier: ParticleIdentifier): Particle {
        return particles[identifier]?.invoke() ?: throw Exception(
            "Particle $identifier not found."
        )
    }
}
