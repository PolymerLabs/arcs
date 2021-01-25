package arcs.core.allocator

import arcs.core.common.ArcId
import arcs.core.common.Id
import arcs.core.data.Annotation
import arcs.core.data.Capabilities
import arcs.core.data.CreatableStorageKey
import arcs.core.data.Plan
import arcs.core.entity.HandleSpec
import arcs.core.storage.CapabilitiesResolver
import arcs.core.storage.StorageKey
import arcs.core.type.Type
import arcs.core.util.plus
import arcs.core.util.traverse
import kotlinx.coroutines.ExperimentalCoroutinesApi

/** Default implementation of [Allocator.StorageKeyCreator]. */
@OptIn(ExperimentalCoroutinesApi::class)
class DefaultStorageKeyCreator : Allocator.StorageKeyCreator {

  override fun createStorageKeysIfNecessary(
    arcId: ArcId,
    idGenerator: Id.Generator,
    plan: Plan
  ): Plan {
    val createdKeys: MutableMap<StorageKey, StorageKey> = mutableMapOf()
    val allHandles = Plan.particleLens.traverse() + Plan.Particle.handlesLens.traverse()

    return allHandles.mod(plan) { handle ->
      (Plan.HandleConnection.handleLens + Plan.Handle.storageKeyLens).mod(handle) {
        replaceCreatedKey(
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

  private fun replaceCreatedKey(
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
}
