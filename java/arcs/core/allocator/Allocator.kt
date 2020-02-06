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
import arcs.core.crdt.CrdtSet
import arcs.core.data.CollectionType
import arcs.core.data.CreateableStorageKey
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.Plan
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.SingletonType
import arcs.core.data.util.toReferencable
import arcs.core.host.ArcHost
import arcs.core.host.ArcHostNotFoundException
import arcs.core.host.HostRegistry
import arcs.core.host.ParticleNotFoundException
import arcs.core.storage.CapabilitiesResolver
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageMode
import arcs.core.storage.StorageProxy
import arcs.core.storage.Store
import arcs.core.storage.StoreOptions
import arcs.core.storage.handle.CollectionHandle
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.type.Type
import arcs.core.util.Time
import arcs.core.util.plus
import arcs.core.util.traverse

private typealias EntityCollectionData = CrdtSet.Data<RawEntity>
private typealias EntityCollectionOp = CrdtSet.IOperation<RawEntity>
private typealias EntityCollectionView = Set<RawEntity>

private typealias PartitionProxy =
    StorageProxy<EntityCollectionData, EntityCollectionOp, EntityCollectionView>

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
    private val time: Time,
    private val store: Store<EntityCollectionData, EntityCollectionOp, EntityCollectionView>,
    private val storageProxy: PartitionProxy,
    private val collection: CollectionHandle<RawEntity>
) {

    /** Currently active Arcs and their associated [Plan.Partition]s. */
    private val partitionMap: MutableMap<ArcId, List<Plan.Partition>> = mutableMapOf()

    private var counter = 0

    /**
     * Start a new Arc given a [Plan] and return the generated [ArcId].
     */
    suspend fun startArcForPlan(arcName: String, plan: Plan): ArcId {
        val idGenerator = Id.Generator.newSession()
        val arcId = plan.arcId?.toArcId() ?: idGenerator.newArcId(arcName)
        // Any unresolved handles ('create' fate) need storage keys
        val newPlan = createStorageKeysIfNecessary(arcId, idGenerator, plan)
        val partitions = computePartitions(arcId, newPlan)
        // Store computed partitions for later
        writePartitionMap(arcId, partitions)
        startPlanPartitionsOnHosts(partitions)
        return arcId
    }

    /**
     * Stop an Arc given its [ArcId].
     */
    suspend fun stopArc(arcId: ArcId) {
        val partitions = readPartitionMap(arcId) ?: return
        stopPlanPartitionsOnHosts(partitions)
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
        hostRegistry.availableArcHosts().filter { it ->
            it.hostId == arcHost
        }.firstOrNull() ?: throw ArcHostNotFoundException(arcHost)

    /** Persists [ArcId] and associated [PlanPartition]s */
    private suspend fun writePartitionMap(arcId: ArcId, partitions: List<Plan.Partition>) {
        partitionMap[arcId] = partitions

        partitions.forEach { partition ->
            val singletons = mapOf(
                "arc" to arcId.toString().toReferencable(),
                "host" to partition.arcHost.toReferencable()
            )
            val collections = mapOf(
                "particles" to partition.particles.map {
                    it.particleName.toReferencable()
                }.toSet()
            )
            val entity = RawEntity(arcId.toString() + partition.arcHost, singletons, collections)
            collection.store(entity)
        }
    }

    /**
     * Reads associated [PlanPartition]s with an [ArcId] .
     */
    private fun readPartitionMap(arcId: ArcId): List<Plan.Partition>? {
        return partitionMap[arcId]
        // TODO(cromwellian): implement actual persistence that survives reboot?
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
                toEntitySchema(type),
                idGenerator.newChildId(arcId, "").toString()
            )
            ?: throw Exception(
                "Unable to create storage key $storageKey"
            )

    /**
     * Retrieves [Schema] from the given [Type], if possible.
     * TODO: declare a common interface.
     */
    private fun toEntitySchema(type: Type): Schema {
        when (type) {
            is SingletonType<*> -> if (type.containedType is EntityType) {
                return (type.containedType as EntityType).entitySchema
            }
            is CollectionType<*> -> if (type.collectionType is EntityType) {
                return (type.collectionType as EntityType).entitySchema
            }
            is EntityType -> return type.entitySchema
        }
        throw IllegalArgumentException("Can't retrieve entitySchema of unknown type $type")
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
        /** Schema for persistent storage of [PlanPartition] information */
        private val SCHEMA = Schema(
            listOf(SchemaName("partition")),
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

        private val STORE_OPTIONS =
            StoreOptions<EntityCollectionData, EntityCollectionOp, EntityCollectionView>(
                storageKey = STORAGE_KEY,
                type = CollectionType(EntityType(SCHEMA)),
                mode = StorageMode.ReferenceMode
            )

        suspend fun create(hostRegistry: HostRegistry, time: Time): Allocator {
            val store = Store(STORE_OPTIONS)
            val storageProxy = StorageProxy(store.activate(), CrdtSet<RawEntity>())
            val actor = "allocator" + Math.random().toString()
            val collection = CollectionHandle(actor, storageProxy, time = time)
            return Allocator(hostRegistry, time, store, storageProxy, collection)
        }
    }
}
