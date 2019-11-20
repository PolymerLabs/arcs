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

package arcs.storage

import android.content.Context
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleObserver
import androidx.lifecycle.OnLifecycleEvent
import arcs.crdt.CrdtData
import arcs.crdt.CrdtException
import arcs.crdt.CrdtOperation
import arcs.crdt.parcelables.ParcelableCrdtType
import arcs.storage.parcelables.toParcelable
import arcs.storage.service.ConnectionFactory
import arcs.storage.service.DefaultConnectionFactory
import arcs.storage.service.DeferredResult
import arcs.storage.service.IStorageService
import arcs.storage.service.ParcelableProxyMessageChannel
import arcs.storage.service.ParcelableProxyMessageChannel.MessageAndResult
import arcs.storage.service.StorageServiceConnection
import arcs.storage.util.ProxyCallbackManager
import arcs.storage.util.SendQueue
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.asFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.mapNotNull
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.withContext

/**
 * Factory which can be supplied to [Store.activate] to force store creation to use the
 * ServiceStore.
 */
@ExperimentalCoroutinesApi
@UseExperimental(FlowPreview::class)
class ServiceStoreFactory<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
    private val context: Context,
    private val lifecycle: Lifecycle,
    private val crdtType: ParcelableCrdtType,
    private val coroutineContext: CoroutineContext = Dispatchers.IO
) {
    suspend operator fun invoke(
        options: StoreOptions<Data, Op, ConsumerData>
    ): ServiceStore<Data, Op, ConsumerData> {
        val storeContext = coroutineContext + CoroutineName("ServiceStore(${options.storageKey})")
        return ServiceStore(options, crdtType, context, lifecycle, storeContext).initialize()
    }
}

/** Implementation of [ActiveStore] which pipes [ProxyMessage]s to and from the [StorageService]. */
@UseExperimental(FlowPreview::class)
@ExperimentalCoroutinesApi
class ServiceStore<Data : CrdtData, Op : CrdtOperation, ConsumerData> internal constructor(
    private val options: StoreOptions<Data, Op, ConsumerData>,
    private val crdtType: ParcelableCrdtType,
    context: Context,
    lifecycle: Lifecycle,
    private val coroutineContext: CoroutineContext,
    private val connectionFactory: ConnectionFactory =
        DefaultConnectionFactory(context, coroutineContext)
) : ActiveStore<Data, Op, ConsumerData>(options), LifecycleObserver {
    private val scope = CoroutineScope(coroutineContext)
    private var storageService: IStorageService? = null
    private var serviceConnection: StorageServiceConnection? = null
    private val proxyCallbacks = ProxyCallbackManager<Data, Op, ConsumerData>()
    private var serviceCallbackToken: Int = -1
    private val sendQueue = SendQueue()

    init {
        lifecycle.addObserver(this)
    }

    @Suppress("UNCHECKED_CAST")
    override suspend fun getLocalData(): Data {
        val service = checkNotNull(storageService)
        val channel = ParcelableProxyMessageChannel(coroutineContext)
        service.getLocalData(channel)
        val flow = channel.asFlow()
        val modelUpdate =
            flow.flowOn(coroutineContext)
                .onEach { it.result.complete(true) }
                .mapNotNull {
                    it.message.actual as? ProxyMessage.ModelUpdate<Data, Op, ConsumerData>
                }
                .first()
        channel.cancel()
        return modelUpdate.model
    }

    override fun on(callback: ProxyCallback<Data, Op, ConsumerData>): Int =
        proxyCallbacks.register(callback)

    override fun off(callbackToken: Int) = proxyCallbacks.unregister(callbackToken)

    override suspend fun onProxyMessage(message: ProxyMessage<Data, Op, ConsumerData>): Boolean {
        val service = checkNotNull(storageService)
        val result = DeferredResult(coroutineContext)
        sendQueue.enqueue {
            service.sendProxyMessage(message.toParcelable(crdtType), result)
        }
        return result.await()
    }

    internal suspend fun initialize() = apply {
        check(serviceConnection == null ||
            storageService == null ||
            storageService?.asBinder()?.isBinderAlive != true) {
            "Connection to StorageService is already alive."
        }
        val connection = connectionFactory(options, crdtType)
        val service = connection.connectAsync().await()

        val messageChannel = ParcelableProxyMessageChannel(coroutineContext)
        serviceCallbackToken = withContext(coroutineContext) {
            service.registerCallback(messageChannel)
        }

        messageChannel.asFlow()
            .flowOn(coroutineContext)
            .onEach(this::handleMessageAndResultFromService)

        this.serviceConnection = connection
        this.storageService = service
    }

    @OnLifecycleEvent(Lifecycle.Event.ON_DESTROY)
    private fun onLifecycleDestroyed() {
        serviceConnection?.disconnect()
        storageService?.unregisterCallback(serviceCallbackToken)
        storageService = null
        scope.cancel()
    }

    @Suppress("UNCHECKED_CAST")
    private suspend fun handleMessageAndResultFromService(messageAndResult: MessageAndResult) {
        try {
            val actualMessage = CrdtException.requireNotNull(
                messageAndResult.message.actual as? ProxyMessage<Data, Op, ConsumerData>
            ) { "Could not cast ProxyMessage to required type." }

            sendQueue.enqueue {
                messageAndResult.result.complete(proxyCallbacks.send(actualMessage))
            }
        } catch (e: Exception) {
            messageAndResult.result.completeExceptionally(e)
        }
    }
}
