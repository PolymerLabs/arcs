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

package arcs.core.storage

import androidx.annotation.VisibleForTesting
import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtModel
import arcs.core.crdt.CrdtModelType
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtOperationAtTime
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
import arcs.core.storage.referencemode.Message
import arcs.core.storage.referencemode.Message.EnqueuedFromBackingStore
import arcs.core.storage.referencemode.Message.EnqueuedFromContainer
import arcs.core.storage.referencemode.Message.EnqueuedFromStorageProxy
import arcs.core.storage.referencemode.Message.PreEnqueuedFromBackingStore
import arcs.core.storage.referencemode.MessageQueue
import arcs.core.storage.referencemode.RefModeStoreData
import arcs.core.storage.referencemode.RefModeStoreOp
import arcs.core.storage.referencemode.RefModeStoreOutput
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.referencemode.sanitizeForRefModeStore
import arcs.core.storage.referencemode.toBridgingData
import arcs.core.storage.referencemode.toBridgingOp
import arcs.core.storage.referencemode.toBridgingOps
import arcs.core.storage.referencemode.toReferenceModeMessage
import arcs.core.storage.util.RandomProxyCallbackManager
import arcs.core.storage.util.SendQueue
import arcs.core.type.Type
import arcs.core.util.Random
import arcs.core.util.Result
import arcs.core.util.TaggedLog
import arcs.core.util.computeNotNull
import arcs.core.util.nextSafeRandomLong
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.coroutineContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.channels.ClosedSendChannelException
import kotlinx.coroutines.channels.ConflatedBroadcastChannel
import kotlinx.coroutines.flow.asFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout

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
@ExperimentalCoroutinesApi
class ReferenceModeStore private constructor(
    options: StoreOptions,
    /* internal */
    val containerStore: DirectStore<CrdtData, CrdtOperation, Any?>,
    /* internal */
    val backingKey: StorageKey,
    /* internal */
    clearCoroutineContext: CoroutineContext = Dispatchers.Default,
    backingType: Type
) : ActiveStore<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput>(options) {
    // TODO(#5551): Consider including a hash of the storage key in log prefix.
    private val log = TaggedLog { "ReferenceModeStore" }

    /**
     * A queue of incoming updates from the backing store, container store, and connected proxies.
     */
    private val receiveQueue by lazy {
        MessageQueue(
            handleProxyMessage,
            handleContainerMessage,
            handleBackingStoreMessage
        )
    }
    /**
     * Registered callbacks to Storage Proxies.
     */
    private val callbacks =
        RandomProxyCallbackManager<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput>(
            "reference",
            Random
        )
    /**
     * A queue of send Runnables. Some of these may be blocked on entities becoming available in the
     * backing store.
     */
    private var sendQueue = SendQueue()
    /**
     * [Type] of data managed by the [backingStore] and tracked in the [containerStore].
     */
    private val crdtType: CrdtModelType<CrdtData, CrdtOperationAtTime, Referencable>
    /**
     * A randomly generated key that is used for synthesized entity CRDT modifications.
     *
     * When entity updates are received by instances of [ReferenceModeStore], they're non-CRDT blobs
     * of data. The [ReferenceModeStore] needs to convert them to tracked CRDTs, which means it
     * needs to synthesize updates. This key is used as the unique write key and
     * [arcs.core.crdt.internal.Actor] for those updates.
     */
    /* internal */ val crdtKey = Random.nextSafeRandomLong().toString()
    /**
     * The [versions] map transitively tracks the maximum write version for each contained entity's
     * fields, to ensure synthesized updates can be correctly applied downstream.
     *
     * All access to this map should be synchronized.
     */
    private val versions = mutableMapOf<ReferenceId, MutableMap<FieldName, Int>>()

    /** Tracks the state of callback: true: active callbacks, false: no callbacks registered. */
    private val callbacksStateChannel = ConflatedBroadcastChannel(true)

    @VisibleForTesting(otherwise = VisibleForTesting.PRIVATE)
    val backingStore = DirectStoreMuxer<CrdtData, CrdtOperation, Any?>(
        storageKey = backingKey,
        backingType = backingType,
        callbackFactory = { muxId ->
            ProxyCallback { message ->
                CoroutineScope(coroutineContext).launch {
                    receiveQueue.enqueue(
                        PreEnqueuedFromBackingStore(message.toReferenceModeMessage(), muxId)
                    )
                }
            }
        }
    )

    init {
        @Suppress("UNCHECKED_CAST")
        crdtType = requireNotNull(
            type as? Type.TypeContainer<CrdtModelType<CrdtData, CrdtOperationAtTime, Referencable>>
        ) { "Provided type must contain CrdtModelType" }.containedType

        containerStore.on(ProxyCallback {
            CoroutineScope(coroutineContext).launch {
                receiveQueue.enqueue(Message.PreEnqueuedFromContainer(it.toReferenceModeMessage()))
            }
        })
    }

    override suspend fun idle() {
        backingStore.idle()
        containerStore.idle()
    }

    override fun on(
        callback: ProxyCallback<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput>
    ): Int = callbacks.register(callback)

    override fun off(callbackToken: Int) {
        callbacks.unregister(callbackToken)
        if (callbacks.isEmpty() && !callbacksStateChannel.isClosedForSend) {
            try {
                callbacksStateChannel.offer(false)
            } catch (e: ClosedSendChannelException) {
                // No-op. If the channel is closed (which can happen between the if's check and the
                // offer call above), then it's no big deal.
                log.debug {
                    "Attempted to send false to the callbacksStateChannel when it was already " +
                        "closed."
                }
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

    @Suppress("UNCHECKED_CAST", "IMPLICIT_CAST_TO_ANY")
    override suspend fun onProxyMessage(
        message: ProxyMessage<RefModeStoreData, RefModeStoreOp, RefModeStoreOutput>
    ): Boolean {
        log.verbose { "onProxyMessage: $message" }
        val refModeMessage = message.sanitizeForRefModeStore(type)
        return receiveQueue.enqueue(Message.PreEnqueuedFromStorageProxy(refModeMessage))
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
    private val handleProxyMessage: suspend (EnqueuedFromStorageProxy) -> Boolean = fn@{ message ->
        log.verbose { "handleProxyMessage: $message" }
        suspend fun itemVersionGetter(item: RawEntity): VersionMap {
            val localBackingVersion = backingStore.getLocalData(item.id).versionMap
            if (localBackingVersion.isNotEmpty()) return localBackingVersion

            updateBackingStore(item)

            return requireNotNull(backingStore.getLocalData(item.id)).versionMap
        }

        return@fn when (val proxyMessage = message.message) {
            is ProxyMessage.Operations -> {
                proxyMessage.operations.toBridgingOps(backingStore.storageKey).all { op ->
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

                        is BridgingOperation.RemoveFromSet ->
                            op.entityValue?.let { clearEntityInBackingStore(it) }

                        is BridgingOperation.ClearSet -> clearAllEntitiesInBackingStore()
                    }
                    containerStore.onProxyMessage(
                        ProxyMessage.Operations(listOf(op.containerOp), proxyMessage.id)
                    )
                }
            }
            is ProxyMessage.ModelUpdate -> {
                val newModelsResult = proxyMessage.model.toBridgingData(
                    backingStore.storageKey,
                    ::itemVersionGetter
                )
                when (newModelsResult) {
                    is Result.Ok -> {
                        val allBackingUpdatesSuccessful =
                            newModelsResult.value.backingModels.all { updateBackingStore(it) }
                        if (allBackingUpdatesSuccessful) {
                            containerStore.onProxyMessage(
                                ProxyMessage.ModelUpdate(
                                    newModelsResult.value.collectionModel.data,
                                    id = 1
                                )
                            )
                            sendQueue.enqueue {
                                callbacks.send(proxyMessage, proxyMessage.id)
                            }
                            true
                        } else throw CrdtException("Could not update one or more backing models")
                    }
                    else -> false
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
                    try {
                        withTimeout(BLOCKING_QUEUE_TIMEOUT_MILLIS) {
                            sendQueue.enqueueBlocking(pendingIds, ::sender).await()
                        }
                    } catch (e: TimeoutCancellationException) {
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
                        containerStore.onProxyMessage(ProxyMessage.Operations(ops, null))
                        // Re-issue the sync.
                        onProxyMessage(proxyMessage)
                    }
                }
                true
            }
        }
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
    private val handleBackingStoreMessage: suspend (EnqueuedFromBackingStore) -> Boolean =
        { message ->
            when (val proxyMessage = message.message) {
                is ProxyMessage.ModelUpdate ->
                    sendQueue.notifyReferenceHold(
                        message.muxId,
                        proxyMessage.model.versionMap
                    )
                is ProxyMessage.Operations -> if (proxyMessage.operations.isNotEmpty()) {
                    sendQueue.notifyReferenceHold(
                        message.muxId,
                        proxyMessage.operations.last().clock
                    )
                }
                is ProxyMessage.SyncRequest ->
                    throw IllegalArgumentException("Unexpected SyncRequest from the backing store")
            }
            true
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
    private val handleContainerMessage: suspend (EnqueuedFromContainer) -> Boolean = fn@{ message ->
        when (val proxyMessage = message.message) {
            is ProxyMessage.Operations -> {
                val containerOps = proxyMessage.operations
                opLoop@for (op in containerOps) {
                    val reference = when (op) {
                        is CrdtSet.Operation.Add<*> -> op.added as Reference
                        is CrdtSet.Operation.Remove<*> -> op.removed as Reference
                        is CrdtSingleton.Operation.Update<*> -> op.value as Reference
                        else -> null
                    }
                    val getEntity = if (reference != null) {
                        val entityCrdt = backingStore.getLocalData(reference.id) as? CrdtEntity.Data
                        if (entityCrdt == null) {
                            sendQueue.enqueueBlocking(listOf(reference)) {
                                val updated =
                                    backingStore.getLocalData(reference.id) as? CrdtEntity.Data

                                // Bridge the op from the collection using the RawEntity from the
                                // backing store, and use the refModeOp for sending back to the
                                // proxy.
                                val upstreamOps = listOf(
                                    op.toBridgingOp(updated?.toRawEntity(reference.id)).refModeOp
                                )

                                callbacks.send(
                                    message = ProxyMessage.Operations(
                                        operations = upstreamOps,
                                        id = proxyMessage.id
                                    ),
                                    exceptTo = proxyMessage.id
                                )
                            }
                            continue@opLoop
                        }
                        suspend { entityCrdt.toRawEntity(reference.id) }
                    } else {
                        suspend { null }
                    }

                    sendQueue.enqueue {
                        val upstream = listOf(op.toBridgingOp(getEntity()).refModeOp)
                        callbacks.send(
                            message = ProxyMessage.Operations(upstream, id = proxyMessage.id),
                            exceptTo = proxyMessage.id
                        )
                    }
                }
            }
            is ProxyMessage.ModelUpdate -> {
                val data = proxyMessage.model
                val (pendingIds, model) = constructPendingIdsAndModel(data)

                suspend fun sender() {
                    // TODO? Typescript doesn't pass an id.
                    callbacks.send(
                        ProxyMessage.ModelUpdate(model() as RefModeStoreData, id = proxyMessage.id)
                    )
                }

                if (pendingIds.isEmpty()) {
                    sendQueue.enqueue(::sender)
                } else {
                    sendQueue.enqueueBlocking(pendingIds, ::sender)
                }
            }
            is ProxyMessage.SyncRequest -> sendQueue.enqueue {
                // TODO? Typescript doesn't pass an id.
                callbacks.send(ProxyMessage.SyncRequest(id = proxyMessage.id))
            }
        }
        return@fn true
    }

    @FlowPreview
    private val clearStoreCachesFlow = combine(
        callbacksStateChannel.asFlow(),
        receiveQueue.sizeChannel.asFlow()
    ) { callbacksState, queueSize -> queueSize + if (callbacksState) 1 else 0 }
        .filter { it == 0 }
        .onEach {
            if (receiveQueue.size.value == 0) {
                backingStore.clearStoresCache()
                receiveQueue.sizeChannel.close()
                callbacksStateChannel.close()
            }
        }
        .launchIn(CoroutineScope(clearCoroutineContext + Job()))

    private fun newBackingInstance(): CrdtModel<CrdtData, CrdtOperationAtTime, Referencable> =
        crdtType.createCrdtModel()

    /** Write the provided entity to the backing store. */
    private suspend fun updateBackingStore(referencable: RawEntity): Boolean {
        val model = entityToModel(referencable)
        return backingStore.onProxyMessage(ProxyMessage.ModelUpdate(model, id = 1), referencable.id)
    }

    /** Clear the provided entity in the backing store. */
    private suspend fun clearEntityInBackingStore(referencable: RawEntity): Boolean {
        val model = entityToModel(referencable)
        val op = listOf(CrdtEntity.Operation.ClearAll(crdtKey, model.versionMap))
        return backingStore.onProxyMessage(ProxyMessage.Operations(op, id = null), referencable.id)
    }

    /** Clear all entities from the backing store, using the container store to retrieve the ids. */
    private suspend fun clearAllEntitiesInBackingStore(): Boolean {
        val containerModel = containerStore.getLocalData()
        if (containerModel !is CrdtSet.Data<*>) {
            throw UnsupportedOperationException()
        }
        return containerModel.values.all { (refId, data) ->
            val clearOp = listOf(CrdtEntity.Operation.ClearAll(crdtKey, data.versionMap))
            backingStore.onProxyMessage(ProxyMessage.Operations(clearOp, id = null), refId)
        }
    }

    /**
     * Returns a function that can construct a [RefModeStoreData] object of a Container of Entities
     * based off the provided Container of References or a container of references from a provided
     * [RefModeStoreData].
     *
     * Any referenced IDs that are not yet available in the backing store are returned in the list
     * of pending [Reference]s. The returned function should not be invoked until all references in
     * pendingIds have valid backing in the backing store.
     *
     * [RawEntity] objects come from the storage proxy, and [Reference] objects come from the
     * [containerStore].
     */
    @Suppress("UNCHECKED_CAST")
    private suspend fun constructPendingIdsAndModel(
        data: CrdtData
    ): Pair<List<Reference>, suspend () -> CrdtData> {
        val pendingIds = mutableListOf<Reference>()

        // We can use one mechanism to calculate pending values because both CrdtSet.Data and
        // CrdtSingleton.Data's `values` param are maps of ReferenceIds to CrdtSet.DataValue
        // objects.
        suspend fun calculatePendingIds(
            dataValues: Map<ReferenceId, CrdtSet.DataValue<out Referencable>>
        ) {
            // Find any pending ids given the reference ids of the data values.
            dataValues.forEach { (refId, dataValue) ->
                val version = (dataValue.value as? Reference)?.version ?: dataValue.versionMap

                // This object is requested at an empty version, which means that it's new and
                // can be directly constructed rather than waiting for an update.
                if (version.isEmpty()) return@forEach

                val backingModel = backingStore.getLocalData(refId)

                // If the version that was requested is newer than what the backing store has,
                // consider it pending.
                if (version dominates backingModel.versionMap) {
                    pendingIds += Reference(refId, backingStore.storageKey, version)
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
                    backingStore.getLocalData(refId) as CrdtEntity.Data
                }
                outgoing[refId] = CrdtSet.DataValue(version.copy(), entity.toRawEntity(refId))
            }
            return outgoing
        }

        // Loads a CrdtSingleton/CrdtSet.Data object's values map with References, when that object
        // is intended to be sent to the collectionStore.
        fun collectionFromProxy(
            incoming: Map<ReferenceId, CrdtSet.DataValue<out Referencable>>
        ): MutableMap<ReferenceId, CrdtSet.DataValue<Reference>> {
            val outgoing = mutableMapOf<ReferenceId, CrdtSet.DataValue<Reference>>()
            incoming.forEach { (refId, value) ->
                val version = value.versionMap
                outgoing[refId] = CrdtSet.DataValue(
                    version.copy(),
                    Reference(refId, backingStore.storageKey, version.copy())
                )
            }
            return outgoing
        }

        // Incoming `data` is either CrdtSet.Data or CrdtSingleton.Data
        val dataVersionCopy = data.versionMap.copy()
        val modelGetter = when (data) {
            is CrdtSingleton.Data<*> -> {
                calculatePendingIds(data.values)

                val containerData = data as? CrdtSingleton.Data<Reference>
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

                val containerData = data as? CrdtSet.Data<Reference>
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
                is Reference -> it
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
        return listOf(when (containerModel) {
            is CrdtSet.Data<*> ->
                CrdtSet.Operation.Clear<Reference>(actor, containerVersion)
            is CrdtSingleton.Data<*> ->
                CrdtSingleton.Operation.Clear<Reference>(actor, containerVersion)
            else -> throw UnsupportedOperationException()
        })
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
            options: StoreOptions
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
                    versionToken = options.versionToken,
                    coroutineContext = options.coroutineContext
                )
            )

            return ReferenceModeStore(
                refableOptions,
                containerStore,
                storageKey.backingKey,
                options.coroutineContext,
                type.containedType
            )
        }
    }
}
