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

package arcs.storage.service

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import arcs.storage.Store
import arcs.storage.parcelables.ParcelableProxyMessage
import arcs.storage.parcelables.ParcelableStoreOptions

/**
 * Implementation of a [Service] which manages [Store]s and exposes the ability to access them via
 * the [IStorageService] interface when bound-to by a client.
 */
class StorageService : Service() {
    private val coroutineContext = Dispatchers.IO + CoroutineName("StorageService")
    private val scope = CoroutineScope(coroutineContext)
    private val stores = ConcurrentHashMap<StoreOptions<*, *, *>, Store<*, *, *>>()

    override fun onBind(intent: Intent): IBinder? {
        val parcelableOptions = requireNotNull(
            intent.getParcelableExtra<ParcelableStoreOptions?>(EXTRA_OPTIONS)
        ) { "No StoreOptions found in Intent" }

        return BindingContext(
            stores.computeIfAbsent(parcelableOptions.actual) { Store(it) },
            parcelableOptions.crdtType,
            coroutineContext
        )
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }

    private class BindingContext(
        private val store: Store<*, *, *>,
        private val crdtType: ParcelableCrdtType,
        parentCoroutineContext: CoroutineContext
    ) : IStorageService.Stub() {
        private val id = nextId.incrementAndGet()
        private val coroutineContext = parentCoroutineContext + CoroutineName("BindingContext-$id")
        private val scope = CoroutineScope(coroutineContext)
        private val callbacks = ProxyCallbackManager<CrdtData, CrdtOperation, Any?>()
        private val sendQueue = SendQueue()

        override fun getLocalData(callback: IStorageServiceCallback) {
            scope.launch {
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

        override fun registerCallback(callback: IStorageServiceCallback): Int =
            callbacks.register(ProxyCallback {
                // Asynchronously pass the message along to the callback. Use a supervisorScope here
                // so that we catch any exceptions thrown within and re-throw on the same coroutine
                // as the callback-caller.
                supervisorScope {
                    val deferredResult = DeferredResult(coroutineContext)
                    callback.onProxyMessage(it.toParcelable(crdtType), deferredResult)
                    deferredResult.await()
                }
            })

        @Suppress("UNCHECKED_CAST")
        override fun sendProxyMessage(
            message: ParcelableProxyMessage,
            resultCallback: IResultCallback
        ) {
            scope.launch {
                val activeStore = store.activate() as ActiveStore<CrdtData, CrdtOperation, Any?>
                val actualMessage = message.actual as ProxyMessage<CrdtData, CrdtOperation, Any?>
                try {
                    if (activeStore.onProxyMessage(actualMessage)) {
                        resultCallback.onResult(null)
                    } else throw CrdtException("Failed to process message")
                } catch (e: CrdtException) {
                    resultCallback.onResult(e.toParcelable())
                }
            }
        }

        override fun unregisterCallback(token: Int) = callbacks.unregister(token)

        companion object {
            private val nextId = atomic(0)
        }
    }

    companion object {
        private const val EXTRA_OPTIONS = "storeOptions"

        /**
         * Creates an [Intent] to use when binding to the [StorageService] from a [ServiceStore].
         */
        fun createBindIntent(context: Context, storeOptions: ParcelableStoreOptions): Intent =
            Intent(context, StorageService::class.java).apply {
                putExtra(EXTRA_OPTIONS, storeOptions)
            }
    }
}
