package arcs.arcs.storage.api

import arcs.common.Referencable
import arcs.common.ReferenceId
import arcs.crdt.CrdtChange
import arcs.crdt.CrdtSet
import arcs.crdt.CrdtSet.Operation.*
import arcs.crdt.internal.Actor
import arcs.crdt.internal.VersionMap
import arcs.data.CollectionType
import arcs.data.CountType
import arcs.data.EntityType
import arcs.data.RawEntity
import arcs.data.Schema
import arcs.data.util.ReferencablePrimitive
import arcs.storage.ActiveStore
import arcs.storage.ExistenceCriteria
import arcs.storage.ProxyCallback
import arcs.storage.ProxyMessage
import arcs.storage.StorageKey
import arcs.storage.StorageMode
import arcs.storage.Store
import arcs.storage.StoreOptions
import arcs.storage.referencemode.RefModeStoreData
import arcs.storage.referencemode.RefModeStoreOp
import arcs.storage.referencemode.ReferenceModeStorageKey
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CompletableJob
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlin.coroutines.CoroutineContext

@ExperimentalCoroutinesApi
class ArcsSet<T : Referencable, StoreData : CrdtSet.Data<T>, StoreOp : CrdtSet.IOperation<T>>(
    private val store: Store<StoreData, StoreOp, Set<T>>,
    private val toStoreData: (CrdtSet.Data<T>) -> StoreData,
    private val toStoreOp: (CrdtSet.IOperation<T>) -> StoreOp,
    coroutineContext: CoroutineContext
) : Referencable {
    override val id: ReferenceId = store.storageKey.toString()
    private val crdtMutex = Mutex()
    private val crdtSet = CrdtSet<T>()
    private var cachedVersion = VersionMap()
    private var cachedConsumerData = emptySet<T>()
    private val scope = CoroutineScope(coroutineContext)
    private val initialized: CompletableJob = Job(scope.coroutineContext[Job.Key])
    private var syncJob: CompletableJob? = null
    private var callbackId: Int = -1
    private val activated = CompletableDeferred<ActiveStore<StoreData, StoreOp, Set<T>>>(initialized)
    val actor: Actor = "ArcsSet@${hashCode()}"

    init {
        var activeStore: ActiveStore<StoreData, StoreOp, Set<T>>? = null
        scope.launch {
            activeStore = store.activate().also { activeStore ->
                initialized.complete()
                ProxyCallback<StoreData, StoreOp, Set<T>> { handleStoreCallback(it) }
                    .also { callbackId = activeStore.on(it) }
                activated.complete(activeStore)
                sync().join()
            }
        }

        // When the owning scope is finished, we should clean up after ourselves.
        scope.coroutineContext[Job.Key]?.invokeOnCompletion { activeStore?.off(callbackId) }
    }

    suspend fun freeze(): Set<T> = crdtMutex.withLock { cachedConsumerData }

    suspend fun iterator(
        withSync: Boolean = false,
        coroutineContext: CoroutineContext = scope.coroutineContext
    ): SuspendingIterator<T, StoreData, StoreOp> {
        activated.await()
        return crdtMutex.withLock {
            if (withSync) syncInternal(coroutineContext).join()
            SuspendingIterator(this, cachedConsumerData.iterator())
        }
    }

    suspend fun size(): Int {
        activated.await()
        return crdtMutex.withLock { cachedConsumerData.size }
    }

    suspend fun isEmpty(): Boolean {
        activated.await()
        return crdtMutex.withLock { cachedConsumerData.isEmpty() }
    }

    suspend fun isNotEmpty(): Boolean = !isEmpty()

    suspend fun add(element: T): Boolean {
        activated.await()

        val (success, op) = crdtMutex.withLock {
            makeAddOp(element).let {crdtSet.applyOperation(it) to it }.also {
                cachedVersion = crdtSet.versionMap
                cachedConsumerData = crdtSet.consumerView
            }
        }
        return if (success) applyOperationToStore(op) else false
    }

    suspend fun addAsync(
        element: T,
        coroutineContext: CoroutineContext = scope.coroutineContext
    ): Deferred<Boolean> = scope.async(coroutineContext) { add(element) }

    /**
     * Adds all of the [elements] to the set, if possible and returns the number of elements which
     * were added successfully.
     */
    suspend fun addAll(elements: Iterable<T>): Int {
        activated.await()
        val (count, ops) = crdtMutex.withLock {
            var successes = 0
            val ops = mutableListOf<Add<T>>()
            elements.map { makeAddOp(it) }.forEach {
                if (crdtSet.applyOperation(it)) {
                    successes++
                    ops += it
                }
            }
            (successes to ops).also {
                cachedVersion = crdtSet.versionMap
                cachedConsumerData = crdtSet.consumerView
            }
        }

        return count.also { applyOperationsToStore(ops) }
    }

    suspend fun addAllAsync(
        elements: Iterable<T>,
        coroutineContext: CoroutineContext = scope.coroutineContext
    ): Deferred<Int> = scope.async(coroutineContext) { addAll(elements) }

    suspend fun remove(element: T): Boolean {
        activated.await()

        val (success, op) = crdtMutex.withLock {
            makeRemoveOp(element).let { crdtSet.applyOperation(it) to it }.also {
                cachedVersion = crdtSet.versionMap
                cachedConsumerData = crdtSet.consumerView
            }
        }
        return if (success) applyOperationToStore(op) else false
    }

    suspend fun removeAsync(
        element: T,
        coroutineContext: CoroutineContext = scope.coroutineContext
    ): Deferred<Boolean> = scope.async(coroutineContext) { remove(element) }

    /** Returns whether or not the [ArcsSet] contains the given [item]. */
    suspend fun contains(item: T, requireSync: Boolean = false): Boolean {
        activated.await()

        return if (requireSync) crdtMutex.withLock {
            syncInternal().join()
            cachedConsumerData.any { it.tryDereference() == item }
        } else {
            crdtMutex.withLock { cachedConsumerData.any { it.tryDereference() == item } }
        }
    }

    /** Initiates a sync with the backing store. */
    suspend fun sync(coroutineContext: CoroutineContext = scope.coroutineContext): Job =
        crdtMutex.withLock { syncInternal(coroutineContext) }

    /**
     * Sends a [ProxyMessage.SyncRequest] to the proxy.
     *
     * **Note:** Must be called from within a lock of [crdtMutex].
     */
    private suspend fun syncInternal(
        coroutineContext: CoroutineContext = scope.coroutineContext
    ): Job {
        check(crdtMutex.isLocked)
        syncJob?.takeIf { it.isActive }?.let { return it }
        return Job(coroutineContext[Job.Key]).also {
            syncJob = it
            scope.launch(coroutineContext) {
                activated.await().onProxyMessage(ProxyMessage.SyncRequest(callbackId))
            }
        }
    }

    /**
     * Creates an [CrdtSet.Operation.Add] operation to apply to the local [crdtSet].
     *
     * **Note:** Must be called from within a lock of [crdtMutex].
     */
    private fun makeAddOp(element: T): Add<T> {
        check(crdtMutex.isLocked)
        cachedVersion[actor]++
        return Add(cachedVersion.copy(), actor, element)
    }

    /**
     * Creates a [CrdtSet.Operation.Remove] operation to apply to the local [crdtSet].
     *
     * **Note:** Must be called from within a lock of [crdtMutex].
     */
    private fun makeRemoveOp(element: T): Remove<T> {
        check(crdtMutex.isLocked)
        return Remove(cachedVersion.copy(), actor, element)
    }

    private suspend fun applyOperationToStore(op: CrdtSet.Operation<T>): Boolean =
        applyOperationsToStore(listOf(op))

    private suspend fun applyOperationsToStore(ops: List<CrdtSet.Operation<T>>): Boolean {
        return activated.await()
            .onProxyMessage(ProxyMessage.Operations(ops.map { toStoreOp(it) }, callbackId))
    }

    @Suppress("UNCHECKED_CAST")
    private suspend fun handleStoreCallback(message: ProxyMessage<StoreData, StoreOp, Set<T>>): Boolean {
        val messageBackToStore = crdtMutex.withLock {
            when (message) {
                is ProxyMessage.SyncRequest ->
                    ProxyMessage.ModelUpdate(toStoreData(crdtSet.data), callbackId)
                is ProxyMessage.Operations ->
                    handleOperationsMessage(message)
                is ProxyMessage.ModelUpdate ->
                    handleModelUpdateMessage(message).also { syncJob?.complete() }
            }.also {
                cachedVersion = crdtSet.versionMap
                cachedConsumerData = crdtSet.consumerView
            }
        }
        return messageBackToStore?.let { activated.await().onProxyMessage(it) } ?: true
    }

    private fun handleModelUpdateMessage(
        message: ProxyMessage.ModelUpdate<StoreData, StoreOp, Set<T>>
    ): ProxyMessage<StoreData, StoreOp, Set<T>>? {
        val (_, otherChanges) = crdtSet.merge(message.model)
        return when (otherChanges) {
            is CrdtChange.Operations -> {
                if (otherChanges.ops.isNotEmpty() && otherChanges.ops.hasStoreSafeOps()) {
                    // We can send operations back to the activeStore.
                    ProxyMessage.Operations(otherChanges.ops.map(toStoreOp), callbackId)
                } else if (otherChanges.ops.isNotEmpty()) {
                    // otherChanges includes fast-forward ops, so let's just send a model update.
                    ProxyMessage.ModelUpdate(toStoreData(crdtSet.data), callbackId)
                } else null
            }
            is CrdtChange.Data -> {
                if (otherChanges.data != crdtSet.data) {
                    // If there should be changes sent to the activeStore, send 'em.
                    ProxyMessage.ModelUpdate(toStoreData(otherChanges.data), callbackId)
                } else null
            }
        }
    }

    private fun handleOperationsMessage(
        message: ProxyMessage.Operations<StoreData, StoreOp, Set<T>>
    ): ProxyMessage<StoreData, StoreOp, Set<T>>? {
        if (message.operations.none { !crdtSet.applyOperation(it) }) {
            return null
        }
        // Couldn't apply some operations, need to request a sync.
        return ProxyMessage.SyncRequest(callbackId)
    }

    class SuspendingIterator<T, StoreData, StoreOp> internal constructor(
        private val parent: ArcsSet<T, StoreData, StoreOp>,
        private var backingIterator: Iterator<T>
    ) : Iterator<T> where T : Referencable,
                          StoreData : CrdtSet.Data<T>,
                          StoreOp : CrdtSet.IOperation<T> {
        private var current: T? = null

        override fun hasNext(): Boolean = backingIterator.hasNext()

        override fun next(): T = backingIterator.next().also { current = it }

        suspend fun removeAsync(
            coroutineContext: CoroutineContext = parent.scope.coroutineContext
        ): Deferred<Boolean> {
            val current = this.current
                ?: throw IllegalStateException("Cannot remove when iteration hasn't begun yet")
            return parent.removeAsync(current, coroutineContext)
        }

        internal suspend fun sync(
            coroutineContext: CoroutineContext = parent.scope.coroutineContext
        ) {
            check(current == null) { "Syncs may only be performed before iteration has begun" }
            parent.sync(coroutineContext).join()
            backingIterator = parent.crdtMutex.withLock { parent.cachedConsumerData.iterator() }
        }
    }

    private fun Collection<CrdtSet.IOperation<T>>.hasStoreSafeOps(): Boolean =
        none { it is FastForward }
}

@ExperimentalCoroutinesApi
fun ArcsSet(
    storageKey: ReferenceModeStorageKey,
    schema: Schema,
    existenceCriteria: ExistenceCriteria = ExistenceCriteria.MayExist,
    coroutineContext: CoroutineContext = Dispatchers.IO
): ArcsSet<RawEntity, RefModeStoreData.Set, RefModeStoreOp.Set> {
    val storeOpts = StoreOptions<RefModeStoreData.Set, RefModeStoreOp.Set, Set<RawEntity>>(
        storageKey = storageKey,
        type = CollectionType(EntityType(schema)),
        existenceCriteria = existenceCriteria,
        mode = StorageMode.ReferenceMode
    )
    return ArcsSet(
        store = Store(storeOpts),
        toStoreData = { RefModeStoreData.Set(it) },
        toStoreOp = {
            when (it) {
                is Add -> RefModeStoreOp.SetAdd(it)
                is Remove -> RefModeStoreOp.SetRemove(it)
                else -> throw IllegalArgumentException("Invalid operation type: $it")
            }
        },
        coroutineContext = coroutineContext
    )
}

@ExperimentalCoroutinesApi
inline fun <reified T> ArcsSet(
    storageKey: StorageKey,
    existenceCriteria: ExistenceCriteria = ExistenceCriteria.MayExist,
    coroutineContext: CoroutineContext = Dispatchers.IO
): ArcsSet<ReferencablePrimitive<T>,
    CrdtSet.Data<ReferencablePrimitive<T>>,
    CrdtSet.IOperation<ReferencablePrimitive<T>>> {

    require(ReferencablePrimitive.isSupportedPrimitive(T::class)) { "Unsupported type: ${T::class.java}" }

    val storeOps = StoreOptions<
        CrdtSet.Data<ReferencablePrimitive<T>>,
        CrdtSet.IOperation<ReferencablePrimitive<T>>,
        Set<ReferencablePrimitive<T>>>(
        storageKey = storageKey,
        type = CollectionType(CountType()), // TODO: this is wrong. There should probably be a PrimitiveType?
        existenceCriteria = existenceCriteria,
        mode = StorageMode.Direct
    )
    return ArcsSet(
        store = Store(storeOps),
        toStoreData = { it },
        toStoreOp = { it },
        coroutineContext = coroutineContext
    )
}
