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
import arcs.android.crdt.toProto
import arcs.android.storage.decodeProxyMessage
import arcs.android.storage.toProto
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.ActiveStore
import arcs.core.storage.ProxyCallback
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StorageKey
import arcs.core.storage.StoreOptions
import arcs.core.storage.defaultFactory
import kotlin.coroutines.CoroutineContext
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.supervisorScope
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withTimeout

/**
 * This simple wrapper class will create a new [ActiveStore] for the provided [StoreOptions] the
 * first time that [get] is invoked. Subsequent invocations of [get] will return the previous
 * constructed store. It's safe to invoke [get] concurrently from different coroutines/threads.
 */
class DeferredStore<Data : CrdtData, Op : CrdtOperation, T>(
    private val options: StoreOptions
) {
    private val mutex = Mutex()
    private lateinit var _store: ActiveStore<Data, Op, T>
    @ExperimentalCoroutinesApi
    @Suppress("UNCHECKED_CAST")
    suspend fun get(): ActiveStore<Data, Op, T> = mutex.withLock {
        if (!::_store.isInitialized) {
            _store = defaultFactory(options)
        }
        _store
    }
}

/**
 * A [BindingContext] is used by a client of the [StorageService] to facilitate communication with a
 * [Store] residing within the [StorageService] from elsewhere in an application.
 */
@ExperimentalCoroutinesApi
class BindingContext(
    /**
     * The [Store] this [BindingContext] provides bindings for, it may or may not be shared with
     * other instances of [BindingContext].
     */
    private val store: DeferredStore<*, *, *>,
    /** [CoroutineContext] on which to build one specific to this [BindingContext]. */
    parentCoroutineContext: CoroutineContext,
    /** Sink to use for recording statistics about accessing data. */
    private val bindingContextStatisticsSink: BindingContextStatisticsSink,
    /** Callback to trigger when a proxy message has been received and sent to the store. */
    private val onProxyMessage: suspend (StorageKey, ProxyMessage<*, *, *>) -> Unit = { _, _ -> }
) : IStorageService.Stub() {
    @VisibleForTesting
    val id = nextId.incrementAndGet()

    /** The local [CoroutineContext]. */
    private val job = Job(parentCoroutineContext[Job])
    private val coroutineContext =
        parentCoroutineContext + job + CoroutineName("BindingContext-$id")

    override fun idle(timeoutMillis: Long, resultCallback: IResultCallback) {
        bindingContextStatisticsSink.traceTransaction("idle") {
            bindingContextStatisticsSink.measure(coroutineContext) {
                try {
                    withTimeout(timeoutMillis) {
                        store.get().idle()
                    }
                    resultCallback.onResult(null)
                } catch (e: Throwable) {
                    resultCallback.onResult(
                        CrdtException("Exception occurred while awaiting idle", e).toProto()
                            .toByteArray()
                    )
                }
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    override fun registerCallback(callback: IStorageServiceCallback): Int {
        var callbackToken = 0
        bindingContextStatisticsSink.traceTransaction("registerCallback") {
            val proxyCallback = ProxyCallback<CrdtData, CrdtOperation, Any?> { message ->
                // Asynchronously pass the message along to the callback. Use a supervisorScope here
                // so that we catch any exceptions thrown within and re-throw on the same coroutine
                // as the callback-caller.
                supervisorScope {
                    callback.onProxyMessage(message.toProto().toByteArray())
                }
            }

            callbackToken = runBlocking {
                val token = (store.get() as ActiveStore<CrdtData, CrdtOperation, Any?>)
                    .on(proxyCallback)

                // If the callback's binder dies, remove it from the callback collection.
                callback.asBinder().linkToDeath({
                    unregisterCallback(token)
                }, 0)

                token
            }
        }
        return callbackToken
    }

    @Suppress("UNCHECKED_CAST")
    override fun sendProxyMessage(
        proxyMessage: ByteArray,
        resultCallback: IResultCallback
    ) {
        bindingContextStatisticsSink.traceTransaction("sendProxyMessage") {
            bindingContextStatisticsSink.measure(coroutineContext) {
                resultCallback.takeIf { it.asBinder().isBinderAlive }?.onResult(null)

                val actualMessage = proxyMessage.decodeProxyMessage()

                (store.get() as ActiveStore<CrdtData, CrdtOperation, Any?>).let { store ->
                    if (store.onProxyMessage(actualMessage)) {
                        onProxyMessage(store.storageKey, actualMessage)
                    }
                }
            }
        }
    }

    override fun unregisterCallback(token: Int) {
        bindingContextStatisticsSink.traceTransaction("unregisterCallback") {
            CoroutineScope(coroutineContext).launch { store.get().off(token) }
        }
    }

    companion object {
        private val nextId = atomic(0)
    }
}
