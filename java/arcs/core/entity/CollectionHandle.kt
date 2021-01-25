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
package arcs.core.entity

import arcs.core.common.Referencable
import arcs.core.crdt.CrdtSet
import arcs.core.data.RawEntity
import arcs.core.storage.StorageProxy
import arcs.flags.BuildFlagDisabledError
import arcs.flags.BuildFlags
import kotlinx.coroutines.Job

typealias CollectionProxy<T> = StorageProxy<CrdtSet.Data<T>, CrdtSet.IOperation<T>, Set<T>>

/**
 * This class implements all of the methods that are needed by the various collection [Handle]
 * interfaces:
 * * [Handle]
 * * [ReadableHandle]
 * * [ReadCollectionHandle]
 * * [WriteCollectionHandle]
 * * [ReadWriteCollectionHandle]
 * * [QueryCollectionHandle]
 * * [ReadQueryCollectionHandle]
 * * [ReadWriteQueryCollectionHandle]
 *
 * It manages the storage and retrieval of items of the specified [Entity] type, including
 * their conversion to and from the backing [RawEntity] type that the storage layer requires.
 *
 * This class won't be returned directly; instead it will be wrapped in a facade object that
 * exposes only the methods that should be exposed.
 */
class CollectionHandle<T : Storable, R : Referencable>(
  config: Config<T, R>
) : BaseHandle<T>(config), ReadWriteQueryCollectionHandle<T, Any> {
  private val storageProxy = config.proxy
  private val storageAdapter = config.storageAdapter

  init {
    check(spec.containerType == HandleContainerType.Collection) {
      "Collection containerType required for CollectionHandle $name, but got ${spec.containerType}."
    }
  }

  // Filter out expired models.
  private fun fetchValidModels() = checkPreconditions {
    storageProxy.getParticleViewUnsafe().filterNot {
      storageAdapter.isExpired(it)
    }
  }

  // region implement ReadCollectionHandle<T>

  override fun size() = fetchValidModels().size

  override fun isEmpty() = fetchValidModels().isEmpty()

  override fun fetchAll() = checkPreconditions {
    adaptValues(storageProxy.getParticleViewUnsafe())
  }

  override fun fetchById(entityId: String): T? = checkPreconditions {
    storageProxy
      .getParticleViewUnsafe()
      .filter { it.id == entityId && !storageAdapter.isExpired(it) }
      .firstOrNull()
      ?.let { storageAdapter.referencableToStorable(it) }
  }
  // endregion

  // region implement QueryCollectionHandle<T, Any>
  override fun query(args: Any): Set<T> = checkPreconditions {
    adaptValues(queryResults(args))
  }
  // endregion

  // region implement RemoveQueryCollectionHandle<T>
  override fun removeByQuery(args: Any): Job {
    if (!BuildFlags.REMOVE_BY_QUERY_HANDLE) {
      throw BuildFlagDisabledError("REMOVE_BY_QUERY_HANDLE")
    }
    return checkPreconditions {
      val ops = queryResults(args).map { removeOp(it.id) }
      storageProxy.applyOps(ops)
    }
  }
  // endregion

  // region implement WriteCollectionHandle<T>
  override fun store(element: T): Job = storeAll(setOf(element))

  override fun storeAll(elements: Collection<T>): Job = checkPreconditions {
    val versionMap = storageProxy.getVersionMap()
    val ops = elements.map {
      CrdtSet.Operation.Add(
        name,
        versionMap.increment(name).copy(),
        storageAdapter.storableToReferencable(it)
      )
    }
    storageProxy.applyOps(ops)
  }

  override fun clear(): Job = checkPreconditions {
    storageProxy.applyOp(CrdtSet.Operation.Clear(name, storageProxy.getVersionMap()))
  }

  override fun remove(element: T): Job = checkPreconditions {
    val id = checkNotNull(storageAdapter.getId(element)) { "Cannot remove an item without ID." }
    removeById(id)
  }

  override fun removeById(id: String) = checkPreconditions {
    storageProxy.applyOp(removeOp(id))
  }
  // endregion

  // region implement ReadableHandle<T>
  override fun onUpdate(action: (CollectionDelta<T>) -> Unit) =
    storageProxy.addOnUpdate(callbackIdentifier) { oldValue, newValue ->
      val oldIds = oldValue.mapTo(mutableSetOf()) { it.id }
      val newIds = newValue.mapTo(mutableSetOf()) { it.id }
      val added = newValue.filterTo(mutableSetOf()) { it.id !in oldIds }
      val removed = oldValue.filterTo(mutableSetOf()) { it.id !in newIds }
      action(CollectionDelta(adaptValues(added), adaptValues(removed)))
    }

  override fun onDesync(action: () -> Unit) =
    storageProxy.addOnDesync(callbackIdentifier, action)

  override fun onResync(action: () -> Unit) =
    storageProxy.addOnResync(callbackIdentifier, action)

  override suspend fun <E : Entity> createReference(entity: E): Reference<E> {
    val entityId = requireNotNull(entity.entityId) {
      "Entity must have an ID before it can be referenced."
    }

    /**
     * Check existence (do not use expensive [referencableToStorable]).
     *
     * As [CrdtSet.DataImpl.values] is in [MutableMap] type which uses [LinkedHashMap] in
     * kotlin, [CrdtSet] model merging logic is the newest data gets inserted at the head
     * which benefits the fifo traversal to expedites common use-cases i.e.
     * store-then-createReference-immediately from time complexity O(N) to O(1).
     */
    requireNotNull(
      storageProxy.getParticleViewUnsafe().firstOrNull {
        !storageAdapter.isExpired(it) && it.id == entityId
      }
    ) { "Entity is not stored in the Collection." }

    return createReferenceInternal(entity)
  }
  // endregion

  private fun queryResults(args: Any): Set<R> {
    val query = spec.entitySpecs.single().SCHEMA.query ?: return emptySet()
    return storageProxy.getParticleViewUnsafe().filterTo(mutableSetOf()) { entity ->
      check(entity is RawEntity) { "Queries only work with Entity-typed Handles." }
      query(entity, args)
    }
  }

  private fun removeOp(id: String): CrdtSet.IOperation<R> {
    return CrdtSet.Operation.Remove(
      name,
      storageProxy.getVersionMap(),
      id
    )
  }

  private fun adaptValues(values: Set<R>): Set<T> {
    return values.filterNot {
      storageAdapter.isExpired(it)
    }.mapTo(mutableSetOf()) {
      storageAdapter.referencableToStorable(it)
    }
  }

  /** Configuration required to instantiate a [CollectionHandle]. */
  class Config<T : Storable, R : Referencable>(
    /** See [BaseHandleConfig.name]. */
    name: String,
    /** See [BaseHandleConfig.spec]. */
    spec: HandleSpec,
    /**
     * Interface to storage for [RawEntity] objects backing an `entity: T`.
     *
     * See [BaseHandleConfig.storageProxy].
     */
    val proxy: CollectionProxy<R>,
    /** Will ensure that necessary fields are present on the [RawEntity] before storage. */
    val storageAdapter: StorageAdapter<T, R>,
    /** See [BaseHandleConfig.dereferencerFactory]. */
    dereferencerFactory: EntityDereferencerFactory,
    /** See [BaseHandleConfig.particleId]. */
    particleId: String
  ) : BaseHandleConfig(name, spec, proxy, dereferencerFactory, particleId)
}
