package arcs.core.storage.api

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.crdt.Actor
import arcs.core.crdt.CrdtChange
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSet.Operation.Add
import arcs.core.crdt.CrdtSet.Operation.FastForward
import arcs.core.crdt.CrdtSet.Operation.Remove
import arcs.core.crdt.VersionMap
import arcs.core.data.CollectionType
import arcs.core.data.CountType
import arcs.core.data.EntityType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.storage.ActiveStore
import arcs.core.storage.ExistenceCriteria
import arcs.core.storage.ProxyCallback
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageMode
import arcs.core.storage.Store
import arcs.core.storage.StoreOptions
import arcs.core.storage.referencemode.RefModeStoreData
import arcs.core.storage.referencemode.RefModeStoreOp
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.guardedBy
import kotlin.coroutines.CoroutineContext
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

/**
 * Creates an [ArcsSet] which manages a set of [RawEntity] objects located at the given
 * [storageKey], whose schemae are defined by the supplied [schema].
 *
 * **Note:** By supplying your [coroutineContext], any bindings to the storage layer are released
 * when the context's primary job is completed, thus avoiding a memory leak.
 */
@Suppress("FunctionName")
@ExperimentalCoroutinesApi
fun ArcsSet(
    storageKey: ReferenceModeStorageKey,
    schema: Schema,
    existenceCriteria: ExistenceCriteria = ExistenceCriteria.MayExist,
    coroutineContext: CoroutineContext = Dispatchers.Default
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

/**
 * Creates an [ArcsSet] which manages a set of [ReferencablePrimitive] objects of type <T> located
 * at the given [storageKey].
 *
 * **Note:** By supplying your [coroutineContext], any bindings to the storage layer are released
 * when the context's primary job is completed, thus avoiding a memory leak.
 */
@Suppress("FunctionName")
@ExperimentalCoroutinesApi
inline fun <reified T> ArcsSet(
    storageKey: StorageKey,
    existenceCriteria: ExistenceCriteria = ExistenceCriteria.MayExist,
    coroutineContext: CoroutineContext = Dispatchers.Default
): ArcsSet<ReferencablePrimitive<T>,
    CrdtSet.Data<ReferencablePrimitive<T>>,
    CrdtSet.IOperation<ReferencablePrimitive<T>>> {

    require(ReferencablePrimitive.isSupportedPrimitive(T::class)) {
        "Unsupported type: ${T::class}"
    }

    val storeOps = StoreOptions<
        CrdtSet.Data<ReferencablePrimitive<T>>,
        CrdtSet.IOperation<ReferencablePrimitive<T>>,
        Set<ReferencablePrimitive<T>>>(
        storageKey = storageKey,
        // TODO: this is wrong. There should probably be a PrimitiveType?
        type = CollectionType(CountType()),
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

/**
 * [ArcsSet] is a [MutableSet]-like data structure which allows for easy interaction with [CrdtSet]s
 * managed by Arcs' storage layer.
 *
 * All functions on [ArcsSet] are suspending functions, due to the fact that communicating with the
 * storage layer is an inherently asynchronous process.
 *
 * **Note:** By supplying your [CoroutineContext] to the constructor, any bindings to the storage
 * layer are released when the context's primary job is completed, thus avoiding a memory leak.
 */
@ExperimentalCoroutinesApi
class ArcsSet<T, StoreData, StoreOp>(
    private val store: Store<StoreData, StoreOp, Set<T>>,
    private val toStoreData: (CrdtSet.Data<T>) -> StoreData,
    private val toStoreOp: (CrdtSet.IOperation<T>) -> StoreOp,
    coroutineContext: CoroutineContext
) : Referencable
    where T : Referencable,
          StoreData : CrdtSet.Data<T>,
          StoreOp : CrdtSet.IOperation<T> {

    override val id: ReferenceId = store.storageKey.toString()

    /**
     * The [Actor] this instance will use when performing Crdt operations on the underlying data.
     */
    val actor: Actor by lazy { "ArcsSet@${hashCode()}" }

    private val crdtMutex = Mutex()
    private val crdtSet by guardedBy(crdtMutex, CrdtSet<T>())
    private var cachedVersion by guardedBy(crdtMutex, VersionMap())
    private var cachedConsumerData by guardedBy(crdtMutex, emptySet<T>())
    private val scope = CoroutineScope(coroutineContext)
    private val initialized: CompletableJob = Job(scope.coroutineContext[Job.Key])
    private var syncJob: CompletableJob? = null
    private var callbackId: Int = -1
    private val activated =
        CompletableDeferred<ActiveStore<StoreData, StoreOp, Set<T>>>(initialized)

    init {
        var activeStore: ActiveStore<StoreData, StoreOp, Set<T>>? = null

        // Launch a coroutine to activate the backing store, register ourselves as a ProxyCallback,
        // and perform an initial sync.
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

    /** Returns a snapshot of the current data in the set. */
    suspend fun freeze(): Set<T> = crdtMutex.withLock { cachedConsumerData }

    /**
     * Returns an iterator which supports concurrently removing items from the set during iteration.
     */
    suspend fun iterator(
        withSync: Boolean = false,
        coroutineContext: CoroutineContext = scope.coroutineContext
    ): SuspendingIterator<T, StoreData, StoreOp> {
        activated.await()
        if (withSync) sync(coroutineContext).join()
        return crdtMutex.withLock {
            SuspendingIterator(this, cachedConsumerData.iterator())
        }
    }

    /** Returns the current size of the set. */
    suspend fun size(): Int {
        activated.await()
        return crdtMutex.withLock { cachedConsumerData.size }
    }

    /** Returns whether or not the set is empty. */
    suspend fun isEmpty(): Boolean {
        activated.await()
        return crdtMutex.withLock { cachedConsumerData.isEmpty() }
    }

    /** Returns whether or not the set is non-empty. */
    suspend fun isNotEmpty(): Boolean = !isEmpty()

    /**
     * Adds the [element] to the set and suspends while applying it to the backing [store].
     *
     * Returns whether or not the element could be added.
     */
    suspend fun add(element: T): Boolean {
        activated.await()

        val (success, op) = crdtMutex.withLock {
            makeAddOp(element).let { crdtSet.applyOperation(it) to it }
                .also { updateCache() }
        }
        return if (success) applyOperationToStore(op) else false
    }

    /**
     * Launches a coroutine to add an [element] to the set and returns a [Deferred] which will
     * resolve to whether or not the element could be added.
     */
    suspend fun addAsync(
        element: T,
        coroutineContext: CoroutineContext = scope.coroutineContext
    ): Deferred<Boolean> = scope.async(coroutineContext) { add(element) }

    /**
     * Attempts to add all of the [elements] to the set and returns the number of elements which
     * were added successfully.
     *
     * Suspends execution of the current coroutine while applying the elements to the backing
     * [store].
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
            updateCache()
            successes to ops
        }

        return count.also { applyOperationsToStore(ops) }
    }

    /**
     * Launches a coroutine to add all of the supplied [elements] to the set and returns a
     * [Deferred] which resolves to the number of items which were added.
     */
    suspend fun addAllAsync(
        elements: Iterable<T>,
        coroutineContext: CoroutineContext = scope.coroutineContext
    ): Deferred<Int> = scope.async(coroutineContext) { addAll(elements) }

    /**
     * Removes the specified [element] from the set and suspends execution while the removal is
     * happening on the backing [store].
     *
     * Returns whether or not the element could be removed.
     */
    suspend fun remove(element: T): Boolean {
        activated.await()

        val (success, op) = crdtMutex.withLock {
            makeRemoveOp(element).let { crdtSet.applyOperation(it) to it }
                .also { updateCache() }
        }
        return if (success) applyOperationToStore(op) else false
    }

    /**
     * Launches a coroutine to remove the specified [element] from the set (and the backing [store])
     * and returns a [Deferred] which resolves to whether or not the item could be removed.
     */
    suspend fun removeAsync(
        element: T,
        coroutineContext: CoroutineContext = scope.coroutineContext
    ): Deferred<Boolean> = scope.async(coroutineContext) { remove(element) }

    /** Returns whether or not the [ArcsSet] contains the given [item]. */
    suspend fun contains(item: T, requireSync: Boolean = false): Boolean {
        activated.await()

        if (requireSync) sync().join()
        return crdtMutex.withLock {
            cachedConsumerData.any { it.tryDereference() == item }
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
        cachedVersion[actor]++
        return Add(actor, cachedVersion.copy(), element)
    }

    /**
     * Creates a [CrdtSet.Operation.Remove] operation to apply to the local [crdtSet].
     *
     * **Note:** Must be called from within a lock of [crdtMutex].
     */
    private fun makeRemoveOp(element: T): Remove<T> {
        return Remove(actor, cachedVersion.copy(), element)
    }

    private suspend fun applyOperationToStore(op: CrdtSet.Operation<T>): Boolean =
        applyOperationsToStore(listOf(op))

    private suspend fun applyOperationsToStore(ops: List<CrdtSet.Operation<T>>): Boolean {
        return activated.await()
            .onProxyMessage(ProxyMessage.Operations(ops.map { toStoreOp(it) }, callbackId))
    }

    @Suppress("UNCHECKED_CAST")
    private suspend fun handleStoreCallback(
        message: ProxyMessage<StoreData, StoreOp, Set<T>>
    ): Boolean {
        val messageBackToStore = crdtMutex.withLock {
            when (message) {
                is ProxyMessage.SyncRequest ->
                    ProxyMessage.ModelUpdate(toStoreData(crdtSet.data), callbackId)
                is ProxyMessage.Operations ->
                    handleOperationsMessage(message)
                is ProxyMessage.ModelUpdate ->
                    handleModelUpdateMessage(message).also { syncJob?.complete() }
            }.also { updateCache() }
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

    /**
     * Updates the [cachedVersion] and [cachedConsumerData].
     *
     * **Note:** This may only be called while the [crdtMutex] is locked.
     */
    private fun updateCache() {
        cachedVersion = crdtSet.versionMap
        cachedConsumerData = crdtSet.consumerView
    }

    /**
     * [Iterator] over the current elements of an [ArcsSet].
     *
     * The [removeAsync] function allows for concurrent removal of the iterator's current item from
     * the [ArcsSet].
     */
    class SuspendingIterator<T, StoreData, StoreOp> /* internal */ constructor(
        private val parent: ArcsSet<T, StoreData, StoreOp>,
        private var backingIterator: Iterator<T>
    ) : Iterator<T> where T : Referencable,
                          StoreData : CrdtSet.Data<T>,
                          StoreOp : CrdtSet.IOperation<T> {
        private var current: T? = null

        override fun hasNext(): Boolean = backingIterator.hasNext()

        override fun next(): T = backingIterator.next().also { current = it }

        /**
         * Removes the iterator's current element from the parent [ArcsSet] and returns a [Deferred]
         * which resolves to whether or not the element could be removed.
         */
        suspend fun removeAsync(
            coroutineContext: CoroutineContext = parent.scope.coroutineContext
        ): Deferred<Boolean> {
            val current = this.current
                ?: throw IllegalStateException("Cannot remove when iteration hasn't begun yet")
            return parent.removeAsync(current, coroutineContext)
        }

        /* internal */ suspend fun sync(
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
