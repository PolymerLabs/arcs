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
package arcs.core.allocator

import arcs.core.common.ArcId
import arcs.core.common.Id
import arcs.core.common.toArcId
import arcs.core.data.Annotation
import arcs.core.data.Capabilities
import arcs.core.data.CreatableStorageKey
import arcs.core.data.Plan
import arcs.core.entity.HandleSpec
import arcs.core.host.ArcHost
import arcs.core.host.ArcHostException
import arcs.core.host.ArcHostNotFoundException
import arcs.core.host.EntityHandleManager
import arcs.core.host.HostRegistry
import arcs.core.host.ParticleNotFoundException
import arcs.core.storage.CapabilitiesResolver
import arcs.core.storage.StorageKey
import arcs.core.type.Type
import arcs.core.util.TaggedLog
import arcs.core.util.plus
import arcs.core.util.traverse
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * An [Allocator] is responsible for starting and stopping arcs via a distributed
 * set of [ArcHost] implementations. It accomplishes this by being given a [Plan]
 * which it partitions into a set of [Plan.Partition] objects, one per participating
 * [ArcHost] according to [HostRegistry] entries.
 *
 * [arcs.core.data.Schema], a set of [Particle]s to instantiate, and connections between each
 * [HandleSpec] and [Particle].
 */
class Allocator(
    private val hostRegistry: HostRegistry,
    /** Currently active Arcs and their associated [Plan.Partition]s. */
    private val partitionMap: PartitionSerialization,
    private val coroutineContext: CoroutineContext = Dispatchers.Default
) {
    private val log = TaggedLog { "Allocator" }
    private val mutex = Mutex()

    /**
     * A [PartitionSerialization] is an interface for storing the [Plan.Partition] items created when an
     * Arc is started. If only single-process support is required, a simple map object can be used.
     * For full cross-process support, use an implementation like [CollectionHandlePartitionMap],
     * which will store partitions for started Arcs in a collection handle.
     */
    interface PartitionSerialization {
        /**
         * Stores the provided list of [Plan.Parition] for the provided [ArcId]. Existing values
         * will be replaced.
         */
        suspend fun set(arcId: ArcId, partitions: List<Plan.Partition>)

        /**
         * Return the current list of [Plan.Partition] for the provided [ArcId]. If an Arc with
         * the provided [ArcId] is not started, an empty list will be returned.
         */
        suspend fun readPartitions(arcId: ArcId): List<Plan.Partition>

        /**
         * Return partitions as in [readPartitions], and then immmediately clear the values stored
         * for the provided [ArcId].
         */
        suspend fun readAndClearPartitions(arcId: ArcId): List<Plan.Partition>
    }

    /**
     * Start a new Arc given a [Plan] and return an [Arc].
     */
    suspend fun startArcForPlan(plan: Plan): Arc = startArcForPlan(plan, "arc")

    /**
     * Start a new Arc given a [Plan] and return an [Arc].
     */
    private suspend fun startArcForPlan(plan: Plan, nameForTesting: String): Arc = mutex.withLock {
        plan.arcId?.toArcId()?.let { arcId ->
            val existingPartitions = partitionMap.readPartitions(arcId)
            if (existingPartitions.isNotEmpty()) {
                return Arc(arcId, this, existingPartitions, coroutineContext)
            }
        }
        val idGenerator = Id.Generator.newSession()
        val arcId = plan.arcId?.toArcId() ?: idGenerator.newArcId(nameForTesting)
        // Any unresolved handles ('create' fate) need storage keys
        val newPlan = createStorageKeysIfNecessary(arcId, idGenerator, plan)
        log.debug { "Created storage keys" }
        val partitions = computePartitions(arcId, newPlan)
        log.debug { "Computed partitions" }
        // Store computed partitions for later
        partitionMap.set(arcId, partitions)
        try {
            startPlanPartitionsOnHosts(partitions)
            return Arc(arcId, this, partitions, coroutineContext)
        } catch (e: ArcHostException) {
            stopArc(arcId)
            throw e
        }
    }

    /**
     * Stop an Arc given its [ArcId].
     */
    suspend fun stopArc(arcId: ArcId) = mutex.withLock {
        val partitions = partitionMap.readAndClearPartitions(arcId)
        stopPlanPartitionsOnHosts(partitions)
    }

    /**
     * Asks each [ArcHost] to start an Arc given a [Plan.Partition].
     */
    private suspend fun startPlanPartitionsOnHosts(partitions: List<Plan.Partition>) =
        partitions.forEach { partition -> lookupArcHost(partition.arcHost).startArc(partition) }

    /**
     * Asks each [ArcHost] to stop an Arc given a [ArcId].
     */
    private suspend fun stopPlanPartitionsOnHosts(partitions: List<Plan.Partition>) =
        partitions.forEach { partition -> lookupArcHost(partition.arcHost).stopArc(partition) }

    // VisibleForTesting
    suspend fun lookupArcHost(arcHost: String) =
        hostRegistry.availableArcHosts().filter { it ->
            it.hostId == arcHost
        }.firstOrNull() ?: throw ArcHostNotFoundException(arcHost)

    /**
     * Finds [HandleConnection] instances which were unresolved at build time
     * [CreatableStorageKey]) and attaches generated keys via [CapabilitiesResolver].
     */
    private fun createStorageKeysIfNecessary(
        arcId: ArcId,
        idGenerator: Id.Generator,
        plan: Plan
    ): Plan {
        val createdKeys: MutableMap<StorageKey, StorageKey> = mutableMapOf()
        val allHandles = Plan.particleLens.traverse() + Plan.Particle.handlesLens.traverse()

        return allHandles.mod(plan) { handle ->
            (Plan.HandleConnection.handleLens + Plan.Handle.storageKeyLens).mod(handle) {
                replaceCreateKey(
                    createdKeys,
                    arcId,
                    idGenerator,
                    it,
                    handle.type,
                    handle.annotations
                )
            }
        }
    }

    fun replaceCreateKey(
        createdKeys: MutableMap<StorageKey, StorageKey>,
        arcId: ArcId,
        idGenerator: Id.Generator,
        storageKey: StorageKey,
        type: Type,
        annotations: List<Annotation>
    ): StorageKey {
        if (storageKey is CreatableStorageKey) {
            return createdKeys.getOrPut(storageKey) {
                createStorageKey(arcId, idGenerator, type, annotations)
            }
        }
        return storageKey
    }

    /**
     * Creates new [StorageKey] instances based on [HandleSpec] tags.
     * Incomplete implementation for now, only Ram or Volatile can be created.
     */
    private fun createStorageKey(
        arcId: ArcId,
        idGenerator: Id.Generator,
        type: Type,
        annotations: List<Annotation>
    ): StorageKey {
        val capabilities = Capabilities.fromAnnotations(annotations)
        return CapabilitiesResolver(CapabilitiesResolver.Options(arcId))
            .createStorageKey(capabilities, type, idGenerator.newChildId(arcId, "").toString())
    }

    /**
     * Slice plan into pieces grouped by [ArcHost], each group consisting of a [Plan.Partition]
     * that lists [Particle] needed for that host.
     */
    private suspend fun computePartitions(arcId: ArcId, plan: Plan): List<Plan.Partition> =
        plan.particles
            .map { particle -> findArcHostByParticle(particle) to particle }
            .groupBy({ it.first }, { it.second })
            .map { (host, particles) ->
                Plan.Partition(
                    arcId.toString(),
                    host.hostId,
                    particles
                )
            }

    /**
     * Find [ArcHosts] by looking up known registered particles in every [ArcHost],
     * mapping them to fully qualified Java classnames, and comparing them with the
     * [Particle.location].
     */
    private suspend fun findArcHostByParticle(particle: Plan.Particle): ArcHost =
        hostRegistry.availableArcHosts()
            .firstOrNull { host -> host.isHostForParticle(particle) }
            ?: throw ParticleNotFoundException(particle)

    companion object {
        /**
         * Creates an [Allocator] which serializes Arc/Particle state to the storage system backing
         * the provided [handleManager].
         */
        @ExperimentalCoroutinesApi
        fun create(
            hostRegistry: HostRegistry,
            handleManager: EntityHandleManager,
            coroutineContext: CoroutineContext = Dispatchers.Default
        ): Allocator {
            return Allocator(
                hostRegistry,
                CollectionHandlePartitionMap(handleManager),
                coroutineContext
            )
        }

        /**
         * Creates an [Allocator] which does not attempt to serialize Arc/Particle state to storage.
         *
         * This is primarily useful for tests, but also may be of limited use in production if Arc
         * serialization and resurrection is not a requirement for your environment.
         */
        @ExperimentalCoroutinesApi
        fun createNonSerializing(
            hostRegistry: HostRegistry,
            coroutineContext: CoroutineContext = Dispatchers.Default
        ): Allocator {
            return Allocator(
                hostRegistry,
                object : PartitionSerialization {
                    private val mutex = Mutex()
                    private val partitions = mutableMapOf<ArcId, List<Plan.Partition>>()

                    override suspend fun set(
                        arcId: ArcId,
                        partitions: List<Plan.Partition>
                    ) = mutex.withLock {
                        this.partitions[arcId] = partitions
                    }

                    override suspend fun readPartitions(
                        arcId: ArcId
                    ): List<Plan.Partition> = mutex.withLock {
                        this.partitions[arcId] ?: emptyList()
                    }

                    override suspend fun readAndClearPartitions(
                        arcId: ArcId
                    ): List<Plan.Partition> = mutex.withLock {
                        val oldPartitions = this.partitions[arcId] ?: emptyList()
                        this.partitions[arcId] = emptyList()
                        oldPartitions
                    }
                },
                coroutineContext
            )
        }
    }
}
