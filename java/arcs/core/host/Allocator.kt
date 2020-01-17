/*
 * Copyright 2019 Google LLC.
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
import arcs.core.common.Id
import arcs.core.sdk.Particle
import arcs.core.storage.StorageKey
import arcs.core.storage.driver.RamDiskStorageKey
import arcs.core.storage.driver.VolatileStorageKey

// TODO(cromwellian): This should be based off some configuration
typealias DefaultHost = ProdHost

/**
 * An [Allocator] is responsible for starting and stopping arcs via a distributed
 * set of [ArcHost] implementations. It accomplishes this by being given a [Plan]
 * which it partitions into a set of [PlanPartition] objects, one per participating
 * [ArcHost] according to [HostRegistry] entries.
 *
 * Each [PlanPartition] lists a set of [HandleSpec] objects with [arcs.core.storage.StorageKey] and
 * [arcs.core.data.Schema], a set of [Particle]s to instantiate, and connections between each
 * [HandleSpec] and [Particle].
 */
class Allocator(val hostRegistry: HostRegistry) {

    /** [ArcHost] used for unannotated Particles */
    private val defaultHost =
        hostRegistry.availableArcHosts.find { it.javaClass == DefaultHost::class.java }!!

    /** Currently active Arcs and their associated [PlanPartition]s. */
    private val partitionMap: MutableMap<ArcId, List<PlanPartition>> = mutableMapOf()

    /**
     * Start a new Arc given a [Plan] and return the generated [ArcId].
     */
    fun startArcForPlan(arcName: String, plan: Plan): ArcId {
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
    fun getPartitionsFor(arcId: ArcId): List<PlanPartition>? {
        return partitionMap[arcId]
    }

    /**
     * Asks each [ArcHost] to start an Arc given a [PlanPartition].
     */
    private fun startPlanPartitionsOnHosts(partitions: List<PlanPartition>) =
        partitions.forEach { partition -> partition.arcHost.startArc(partition) }

    /**
     * Persists [ArcId] and associoated [PlatPartition]s.
     */
    private fun writePartitionMap(arcId: ArcId, partitions: List<PlanPartition>) {
        partitionMap[arcId] = partitions
        // TODO(cromwellian): implement actual persistence that survives reboot?
    }

    /**
     * Finds [HandleSpec] instances which were unresolved at build time (null [StorageKey]) and
     * attaches generated keys.
     */
    private fun createStorageKeysIfNecessary(arcId: ArcId, idGenerator: Id.Generator, plan: Plan) =
        plan.handleSpecs
            .filter { spec -> spec.storageKey == null }
            .forEach { spec ->
                spec.storageKey = createStorageKey(arcId, spec, idGenerator)
            }

    /**
     * Creates new [StorageKey] instances based on [HandleSpec] tags.
     * Incomplete implementation for now, only Ram or Volatile can be created.
     */
    private fun createStorageKey(
        arcId: ArcId,
        spec: HandleSpec,
        idGenerator: Id.Generator
    ): StorageKey = when {
        !isVolatileHandle(spec.tags) -> RamDiskStorageKey(
            idGenerator.newChildId(arcId, "").toString()
        )
        else -> VolatileStorageKey(
            arcId,
            idGenerator.newChildId(arcId, "").toString()
        )
    }

    private fun isVolatileHandle(tags: Set<String>) = tags.contains("volatile")

    /**
     * Slice plan into pieces grouped by [ArcHost], each group consisting of a [PlanPartition]
     * that lists [HandleSpec], [ParticleSpec], and [HandleConnectionSpec] needed for that host.
     */
    private fun computePartitions(arcId: ArcId, plan: Plan): List<PlanPartition> =
        plan.particleSpecs
            .map {
                    spec -> findArcHostBySpec(spec) to spec }
            .groupBy({ it.first }, { it.second })
            // map ArcHost -> List<ParticleSpec> into List<PlanPartition>
            .map {
                // find all HandleConnectionSpecs for the given List<ParticleSpec>
                val handleConnectionSpecs =
                    plan.handleConnectionSpecs.filter { spec ->
                        it.value.contains(spec.usingParticle)
                    }
                PlanPartition(
                    arcId.toString(),
                    it.key /* ArcHost */,
                    handleConnectionSpecs.map { it.usedHandle },
                    it.value /* List<ParticleSpec> */,
                    handleConnectionSpecs
                )
            }

    /**
     * Find [ArcHosts] by looking up known registered particles in every [ArcHost],
     * mapping them to fully qualified Java classnames, and comparing them with the
     * [ParticleSpec.location].
     */
    private fun findArcHostBySpec(spec: ParticleSpec): ArcHost =
        hostRegistry.availableArcHosts
            .filter { host ->
                host.registeredParticles.map { clazz -> clazz.java.getCanonicalName() }
                    .contains(spec.location)
            }.firstOrNull() ?: defaultHost
}
