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
import arcs.core.data.Plan
import arcs.core.host.ArcHost
import arcs.core.host.ArcHostNotFoundException
import arcs.core.host.HostRegistry
import arcs.core.host.ParticleNotFoundException
import arcs.core.storage.StorageKey
import arcs.core.storage.driver.VolatileStorageKey

/**
 * An [Allocator] is responsible for starting and stopping arcs via a distributed
 * set of [ArcHost] implementations. It accomplishes this by being given a [Plan]
 * which it partitions into a set of [Plan.Partition] objects, one per participating
 * [ArcHost] according to [HostRegistry] entries.
 *
 * Each [Plan.Partition] lists a set of [HandleSpec] objects with [arcs.core.storage.StorageKey] and
 * [arcs.core.data.Schema], a set of [Particle]s to instantiate, and connections between each
 * [HandleSpec] and [Particle].
 */
class Allocator(val hostRegistry: HostRegistry) {

    /** Currently active Arcs and their associated [Plan.Partition]s. */
    private val partitionMap: MutableMap<ArcId, List<Plan.Partition>> = mutableMapOf()

    /**
     * Start a new Arc given a [Plan] and return the generated [ArcId].
     */
    suspend fun startArcForPlan(arcName: String, plan: Plan): ArcId {
        val idGenerator = Id.Generator.newSession()
        val arcId = idGenerator.newArcId(arcName)
        // Any unresolved handles ('create' fate) need storage keys
        createStorageKeysIfNecessary(arcId, idGenerator, plan)
        val partitions = computePartitions(arcId, plan)
        // Store computed partitions for later
        writePartitionMap(arcId, partitions)
        startPlanPartitionsOnHosts(partitions)
        return arcId
    }

    // VisibleForTesting
    fun getPartitionsFor(arcId: ArcId): List<Plan.Partition>? {
        return partitionMap[arcId]
    }

    /**
     * Asks each [ArcHost] to start an Arc given a [Plan.Partition].
     */
    private suspend fun startPlanPartitionsOnHosts(partitions: List<Plan.Partition>) =
        partitions.forEach { partition -> lookupArcHost(partition.arcHost).startArc(partition) }

    // VisibleForTesting
    suspend fun lookupArcHost(arcHost: String) =
        hostRegistry.availableArcHosts().filter { it ->
            it.hostId == arcHost
        }.firstOrNull() ?: throw ArcHostNotFoundException(arcHost)

    /**
     * Persists [ArcId] and associoated [PlatPartition]s.
     */
    private fun writePartitionMap(arcId: ArcId, partitions: List<Plan.Partition>) {
        partitionMap[arcId] = partitions
        // TODO(cromwellian): implement actual persistence that survives reboot?
    }

    /**
     * Finds [HandleSpec] instances which were unresolved at build time (null [StorageKey]) and
     * attaches generated keys.
     */
    private fun createStorageKeysIfNecessary(arcId: ArcId, idGenerator: Id.Generator, plan: Plan) =
        plan.particles
            .forEach {
                it.handles.values.forEach { spec ->
                    spec.storageKey = spec.storageKey ?: createStorageKey(arcId, idGenerator) }
            }

    /**
     * Creates new [StorageKey] instances based on [HandleSpec] tags.
     * Incomplete implementation for now, only Ram or Volatile can be created.
     */
    private fun createStorageKey(
        arcId: ArcId,
        idGenerator: Id.Generator
    ): StorageKey = VolatileStorageKey(
            arcId,
            idGenerator.newChildId(arcId, "").toString()
        )

    private fun isVolatileHandle(tags: Set<String>) = tags.contains("volatile")

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
    private suspend fun findArcHostByParticle(particle: arcs.core.data.Plan.Particle): ArcHost =
        hostRegistry.availableArcHosts()
            .firstOrNull { host -> host.isHostForParticle(particle) }
            ?: throw ParticleNotFoundException(particle)
}
