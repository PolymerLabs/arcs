package arcs.core.allocator

import arcs.core.common.ArcId
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
import arcs.core.entity.awaitReady
import arcs.core.host.EntityHandleManager
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.TaggedLog
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext

/**
 * An implementation of [Allocator.PartitionSerialization] that stores partition information in an Arcs
 * collection handle, created by the [EntityHandleManager] provided at construction. The handle
 * will be created the first time any of the publicly exposed methods is called.
 */
@ExperimentalCoroutinesApi
class CollectionHandlePartitionMap(
    private val handleManager: EntityHandleManager
) : Allocator.PartitionSerialization {

    private val log = TaggedLog { "CollectionHandlePartitionMap" }

    private val collectionMutex = Mutex()
    private lateinit var _collection: ReadWriteCollectionHandle<EntityBase>

    private suspend fun collection() = collectionMutex.withLock {
        if (!::_collection.isInitialized) {
            _collection = handleManager.createHandle(
                HandleSpec(
                    "partitions",
                    HandleMode.ReadWrite,
                    HandleContainerType.Collection,
                    EntityBaseSpec(SCHEMA)
                ),
                STORAGE_KEY
            ) as ReadWriteCollectionHandle<EntityBase>
        }
        _collection.awaitReady()
        _collection
    }

    /** Persists [ArcId] and associated [Plan.Partition]s */
    override suspend fun set(arcId: ArcId, partitions: List<Plan.Partition>) {
        log.debug { "writePartitionMap(arcId=$arcId)" }

        val writes = withContext(collection().dispatcher) {
            partitions.map { partition ->
                val entity = EntityBase("EntityBase", SCHEMA)
                entity.setSingletonValue("arc", arcId.toString())
                entity.setSingletonValue("host", partition.arcHost)
                entity.setCollectionValue(
                    "particles",
                    partition.particles.map { it.particleName }.toSet()
                )
                log.debug { "Writing $entity" }
                collection().store(entity)
            }
        }

        writes.joinAll()
    }

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
    override suspend fun readPartitions(arcId: ArcId): List<Plan.Partition> =
        entitiesForArc(arcId).map { entityToPartition(it) }

    /**
     * Reads associated [PlanPartition]s with an [ArcId] and then immediately clears the entries
     * for that [Arcid].
     */
    override suspend fun readAndClearPartitions(arcId: ArcId): List<Plan.Partition> {
        val entities = entitiesForArc(arcId)
        val removals = withContext(collection().dispatcher) {
            entities.map { collection().remove(it) }
        }
        removals.joinAll()
        return entities.map { entityToPartition(it) }
    }

    /** Looks up [RawEntity]s representing [PlanPartition]s for a given [ArcId] */
    private suspend fun entitiesForArc(arcId: ArcId): List<EntityBase> {
        return withContext(collection().dispatcher) {
            collection().fetchAll()
        }.filter { it.getSingletonValue("arc") == arcId.toString() }
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
    }
}
