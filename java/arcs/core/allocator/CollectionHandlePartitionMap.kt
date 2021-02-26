package arcs.core.allocator

import arcs.core.common.ArcId
import arcs.core.common.SuspendableLazy
import arcs.core.common.toArcId
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.HandleMode
import arcs.core.data.Plan
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.entity.EntityBase
import arcs.core.entity.EntityBaseSpec
import arcs.core.entity.HandleSpec
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.awaitReady
import arcs.core.host.HandleManager
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.TaggedLog
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.withContext

/**
 * An implementation of [Allocator.PartitionSerialization] that stores partition information in an
 * Arcs collection handle, created by the [HandleManager] provided at construction. The handle
 * will be created the first time any of the publicly exposed methods is called.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class CollectionHandlePartitionMap(
  private val handleManager: HandleManager
) : Allocator.PartitionSerialization {

  private val log = TaggedLog { "CollectionHandlePartitionMap" }

  @Suppress("UNCHECKED_CAST")
  private val collection = SuspendableLazy {
    val entitySpec = EntityBaseSpec(SCHEMA)
    val handle = handleManager.createHandle(
      HandleSpec(
        "partitions",
        HandleMode.ReadWrite,
        CollectionType(EntityType(entitySpec.SCHEMA)),
        entitySpec
      ),
      STORAGE_KEY
    ) as ReadWriteCollectionHandle<EntityBase>
    handle.awaitReady()
  }

  /** Persists [ArcId] and associated [Plan.Partition]s. */
  override suspend fun set(partitions: List<Plan.Partition>) {
    val arcId = partitions.arcId()
    check(partitions.all { it.arcId.toArcId() == arcId }) {
      "All partitions must have the same Arc ID."
    }

    log.debug { "writePartitionMap(arcId=${partitions.arcId()})" }

    val currentPartitions = readPartitions(arcId)
    if (currentPartitions.isNotEmpty()) {
      check(
        partitions.size == currentPartitions.size && partitions.containsAll(currentPartitions)
      ) {
        "Unexpected plan partitions not matching existing ones."
      }
      return
    }

    val writes = withContext(collection().dispatcher) {
      partitions.map { (_, arcHost, particles) ->
        val entity = EntityBase("EntityBase", SCHEMA)
        entity.setSingletonValue("arc", arcId.toString())
        entity.setSingletonValue("host", arcHost)
        entity.setCollectionValue(
          "particles",
          particles.map { it.particleName }.toSet()
        )
        log.debug { "Writing $entity" }
        collection().store(entity)
      }
    }

    writes.joinAll()
  }

  /** Reads associated [Plan.Partition]s with an [ArcId]. */
  override suspend fun readPartitions(arcId: ArcId): List<Plan.Partition> =
    entitiesForArc(arcId).map { entityToPartition(it) }

  /**
   * Reads associated [Plan.Partition]s with an [ArcId] and then immediately clears the entries
   * for that [ArcId].
   */
  override suspend fun readAndClearPartitions(arcId: ArcId): List<Plan.Partition> {
    val entities = entitiesForArc(arcId)
    val removals = withContext(collection().dispatcher) {
      entities.map { collection().remove(it) }
    }
    removals.joinAll()
    return entities.map { entityToPartition(it) }
  }

  /** Converts a [RawEntity] to a [Plan.Partition]. */
  private fun entityToPartition(entity: EntityBase): Plan.Partition =
    Plan.Partition(
      entity.getSingletonValue("arc") as String,
      entity.getSingletonValue("host") as String,
      entity.getCollectionValue("particles").map {
        Plan.Particle(it as String, "", mapOf())
      }
    )

  /** Looks up [RawEntity]s representing [Plan.Partition]s for a given [ArcId]. */
  private suspend fun entitiesForArc(arcId: ArcId): List<EntityBase> {
    return withContext(collection().dispatcher) {
      collection().fetchAll()
    }.filter { it.getSingletonValue("arc") == arcId.toString() }
  }

  companion object {
    /** Schema for persistent storage of [Plan.Partition] information. */
    private val SCHEMA = Schema(
      setOf(SchemaName("partition")),
      SchemaFields(
        mapOf(
          "arc" to FieldType.Text,
          "host" to FieldType.Text
        ),
        mapOf(
          "particles" to FieldType.Text
        )
      ),
      "plan-partition-schema"
    )

    private val STORAGE_KEY = ReferenceModeStorageKey(
      RamDiskStorageKey("partition"),
      RamDiskStorageKey("partitions")
    )

    fun List<Plan.Partition>.arcId(): ArcId {
      return this.first().arcId.toArcId()
    }
  }
}
