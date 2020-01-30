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

package arcs.android.storage.service

import androidx.annotation.VisibleForTesting
import arcs.android.crdt.ParcelableCrdtType
import arcs.android.crdt.toParcelable
import arcs.android.storage.ParcelableProxyMessage
import arcs.android.storage.toParcelable
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.data.RawEntity
import arcs.core.storage.ActiveStore
import arcs.core.storage.ProxyCallback
import arcs.core.storage.ProxyMessage
import arcs.core.storage.ReferenceModeStore
import arcs.core.storage.StorageKey
import arcs.core.storage.Store
import arcs.core.storage.referencemode.RefModeStoreData
import arcs.core.storage.referencemode.RefModeStoreOp
import arcs.core.storage.util.SendQueue
import arcs.core.util.Log
import kotlin.coroutines.CoroutineContext
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.supervisorScope

/**
 * A [BindingContext] is used by a client of the [StorageService] to facilitate communication with a
 * [Store] residing within the [StorageService] from elsewhere in an application.
 */
class BindingContext(
    /**
     * The [Store] this [BindingContext] provides bindings for, it may or may not be shared with
     * other instances of [BindingContext].
     */
    private val store: Store<*, *, *>,
    /**
     * A hint used to facilitate translations between usable Crdt types and [Parcelable]s required
     * for transmission via IBinder interfaces.
     */
    private val crdtType: ParcelableCrdtType,
    /** [CoroutineContext] on which to build one specific to this [BindingContext]. */
    parentCoroutineContext: CoroutineContext,
    /** Sink to use for recording statistics about accessing data. */
    private val bindingContextStatisticsSink: BindingContextStatisticsSink,
    /** Callback to trigger when a proxy message has been received and send to the store. */
    private val onProxyMessage: suspend (StorageKey, ProxyMessage<*, *, *>) -> Unit = { _, _ -> }
) : IStorageService.Stub() {
    @VisibleForTesting
    val id = nextId.incrementAndGet()

    /**
     * The [SendQueue] ensures that all [ProxyMessage]s are handled in the order in which they were
     * received.
     */
    private val sendQueue = SendQueue()

    /** The local [CoroutineContext]. */
    private val coroutineContext = parentCoroutineContext + CoroutineName("BindingContext-$id")

    override fun getLocalData(callback: IStorageServiceCallback) {
        bindingContextStatisticsSink.measure(coroutineContext) {
            val activeStore = store.activate()

            val deferredResult = DeferredResult(coroutineContext)
            sendQueue.enqueue {
                callback.onProxyMessage(
                    ProxyMessage.ModelUpdate<CrdtData, CrdtOperation, Any?>(
                        model = activeStore.getLocalData(),
                        id = null
                    ).toParcelable(crdtType),
                    deferredResult
                )
            }

            deferredResult.await()
        }
    }

    @Suppress("UNCHECKED_CAST")
    override fun registerCallback(callback: IStorageServiceCallback): Int {
        val proxyCallback = ProxyCallback<CrdtData, CrdtOperation, Any?> { message ->
            // Asynchronously pass the message along to the callback. Use a supervisorScope here
            // so that we catch any exceptions thrown within and re-throw on the same coroutine
            // as the callback-caller.
            supervisorScope {
                val deferredResult = DeferredResult(coroutineContext)
                callback.onProxyMessage(message.toParcelable(crdtType), deferredResult)
                deferredResult.await()
            }
        }

        return runBlocking {
            val token =
                (store.activate() as ActiveStore<CrdtData, CrdtOperation, Any?>).on(proxyCallback)

            // If the callback's binder dies, remove it from the callback collection.
            callback.asBinder().linkToDeath({
                unregisterCallback(token)
            }, 0)

            Log.debug { "BindingContext - Registered callback: $callback with token: $token" }
            token
        }
    }

    @Suppress("UNCHECKED_CAST")
    override fun sendProxyMessage(
        message: ParcelableProxyMessage,
        resultCallback: IResultCallback
    ) {
        bindingContextStatisticsSink.measure(coroutineContext) {
            val activeStore = store.activate() as ActiveStore<CrdtData, CrdtOperation, Any?>
            val actualMessage = message.actual as ProxyMessage<CrdtData, CrdtOperation, Any?>
            try {
                if (activeStore.onProxyMessage(activeStore.prepMessage(actualMessage))) {
                    resultCallback.onResult(null)

                    onProxyMessage(store.storageKey, actualMessage)
                } else throw CrdtException("Failed to process message")
            } catch (e: CrdtException) {
                resultCallback.onResult(e.toParcelable())
            }
        }
    }

    override fun unregisterCallback(token: Int) {
        CoroutineScope(coroutineContext).launch { store.activate().off(token) }
    }

    companion object {
        private val nextId = atomic(0)
    }
}

@Suppress("UNCHECKED_CAST")
fun <Data, Op, ConsumerData> ActiveStore<Data, Op, ConsumerData>.prepMessage(
    message: ProxyMessage<CrdtData, CrdtOperation, Any?>
): ProxyMessage<CrdtData, CrdtOperation, Any?> where Data : CrdtData,
                                                     Op : CrdtOperation {
    if (this !is ReferenceModeStore) return message

    return when (message) {
        is ProxyMessage.SyncRequest ->
            ProxyMessage.SyncRequest<RefModeStoreData, RefModeStoreOp, Any>(message.id)
        is ProxyMessage.ModelUpdate ->
            ProxyMessage.ModelUpdate<RefModeStoreData, RefModeStoreOp, Any>(
                when (val model = message.model) {
                    is CrdtSingleton.Data<*> ->
                        RefModeStoreData.Singleton(model as CrdtSingleton.Data<RawEntity>)
                    is CrdtSet.Data<*> ->
                        RefModeStoreData.Set(model as CrdtSet.Data<RawEntity>)
                    else -> throw IllegalArgumentException(
                        "Unsupported model type for ReferenceModeStore"
                    )
                },
                message.id
            )
        is ProxyMessage.Operations ->
            ProxyMessage.Operations<RefModeStoreData, RefModeStoreOp, Any>(
                message.operations.map {
                    when (it) {
                        is CrdtSingleton.Operation.Update<*> ->
                            RefModeStoreOp.SingletonUpdate(
                                it as CrdtSingleton.Operation.Update<RawEntity>
                            )
                        is CrdtSingleton.Operation.Clear<*> ->
                            RefModeStoreOp.SingletonClear(
                                it as CrdtSingleton.Operation.Clear<RawEntity>
                            )
                        is CrdtSet.Operation.Add<*> ->
                            RefModeStoreOp.SetAdd(
                                it as CrdtSet.Operation.Add<RawEntity>
                            )
                        is CrdtSet.Operation.Remove<*> ->
                            RefModeStoreOp.SetRemove(
                                it as CrdtSet.Operation.Remove<RawEntity>
                            )
                        else -> throw IllegalArgumentException(
                            "Unsupported operation type for ReferenceModeStore"
                        )
                    }
                },
                message.id
            )
    } as ProxyMessage<CrdtData, CrdtOperation, Any?>
}
