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

package arcs.core.storage

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtModel
import arcs.core.crdt.CrdtModelType
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.VersionMap
import arcs.core.data.CollectionType
import arcs.core.data.FieldName
import arcs.core.data.RawEntity
import arcs.core.data.ReferenceType
import arcs.core.data.SingletonType
import arcs.core.data.util.ReferencableList
import arcs.core.storage.referencemode.BridgingOperation
import arcs.core.storage.referencemode.RefModeStoreData
import arcs.core.storage.referencemode.RefModeStoreOp
import arcs.core.storage.referencemode.RefModeStoreOutput
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.referencemode.sanitizeForRefModeStore
import arcs.core.storage.referencemode.toBridgingData
import arcs.core.storage.referencemode.toBridgingOp
import arcs.core.storage.referencemode.toBridgingOps
import arcs.core.storage.util.HoldQueue
import arcs.core.storage.util.OperationQueue
import arcs.core.storage.util.SimpleQueue
import arcs.core.storage.util.callbackManager
import arcs.core.type.Type
import arcs.core.util.Random
import arcs.core.util.Result
import arcs.core.util.TaggedLog
import arcs.core.util.Time
import arcs.core.util.computeNotNull
import arcs.core.util.nextVersionMapSafeString
import arcs.core.util.nextSafeRandomLong
import arcs.flags.BuildFlags
import kotlin.properties.Delegates
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** This is a convenience for the parameter type of [handleContainerMessage]. */
internal typealias ContainerProxyMessage = ProxyMessage<CrdtData, CrdtOperation, Referencable>

/** This is a convenience for the parameter type of [handleBackingStoreMessage]. */
internal typealias BackingStoreProxyMessage =
  ProxyMessage<CrdtEntity.Data, CrdtEntity.Operation, CrdtEntity>

/** This is a convenience for the parameter type of [handleProxyMessage]. */
internal typealias RefModeProxyMessage =
  ProxyMessage<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput>

/**
 * [ReferenceModeStore]s adapt between a collection ([CrdtSet] or [CrdtSingleton]) of entities from
 * the perspective of their public API, and a collection of references + a backing store of entity
 * CRDTs from an internal storage perspective.
 *
 * [ReferenceModeStore]s maintain a queue of incoming updates (the receiveQueue) and process them
 * one at a time. When possible, the results of this processing are immediately sent upwards (to
 * connected StorageProxies) and downwards (to storage). However, there are a few caveats:
 * * incoming operations and models from StorageProxies may require several writes to storage - one
 *   for each modified entity, and one to the container store. These are processed serially, so that
 *   a container doesn't get updated if backing store modifications fail.
 * * updates from the container store need to be blocked on ensuring the required data is also
 *   available in the backing store. The holdQueue ensures that these blocks are tracked and
 *   processed appropriately.
 * * updates should always be sent in order, so a blocked send should block subsequent sends too.
 *   The pendingSends queue ensures that all outgoing updates are sent in the correct order.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class ReferenceModeStore private constructor(
  options: StoreOptions,
  /* internal */
  val containerStore: DirectStore<CrdtData, CrdtOperation, Any?>,
  /* internal */
  val backingStore: DirectStoreMuxer<CrdtEntity.Data, CrdtEntity.Operation, CrdtEntity>,
  private val scope: CoroutineScope,
  private val devTools: DevToolsForRefModeStore?,
  private val time: Time
) : ActiveStore<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput>(options) {
  // TODO(#5551): Consider including a hash of the storage key in log prefix.
  private val log = TaggedLog { "ReferenceModeStore" }

  /**
   * A queue of incoming updates from the backing store, container store, and connected proxies.
   */
  private val receiveQueue: OperationQueue = SimpleQueue(
    onEmpty = {
      if (callbacks.hasBecomeEmpty()) {
        backingStore.clearStoresCache()
      }
    }
  )

  /**
   * Registered callbacks to Storage Proxies.
   */
  private val callbacks =
    callbackManager<ProxyMessage<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput>>(
      "reference",
      Random
    )

  /**
   * A queue of functions that will trigger callback executions.
   */
  private val sendQueue: OperationQueue = SimpleQueue()

  /**
   * References that need to be resolved and the completion jobs to trigger once they are.
   *
   * Actions will be dispatched on the [sendQueue] provided here at construction.
   */
  private val holdQueue = HoldQueue(sendQueue)

  /**
   * [Type] of data managed by the [backingStore] and tracked in the [containerStore].
   */
  private val crdtType: CrdtModelType<CrdtData, CrdtOperation, Referencable>

  /**
   * A randomly generated key that is used for synthesized entity CRDT modifications.
   *
   * When entity updates are received by instances of [ReferenceModeStore], they're non-CRDT blobs
   * of data. The [ReferenceModeStore] needs to convert them to tracked CRDTs, which means it
   * needs to synthesize updates. This key is used as the unique write key and
   * [arcs.core.crdt.internal.Actor] for those updates.
   */
  /* internal */ val crdtKey = if (!BuildFlags.STORAGE_STRING_REDUCTION) {
    Random.nextSafeRandomLong().toString()
  } else {
    Random.nextVersionMapSafeString(10)
  }

  /**
   * The [versions] map transitively tracks the maximum write version for each contained entity's
   * fields, to ensure synthesized updates can be correctly applied downstream.
   *
   * All access to this map should be synchronized.
   */
  private var versions = mutableMapOf<ReferenceId, MutableMap<FieldName, Int>>()

  /**
   * Callback Id of the callback that the [ReferenceModeStore] registered with the backing store.
   *
   * This is visible only for tests. Do not use outside of [ReferenceModeStore] other than for
   * tests.
   */
  var backingStoreId by Delegates.notNull<Int>()

  /**
   * Callback Id of the callback that the [ReferenceModeStore] registered with the container store.
   *
   * This is visible only for tests. Do not use outside of [ReferenceModeStore] other than for
   * tests.
   */
  var containerStoreId by Delegates.notNull<Int>()

  /** VisibleForTesting */
  val holdQueueEmpty get() = holdQueue.queue.size == 0

  init {
    @Suppress("UNCHECKED_CAST")
    crdtType = requireNotNull(
      type as? Type.TypeContainer<CrdtModelType<CrdtData, CrdtOperation, Referencable>>
    ) { "Provided type must contain CrdtModelType" }.containedType
  }

  override suspend fun idle() {
    backingStore.idle()
    containerStore.idle()
    receiveQueue.idle()
  }

  override suspend fun on(
    callback: ProxyCallback<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput>
  ): CallbackToken = callbacks.register(callback::invoke)

  override suspend fun off(callbackToken: CallbackToken) {
    callbacks.unregister(callbackToken)
    // Enqueue something, in case the queue was already empty, since queue transitioning
    // to empty is what triggers potential cleanup.
    receiveQueue.enqueue { }
  }

  override fun close() {
    scope.launch {
      receiveQueue.enqueue {
        containerStore.close()
        backingStore.clearStoresCache()
      }
    }
  }

  /*
   * Messages are enqueued onto an object-wide queue and processed in order.
   * Internally, each handler (handleContainerStore, handleBackingStore, handleProxyMessage)
   * should not return until the response relevant to the message has been received.
   *
   * When handling proxy messages, this implies 2 rounds of update - first the backing
   * store needs to be updated, and once that has completed then the container store needs
   * to be updated.
   */
  @Suppress("UNCHECKED_CAST")
  override suspend fun onProxyMessage(
    message: ProxyMessage<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput>
  ) {
    log.verbose { "onProxyMessage: $message" }
    val refModeMessage = message.sanitizeForRefModeStore(type)
    devTools?.onRefModeStoreProxyMessage(message as UntypedProxyMessage)
    receiveQueue.enqueueAndWait {
      handleProxyMessage(refModeMessage)
    }
  }

  /**
   * Handle an update from an upstream StorageProxy.
   *
   * Model and Operation updates apply first to the backing store, then to the container store.
   * Backing store updates should never fail as updates are locally generated.
   *
   * For Operations:
   * * If the container store update succeeds, then the update is mirrored to non-sending
   *   StorageProxies.
   * * If the container store update fails, then a `false` return value ensures that the upstream
   *   proxy will request a sync.
   *
   * Model updates should not fail.
   *
   * Sync requests are handled by directly constructing and sending a model.
   */
  @Suppress("UNCHECKED_CAST")
  private suspend fun handleProxyMessage(proxyMessage: RefModeProxyMessage) {
    log.verbose { "handleProxyMessage: $proxyMessage" }
    suspend fun itemVersionGetter(item: RawEntity): VersionMap {
      val localBackingVersion = getLocalData(item.id).versionMap
      if (localBackingVersion.isNotEmpty()) return localBackingVersion

      updateBackingStore(item)

      return requireNotNull(getLocalData(item.id)).versionMap
    }

    when (proxyMessage) {
      is ProxyMessage.Operations -> {
        val containerOps = mutableListOf<CrdtOperation>()
        val upstreamOps = mutableListOf<RefModeStoreOp>()
        val ops = if (BuildFlags.REFERENCE_MODE_STORE_FIXES) {
          proxyMessage.operations.toBridgingOps(
            backingStore.storageKey,
            ::itemVersionGetter
          )
        } else {
          proxyMessage.operations.toBridgingOps(
            backingStore.storageKey
          )
        }
        ops.forEach { op ->
          when (op) {
            is BridgingOperation.UpdateSingleton,
            is BridgingOperation.ClearSingleton -> {
              // Free up the memory used by the previous instance (for a Singleton,
              // there would be only one instance).
              backingStore.clearStoresCache()
              op.entityValue?.let { updateBackingStore(it) }
            }

            is BridgingOperation.AddToSet ->
              op.entityValue?.let { updateBackingStore(it) }

            is BridgingOperation.RemoveFromSet -> clearEntityInBackingStore(op.referenceId)

            is BridgingOperation.ClearSet -> clearAllEntitiesInBackingStore()
          }

          if (BuildFlags.BATCH_CONTAINER_STORE_OPS) {
            containerOps.add(op.containerOp)
            upstreamOps.add(op.refModeOp)
          } else {
            containerStore.onProxyMessage(
              ProxyMessage.Operations(listOf(op.containerOp), containerStoreId)
            )
            sendQueue.enqueue {
              val upstream = listOf(op.refModeOp)
              callbacks.allCallbacksExcept(proxyMessage.id).forEach { callback ->
                callback(
                  ProxyMessage.Operations(upstream, id = proxyMessage.id)
                )
              }
            }
          }
        }
        if (BuildFlags.BATCH_CONTAINER_STORE_OPS) {
          containerStore.onProxyMessage(
            ProxyMessage.Operations(containerOps, containerStoreId)
          )
          sendQueue.enqueue {
            callbacks.allCallbacksExcept(proxyMessage.id).forEach { callback ->
              callback(
                ProxyMessage.Operations(upstreamOps, id = proxyMessage.id)
              )
            }
          }
        }
      }
      is ProxyMessage.ModelUpdate -> {
        val newModelsResult = proxyMessage.model.toBridgingData(
          backingStore.storageKey,
          ::itemVersionGetter
        )
        when (newModelsResult) {
          is Result.Ok -> {
            newModelsResult.value.backingModels.forEach { updateBackingStore(it) }
            containerStore.onProxyMessage(
              ProxyMessage.ModelUpdate(
                newModelsResult.value.collectionModel.data,
                id = containerStoreId
              )
            )
            sendQueue.enqueue {
              callbacks.allCallbacksExcept(proxyMessage.id).forEach { callback ->
                callback(proxyMessage)
              }
            }
          }
          else -> return
        }
      }
      is ProxyMessage.SyncRequest -> {
        val (pendingIds, model) =
          constructPendingIdsAndModel(containerStore.getLocalData())

        suspend fun sender() {
          callbacks.getCallback(requireNotNull(proxyMessage.id))
            ?.invoke(
              ProxyMessage.ModelUpdate(model() as RefModeStoreData, proxyMessage.id)
            )
        }

        if (pendingIds.isEmpty()) {
          sendQueue.enqueue(::sender)
        } else {

          addToHoldQueueFromReferences(
            pendingIds,
            onTimeout = { handlePendingReferenceTimeout(proxyMessage) }
          ) {
            sender()
          }
        }
      }
    }
  }

  private suspend fun handlePendingReferenceTimeout(proxyMessage: RefModeProxyMessage) {
    // If the queued+blocked send item times out (likely due to missing data in
    // the backing-store), assume that the backing store is corrupted and
    // clear-out the collection store before re-attempting the sync.
    val ops = buildClearContainerStoreOps()
    log.info {
      "SyncRequest timed out after $BLOCKING_QUEUE_TIMEOUT_MILLIS " +
        "milliseconds, backing store is likely corrupted - sending " +
        "clear operations to container store."
    }
    log.verbose { "Clear ops = $ops" }
    containerStore.onProxyMessage(ProxyMessage.Operations(ops, containerStoreId))

    onProxyMessage(proxyMessage)
  }

  /**
   * Handles an update from the [backingStore].
   *
   * Model and Operation updates are routed directly to the [sendQueue], where they may unblock
   * pending sends but will not have any other action.
   *
   * Syncs should never occur as operation/model updates to the backing store are generated
   * by this [ReferenceModeStore] object and hence should never be out-of-order.
   */
  private suspend fun handleBackingStoreMessage(
    proxyMessage: BackingStoreProxyMessage,
    muxId: String
  ): Boolean {
    when (proxyMessage) {
      is ProxyMessage.ModelUpdate ->
        holdQueue.processReferenceId(muxId, proxyMessage.model.versionMap)
      // TODO(b/161912425) Verify the versionMap checking logic here.
      is ProxyMessage.Operations -> if (proxyMessage.operations.isNotEmpty()) {
        holdQueue.processReferenceId(muxId, proxyMessage.operations.last().versionMap)
      }
      is ProxyMessage.SyncRequest ->
        throw IllegalArgumentException("Unexpected SyncRequest from the backing store")
    }
    return true
  }

  /**
   * Handles an update from the [containerStore].
   *
   * Operations and Models either enqueue an immediate send (if all referenced entities are
   * available in the backing store) or enqueue a blocked send (if some referenced entities are
   * not yet present or are at the incorrect version).
   *
   * Sync requests are propagated upwards to the storage proxy.
   */
  private suspend fun handleContainerMessage(proxyMessage: ContainerProxyMessage): Boolean {
    when (proxyMessage) {
      is ProxyMessage.Operations -> {
        val containerOps = proxyMessage.operations
        opLoop@ for (op in containerOps) {
          val reference = when (op) {
            is CrdtSet.Operation.Add<*> -> op.added as RawReference
            is CrdtSingleton.Operation.Update<*> -> op.value as RawReference
            else -> null
          }
          val getEntity = if (reference != null) {
            val entityCrdt = getLocalData(reference.id) as? CrdtEntity.Data
            if (entityCrdt == null) {
              addToHoldQueueFromReferences(
                listOf(reference),
                onTimeout = {}
              ) {
                val updated =
                  getLocalData(reference.id) as? CrdtEntity.Data

                // Bridge the op from the collection using the RawEntity from the
                // backing store, and use the refModeOp for sending back to the
                // proxy.
                val upstreamOps = listOf(
                  op.toBridgingOp(updated?.toRawEntity(reference.id)).refModeOp
                )

                callbacks.allCallbacksExcept(proxyMessage.id).forEach { callback ->
                  callback(
                    ProxyMessage.Operations(
                      operations = upstreamOps,
                      id = proxyMessage.id
                    )
                  )
                }
              }
              continue@opLoop
            }
            suspend { entityCrdt.toRawEntity(reference.id) }
          } else {
            suspend { null }
          }

          sendQueue.enqueue {
            val upstream = listOf(op.toBridgingOp(getEntity()).refModeOp)
            callbacks.allCallbacksExcept(proxyMessage.id).forEach { callback ->
              callback(
                ProxyMessage.Operations(upstream, id = proxyMessage.id)
              )
            }
          }
        }
      }
      is ProxyMessage.ModelUpdate -> {
        val data = proxyMessage.model
        val (pendingIds, model) = constructPendingIdsAndModel(data)

        suspend fun sender() {
          // TODO? Typescript doesn't pass an id.
          callbacks.callbacks.forEach { callback ->
            callback(ProxyMessage.ModelUpdate(model() as RefModeStoreData, id = proxyMessage.id))
          }
        }

        if (pendingIds.isEmpty()) {
          sendQueue.enqueue(::sender)
        } else {
          addToHoldQueueFromReferences(
            pendingIds,
            onTimeout = {},
            ::sender
          )
        }
      }
      is ProxyMessage.SyncRequest -> sendQueue.enqueue {
        // TODO? Typescript doesn't pass an id.
        callbacks.callbacks.forEach { callback ->
          callback(ProxyMessage.SyncRequest(id = proxyMessage.id))
        }
      }
    }
    removeUnusedEntityVersions(proxyMessage)
    return true
  }

  /* Removes entries from the entities versions, if they were removed from the container store. */
  private fun removeUnusedEntityVersions(proxyMessage: ContainerProxyMessage) =
    synchronized(versions) {
      when (proxyMessage) {
        is ProxyMessage.Operations ->
          proxyMessage.operations.forEach { op ->
            when (op) {
              is CrdtSet.Operation.Remove<*> -> versions.remove(op.removed)
              is CrdtSet.Operation.Clear<*> -> versions.clear()
              is CrdtSet.Operation.FastForward<*> -> versions.keys.removeAll(op.removed)
            }
          }
        is ProxyMessage.ModelUpdate -> {
          if (proxyMessage.model is CrdtSet.Data<*>) {
            val keys =
              (proxyMessage.model as CrdtSet.Data<*>).values.keys.filter { versions.contains(it) }
            versions = keys.associateWithTo(mutableMapOf()) { versions[it]!! }
          }
        }
        is ProxyMessage.SyncRequest -> return
      }
    }

  private fun newBackingInstance(): CrdtModel<CrdtData, CrdtOperation, Referencable> =
    crdtType.createCrdtModel()

  /**
   * Gets data from the Backing Store with the corresponding [referenceId]
   *
   * This is visible for tests. Do not otherwise use outside of [ReferenceModeStore]
   */
  suspend fun getLocalData(referenceId: String) =
    backingStore.getLocalData(referenceId, backingStoreId)

  /** Write the provided entity to the backing store. */
  private suspend fun updateBackingStore(referencable: RawEntity) {
    val model = entityToModel(referencable)
    backingStore.onProxyMessage(
      MuxedProxyMessage(referencable.id, ProxyMessage.ModelUpdate(model, id = backingStoreId))
    )
  }

  /** Clear the provided entity in the backing store. */
  private suspend fun clearEntityInBackingStore(referencableId: ReferenceId) {
    val op = listOf(CrdtEntity.Operation.ClearAll(crdtKey, entityVersionMap(referencableId)))
    backingStore.onProxyMessage(
      MuxedProxyMessage<CrdtEntity.Data, CrdtEntity.Operation, CrdtEntity>(
        referencableId,
        ProxyMessage.Operations(op, id = backingStoreId)
      )
    )
  }

  /** Clear all entities from the backing store, using the container store to retrieve the ids. */
  private suspend fun clearAllEntitiesInBackingStore() {
    val containerModel = containerStore.getLocalData()
    if (containerModel !is CrdtSet.Data<*>) {
      throw UnsupportedOperationException()
    }
    containerModel.values.forEach { (refId, data) ->
      val clearOp = listOf(CrdtEntity.Operation.ClearAll(crdtKey, data.versionMap))
      backingStore.onProxyMessage(
        MuxedProxyMessage<CrdtEntity.Data, CrdtEntity.Operation, CrdtEntity>(
          refId,
          ProxyMessage.Operations(clearOp, id = backingStoreId)
        )
      )
    }
  }

  /**
   * Returns a function that can construct a [RefModeStoreData] object of a Container of Entities
   * based off the provided Container of References or a container of references from a provided
   * [RefModeStoreData].
   *
   * Any referenced IDs that are not yet available in the backing store are returned in the list
   * of pending [RawReference]s. The returned function should not be invoked until all references in
   * pendingIds have valid backing in the backing store.
   *
   * [RawEntity] objects come from the storage proxy, and [RawReference] objects come from the
   * [containerStore].
   */
  @Suppress("UNCHECKED_CAST")
  private suspend fun constructPendingIdsAndModel(
    data: CrdtData
  ): Pair<List<RawReference>, suspend () -> CrdtData> {
    val pendingIds = mutableListOf<RawReference>()

    // We can use one mechanism to calculate pending values because both CrdtSet.Data and
    // CrdtSingleton.Data's `values` param are maps of ReferenceIds to CrdtSet.DataValue
    // objects.
    suspend fun calculatePendingIds(
      dataValues: Map<ReferenceId, CrdtSet.DataValue<out Referencable>>
    ) {
      // Find any pending ids given the reference ids of the data values.
      dataValues.forEach { (refId, dataValue) ->
        val version = (dataValue.value as? RawReference)?.version ?: dataValue.versionMap

        // This object is requested at an empty version, which means that it's new and
        // can be directly constructed rather than waiting for an update.
        if (version.isEmpty()) return@forEach

        val backingModel = getLocalData(refId)

        if (BuildFlags.REFERENCE_MODE_STORE_FIXES) {
          // if the backing store version is not newer than the version that was requested, consider
          // it pending.
          if (backingModel.versionMap doesNotDominate version) {
            pendingIds += RawReference(refId, backingStore.storageKey, version)
          }
        } else {
          // If the version that was requested is newer than what the backing store has,
          // consider it pending.
          if (version dominates backingModel.versionMap) {
            pendingIds += RawReference(refId, backingStore.storageKey, version)
          }
        }
      }
    }

    // Loads a CrdtSingleton/CrdtSet.Data object's values map with RawEntities, when that object
    // is intended to be sent to the storage proxy.
    suspend fun proxyFromCollection(
      incoming: Map<ReferenceId, CrdtSet.DataValue<out Referencable>>
    ): MutableMap<ReferenceId, CrdtSet.DataValue<RawEntity>> {
      val outgoing = mutableMapOf<ReferenceId, CrdtSet.DataValue<RawEntity>>()
      incoming.forEach { (refId, value) ->
        val version = value.versionMap
        val entity = if (version.isEmpty()) {
          newBackingInstance().data as CrdtEntity.Data
        } else {
          getLocalData(refId)
        }
        outgoing[refId] = CrdtSet.DataValue(version.copy(), entity.toRawEntity(refId))
      }
      return outgoing
    }

    // Loads a CrdtSingleton/CrdtSet.Data object's values map with References, when that object
    // is intended to be sent to the collectionStore.
    fun collectionFromProxy(
      incoming: Map<ReferenceId, CrdtSet.DataValue<out Referencable>>
    ): MutableMap<ReferenceId, CrdtSet.DataValue<RawReference>> {
      val outgoing = mutableMapOf<ReferenceId, CrdtSet.DataValue<RawReference>>()
      incoming.forEach { (refId, value) ->
        val version = value.versionMap
        outgoing[refId] = CrdtSet.DataValue(
          version.copy(),
          RawReference(refId, backingStore.storageKey, version.copy())
        )
      }
      return outgoing
    }

    // Incoming `data` is either CrdtSet.Data or CrdtSingleton.Data
    val dataVersionCopy = data.versionMap.copy()
    val modelGetter = when (data) {
      is CrdtSingleton.Data<*> -> {
        calculatePendingIds(data.values)

        val containerData = data as? CrdtSingleton.Data<RawReference>
        val proxyData = data as? CrdtSingleton.Data<RawEntity>
        when {
          // If its type is `Reference` it must be coming from the container, so generate
          // a function which returns a RawEntity-based Data that can be sent to the
          // storage proxy.
          containerData != null -> {
            val valuesCopy = HashMap(data.values)
            suspend {
              RefModeStoreData.Singleton(
                dataVersionCopy, proxyFromCollection(valuesCopy)
              )
            }
          }
          // If its type is `RawEntity`, it must be coming from the proxy, so generate a
          // Reference-based data that can be sent to the container store.
          proxyData != null -> {
            val valuesCopy = HashMap(data.values)
            suspend {
              CrdtSingleton.DataImpl(dataVersionCopy, collectionFromProxy(valuesCopy))
            }
          }
          else -> throw CrdtException("Invalid data type for constructPendingIdsAndModel")
        }
      }
      is CrdtSet.Data<*> -> {
        calculatePendingIds(data.values)

        val containerData = data as? CrdtSet.Data<RawReference>
        val proxyData = data as? CrdtSet.Data<RawEntity>
        when {
          // If its type is `Reference` it must be coming from the container, so generate
          // a function which returns a RawEntity-based Data that can be sent to the
          // storage proxy.
          containerData != null -> {
            val valuesCopy = HashMap(data.values)
            suspend {
              RefModeStoreData.Set(
                dataVersionCopy, proxyFromCollection(valuesCopy)
              )
            }
          }
          // If its type is `RawEntity`, it must be coming from the proxy, so generate a
          // Reference-based data that can be sent to the container store.
          proxyData != null -> {
            val valuesCopy = HashMap(data.values)
            suspend {
              CrdtSet.DataImpl(dataVersionCopy, collectionFromProxy(valuesCopy))
            }
          }
          else -> throw CrdtException("Invalid data type for constructPendingIdsAndModel")
        }
      }
      else -> throw CrdtException("Invalid data type for constructPendingIdsAndModel")
    }

    return pendingIds to modelGetter
  }

  private fun entityVersionMap(entityId: ReferenceId): VersionMap {
    val version = versions[entityId]?.values?.maxOrNull()
    return version?.let { VersionMap(crdtKey to it) } ?: VersionMap()
  }

  /**
   * Convert the provided entity to a CRDT Model of the entity. This requires synthesizing
   * a version map for the CRDT model, which is also provided as an output.
   */
  private fun entityToModel(entity: RawEntity): CrdtEntity.Data = synchronized(versions) {
    val entityVersions = versions.getOrPut(entity.id) { mutableMapOf() }
    var maxVersion = 0

    val fieldVersionProvider = { fieldName: FieldName ->
      VersionMap(crdtKey to requireNotNull(entityVersions[fieldName]))
    }

    entity.singletons.forEach { (fieldName, _) ->
      val fieldVersion =
        entityVersions.computeNotNull(fieldName) { _, version -> (version ?: 0) + 1 }
      maxVersion = maxOf(maxVersion, fieldVersion)
    }
    entity.collections.forEach { (fieldName, _) ->
      val fieldVersion =
        entityVersions.computeNotNull(fieldName) { _, version -> (version ?: 0) + 1 }
      maxVersion = maxOf(maxVersion, fieldVersion)
    }

    return CrdtEntity.Data(
      entity,
      VersionMap(crdtKey to maxVersion),
      fieldVersionProvider
    ) {
      when (it) {
        is RawReference -> it
        is RawEntity -> CrdtEntity.Reference.wrapReferencable(it)
        is ReferencableList<*> -> CrdtEntity.Reference.wrapReferencable(it)
        else -> CrdtEntity.Reference.buildReference(it)
      }
    }
  }

  private fun buildClearContainerStoreOps(): List<CrdtOperation> {
    val containerModel = containerStore.getLocalData()
    val actor = "ReferenceModeStore(${hashCode()})"
    val containerVersion = containerModel.versionMap.copy()
    return listOf(
      when (containerModel) {
        is CrdtSet.Data<*> ->
          CrdtSet.Operation.Clear<RawReference>(actor, containerVersion)
        is CrdtSingleton.Data<*> ->
          CrdtSingleton.Operation.Clear<RawReference>(actor, containerVersion)
        else -> throw UnsupportedOperationException()
      }
    )
  }

  private suspend fun addToHoldQueueFromReferences(
    refs: Collection<RawReference>,
    onTimeout: suspend () -> Unit,
    onRelease: suspend () -> Unit
  ): Int {
    // Start a job that delays for the configured timeout amount, and if still active by the
    // time the deadline is reached, runs that clears the store to remove potentially stale
    // references.
    val timeoutJob = scope.launch {
      delay(BLOCKING_QUEUE_TIMEOUT_MILLIS)
      holdQueue.removePendingIds(refs.map { it.id })
      onTimeout()
    }

    return holdQueue.enqueue(
      refs.map {
        HoldQueue.Entity(it.id, it.version?.copy())
      },
      {
        try {
          onRelease()
        } finally {
          timeoutJob.cancel()
        }
      }
    )
  }

  companion object {
    /**
     * Timeout duration in milliseconds we are allowed to wait for results from the
     * [BackingStore] during a [SyncRequest].
     *
     * If this timeout is exceeded, we will assume the backing store is corrupt and will log a
     * warning and clear the container store.
     *
     * This timeout value is high because we don't want to be too aggressive with clearing the
     * container store, while also avoiding a scenario where the [ReferenceModeStore] is hung
     * up forever.
     */
    /* internal */ var BLOCKING_QUEUE_TIMEOUT_MILLIS = 30000L

    @Suppress("UNCHECKED_CAST")
    suspend fun create(
      options: StoreOptions,
      scope: CoroutineScope,
      driverFactory: DriverFactory,
      writeBackProvider: WriteBackProvider,
      devTools: DevToolsForStorage?,
      time: Time
    ): ReferenceModeStore {
      val refableOptions =
        requireNotNull(
          /* ktlint-disable max-line-length */
          options as? StoreOptions
          /* ktlint-enable max-line-length */
        ) { "ReferenceMode stores only manage singletons/collections of Entities." }

      val (type, _) = requireNotNull(
        options.type as? Type.TypeContainer<*>
      ) { "Type ${options.type} does not implement TypeContainer" }.let {
        /* ktlint-disable max-line-length */
        it to requireNotNull(it.containedType as? CrdtModelType<*, *, *>).crdtModelDataClass
        /* ktlint-enable max-line-length */
      }
      val storageKey = requireNotNull(options.storageKey as? ReferenceModeStorageKey) {
        "StorageKey ${options.storageKey} is not a ReferenceModeStorageKey"
      }
      val refType = if (options.type is CollectionType<*>) {
        CollectionType(ReferenceType(type.containedType))
      } else {
        SingletonType(ReferenceType(type.containedType))
      }

      val containerStore = DirectStore.create<CrdtData, CrdtOperation, Any?>(
        StoreOptions(
          storageKey = storageKey.storageKey,
          type = refType,
          versionToken = options.versionToken
        ),
        scope = scope,
        driverFactory = driverFactory,
        writeBackProvider = writeBackProvider,
        devTools = devTools
      )

      val backingStore = DirectStoreMuxerImpl<CrdtEntity.Data, CrdtEntity.Operation, CrdtEntity>(
        storageKey = storageKey.backingKey,
        backingType = type.containedType,
        scope = scope,
        driverFactory = driverFactory,
        writeBackProvider = writeBackProvider,
        devTools = devTools,
        time = time
      )

      return ReferenceModeStore(
        refableOptions,
        containerStore,
        backingStore,
        scope,
        devTools?.forRefModeStore(options),
        time
      ).also { refModeStore ->
        // Since `on` is a suspending method, we need to setup both the container store callback and
        // the backing store callback here in this create method, which is inside of a coroutine.
        refModeStore.containerStoreId = containerStore.on {
          refModeStore.receiveQueue.enqueue {
            refModeStore.handleContainerMessage(it as ContainerProxyMessage)
          }
        }
        refModeStore.backingStoreId = refModeStore.backingStore.on {
          refModeStore.receiveQueue.enqueue {
            refModeStore.handleBackingStoreMessage(it.message, it.muxId)
          }
        }
      }
    }
  }
}
