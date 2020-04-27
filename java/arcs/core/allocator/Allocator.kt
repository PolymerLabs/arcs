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
import arcs.core.data.CreateableStorageKey
import arcs.core.data.FieldType
import arcs.core.data.HandleMode
import arcs.core.data.Plan
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.entity.EntityBase
import arcs.core.entity.EntityBaseSpec
import arcs.core.entity.HandleContainerType
import arcs.core.entity.HandleSpec
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.host.ArcHost
import arcs.core.host.ArcHostException
import arcs.core.host.ArcHostNotFoundException
import arcs.core.host.EntityHandleManager
import arcs.core.host.HostRegistry
import arcs.core.host.ParticleNotFoundException
import arcs.core.storage.CapabilitiesResolver
import arcs.core.storage.StorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.type.Type
import arcs.core.util.Analytics
import arcs.core.util.plus
import arcs.core.util.traverse

/**
 * An [Allocator] is responsible for starting and stopping arcs via a distributed
 * set of [ArcHost] implementations. It accomplishes this by being given a [Plan]
 * which it partitions into a set of [Plan.Partition] objects, one per participating
 * [ArcHost] according to [HostRegistry] entries.
 *
 * [arcs.core.data.Schema], a set of [Particle]s to instantiate, and connections between each
 * [HandleSpec] and [Particle].
 */
class Allocator private constructor(
    private val hostRegistry: HostRegistry,
    private val collection: ReadWriteCollectionHandle<EntityBase>
) {
    /** Currently active Arcs and their associated [Plan.Partition]s. */
    private val partitionMap: MutableMap<ArcId, List<Plan.Partition>> = mutableMapOf()

    /**
     * Start a new Arc given a [Plan] and return the generated [ArcId].
     */
    suspend fun startArcForPlan(arcName: String, plan: Plan): ArcId {
        if (plan.arcId !== null) {
            if (readPartitions(plan.arcId!!.toArcId()).isNotEmpty()) {
                val arcId = plan.arcId!!.toArcId()
                Analytics.logger.logAllocatorEvent(
                    Analytics.Event.StartArc, arcId.name, arcId.toString())
                return arcId
            }
        }


        val idGenerator = Id.Generator.newSession()
        val arcId = plan.arcId?.toArcId() ?: idGenerator.newArcId(arcName)

        Analytics.logger.logAllocatorEvent(
            Analytics.Event.StartArc, arcId.name, arcId.toString())

        // Any unresolved handles ('create' fate) need storage keys
        val newPlan = createStorageKeysIfNecessary(arcId, idGenerator, plan)
        val partitions = computePartitions(arcId, newPlan)
        // Store computed partitions for later
        writePartitionMap(arcId, partitions)
        try {
            startPlanPartitionsOnHosts(partitions)
            return arcId
        } catch (e: ArcHostException) {
            stopArc(arcId)
            throw e
        }
    }

    /**
     * Stop an Arc given its [ArcId].
     */
    suspend fun stopArc(arcId: ArcId) {
        val partitions = readAndClearPartitions(arcId)
        stopPlanPartitionsOnHosts(partitions)

        Analytics.logger.logAllocatorEvent(
            Analytics.Event.StopArc, arcId.name, arcId.toString())
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

    /**
     * Asks each [ArcHost] to stop an Arc given a [ArcId].
     */
    private suspend fun stopPlanPartitionsOnHosts(partitions: List<Plan.Partition>) =
        partitions.forEach { partition -> lookupArcHost(partition.arcHost).stopArc(partition) }

    // VisibleForTesting
    suspend fun lookupArcHost(arcHost: String) =
        hostRegistry.availableArcHosts().firstOrNull {
            it.hostId == arcHost
        } ?: run {
            Analytics.logger.logArcHostNotFoundException(arcHost)
            throw ArcHostNotFoundException(arcHost)
        }

    /** Persists [ArcId] and associated [PlanPartition]s */
    private suspend fun writePartitionMap(arcId: ArcId, partitions: List<Plan.Partition>) {
        partitionMap[arcId] = partitions

        partitions.forEach { partition ->
            val entity = EntityBase("EntityBase", SCHEMA)
            entity.setSingletonValue("arc", arcId.toString())
            entity.setSingletonValue("host", partition.arcHost)
            entity.setCollectionValue(
                "particles",
                partition.particles.map { it.particleName }.toSet()
            )
            collection.store(entity)
        }
    }

    /** Looks up [RawEntity]s representing [PlanPartition]s for a given [ArcId] */
    private suspend fun entitiesForArc(arcId: ArcId): List<EntityBase> =
        collection.fetchAll().filter { it.getSingletonValue("arc") == arcId.toString() }

    /** Converts a [RawEntity] to a [Plan.Partition] */
    private fun entityToPartition(entity: EntityBase): Plan.Partition =
        Plan.Partition(
            entity.getSingletonValue("arc") as String,
            entity.getSingletonValue("host") as String,
            entity.getCollectionValue("particles").map {
                Plan.Particle(it as String, "", mapOf())
            }
        )

    /** Reads associated [PlanPartition]s with an [ArcId]. */
    private suspend fun readPartitions(arcId: ArcId): List<Plan.Partition> =
        entitiesForArc(arcId).map { entityToPartition(it) }

    private suspend fun readAndClearPartitions(arcId: ArcId): List<Plan.Partition> {
        val entities = entitiesForArc(arcId)
        entities.forEach { collection.remove(it) }
        return entities.map { entityToPartition(it) }
    }

    /**
     * Finds [HandleConnection] instances which were unresolved at build time
     * [CreateableStorageKey]) and attaches generated keys via [CapabilitiesResolver].
     */
    private fun createStorageKeysIfNecessary(
        arcId: ArcId,
        idGenerator: Id.Generator,
        plan: Plan
    ): Plan {
        val createdKeys: MutableMap<StorageKey, StorageKey> = mutableMapOf()
        val allHandles = Plan.particleLens.traverse() + Plan.Particle.handlesLens.traverse()

        return allHandles.mod(plan) { handle ->
            Plan.HandleConnection.storageKeyLens.mod(handle) {
                replaceCreateKey(createdKeys, arcId, idGenerator, it, handle.type)
            }
        }
    }

    fun replaceCreateKey(
        createdKeys: MutableMap<StorageKey, StorageKey>,
        arcId: ArcId,
        idGenerator: Id.Generator,
        storageKey: StorageKey,
        type: Type
    ): StorageKey {
        if (storageKey is CreateableStorageKey) {
            return createdKeys.getOrPut(storageKey) {
                createStorageKey(arcId, idGenerator, storageKey, type)
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
        storageKey: CreateableStorageKey,
        type: Type
    ): StorageKey =
        CapabilitiesResolver(CapabilitiesResolver.CapabilitiesResolverOptions(arcId))
            .createStorageKey(
                storageKey.capabilities,
                type,
                idGenerator.newChildId(arcId, "").toString()
            )
            ?: throw Exception(
                "Unable to create storage key $storageKey"
            )

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
        ?: run {
            Analytics.logger.logParticleNotFoundException(particle.particleName)
            throw ParticleNotFoundException(particle)
        }

    companion object {
        /** Schema for persistent storage of [PlanPartition] information */
        private val SCHEMA = Schema(
            setOf(SchemaName("partition")),
            SchemaFields(
                mapOf(
                    "arc" to FieldType.Text,
                    "host" to FieldType.Text
                ),
                mapOf(
                    "particles" to FieldType.Text
                )),
            "plan-partition-schema"
        )

        private val STORAGE_KEY = ReferenceModeStorageKey(
            RamDiskStorageKey("partition"),
            RamDiskStorageKey("partitions")
        )

        @Suppress("UNCHECKED_CAST")
        suspend fun create(
            hostRegistry: HostRegistry,
            handleManager: EntityHandleManager
        ): Allocator {
            val collection = handleManager.createHandle(
                HandleSpec(
                    "partitions",
                    HandleMode.ReadWrite,
                    HandleContainerType.Collection,
                    EntityBaseSpec(SCHEMA)
                ),
                STORAGE_KEY
            )
            return Allocator(
                hostRegistry,
                collection as ReadWriteCollectionHandle<EntityBase>
            )
        }
    }
}
