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

import arcs.core.common.toArcId
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.crdt.CrdtSet
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.ParticleSpec
import arcs.core.data.PlanPartition
import arcs.core.data.RawEntity
import arcs.core.data.SingletonType
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.storage.Callbacks
import arcs.core.storage.Handle
import arcs.core.storage.StorageProxy
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.driver.VolatileDriverProvider
import arcs.core.storage.handle.CollectionImpl
import arcs.core.storage.handle.HandleManager
import arcs.core.storage.handle.SetHandle
import arcs.core.storage.handle.SingletonHandle
import arcs.core.storage.handle.SingletonImpl
import arcs.sdk.Entity
import arcs.sdk.Particle
import kotlin.reflect.KClass


/**
 * Base helper class for [ArcHost] implementations to provide implementation of
 * registration.
 */
abstract class AbstractArcHost(
    private var particles: MutableList<ParticleIdentifier> = mutableListOf()
) : ArcHost {
    override val hostId = this::class.className()

    protected val runningArcs = mutableMapOf<String, ArcHostContext>()

    protected fun registerParticle(particle: ParticleIdentifier) {
        particles.add(particle)
    }

    protected fun unregisterParticle(particle: ParticleIdentifier) {
        particles.remove(particle)
    }

    override suspend fun registeredParticles(): List<ParticleIdentifier> = particles

    override suspend fun startArc(partition: PlanPartition) {
        VolatileDriverProvider(partition.arcId.toArcId())
        RamDiskDriverProvider()

        val context = ArcHostContext()
        partition.particles.forEach {
            val particle = instantiateParticle(ParticleIdentifier.from(it.location))
            val particleContext = ParticleContext(particle = particle)

            for (handleSpec in it.handles) {
                val storageHandle = createStorageHandle(handleSpec.value)
                particleContext.handles[handleSpec.key] = storageHandle

                val sdkHandle = createSdkHandle(particle, handleSpec.key, storageHandle)
                particle.handles.map[handleSpec.key] = sdkHandle
            }
            context.particles[it] = particleContext
        }

        // register for resurrection
        // call onCreate if first time
        // call onStartup
        context.particles.forEach {
            particle -> particle.value.handles.forEach {
              particle.value.particle.onHandleSync(particle.value.particle.handles.map[it.key]!!, true)
            }
        }
        runningArcs[partition.arcId] = context
    }

    private fun createSdkHandle(
        particle: Particle,
        handleName: String,
        storageHandle: Handle<out CrdtSet.Data<RawEntity>, out CrdtOperationAtTime, out Any?>
    ): arcs.sdk.Handle {
        return when (storageHandle) {
            is SingletonHandle<*> ->
                ReadWriteSingletonHandleImpl<Entity>(
                    particle,
                    handleName,
                    storageHandle as SingletonHandle<RawEntity>
                )
            is SetHandle<*> ->
                ReadWriteCollectionHandleImpl<Entity>(
                    particle,
                    handleName,
                    storageHandle as SetHandle<RawEntity>
                )
            else -> throw Exception("Unknown storage handle type ${storageHandle::class}")
        }
    }

    override suspend fun stopArc(partition: PlanPartition) {
        // TODO: not implemented yet
    }

    override suspend fun isHostForSpec(spec: ParticleSpec) =
        registeredParticles().contains(ParticleIdentifier.from(spec.location))

    /**
     * Given a [HandleConnectionSpec] construct a [StorageProxy] using a platform dependent
     * [StorageCommuncationEndpointProvider].
     *
     * @property handleSpec a [HandleConnectionSpec] from a [PlanPartition].
     */
    suspend fun createStorageHandle(
        handleSpec: HandleConnectionSpec
    ) = when (handleSpec.type) {
            is SingletonType<*> -> createSingletonStorageHandle(handleSpec)
            is CollectionType<*> -> createCollectionStorageHandle(handleSpec)
            else -> throw Exception("Unknown type ${handleSpec.type}")
    }

    private suspend fun createCollectionStorageHandle(handleSpec: HandleConnectionSpec) =
        handleManager().setHandle(
            handleSpec.storageKey!!,
            ((handleSpec.type as SingletonType<*>).containedType as EntityType).entitySchema
        )

    private suspend fun createSingletonStorageHandle(handleSpec: HandleConnectionSpec) =
        handleManager().singletonHandle(
            handleSpec.storageKey!!,
            ((handleSpec.type as SingletonType<*>).containedType as EntityType).entitySchema
        )


    open fun handleManager(): HandleManager = HandleManager()

    /**
     * Instantiate a [Particle] implementation for a given [ParticleIdentifier].
     *
     * @property identifier A [ParticleIdentifier] from a [ParticleSpec].
     */
    abstract suspend fun instantiateParticle(identifier: ParticleIdentifier): Particle
}

/**
 * Convert an array of [Particle] class literals to a [MutableList] of [ParticleIdentifier].
 */
fun Array<out KClass<out Particle>>.toIdentifierList(): MutableList<ParticleIdentifier> =
    this.map { it.toParticleIdentifier() }.toMutableList()

fun RawEntity.toMap(): Map<String, Any?> {
    val map: MutableMap<String, Any> = mutableMapOf()
    this.singletons.entries.forEach {
        map[it.key] = (it.value?.tryDereference() as? ReferencablePrimitive<*>)?.value as Any
    }
    return map
}
