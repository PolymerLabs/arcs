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

package arcs.sdk.android.storage

import android.content.Context
import androidx.annotation.VisibleForTesting
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleObserver
import androidx.lifecycle.OnLifecycleEvent
import arcs.android.crdt.ParcelableCrdtType
import arcs.android.storage.service.DeferredResult
import arcs.android.storage.service.IStorageService
import arcs.android.storage.service.ParcelableProxyMessageChannel
import arcs.android.storage.service.ParcelableProxyMessageChannel.MessageAndResult
import arcs.android.storage.toParcelable
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.ActivationFactory
import arcs.core.storage.ActiveStore
import arcs.core.storage.ProxyCallback
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StoreOptions
import arcs.core.storage.util.RandomProxyCallbackManager
import arcs.core.storage.util.SendQueue
import arcs.sdk.android.storage.service.ConnectionFactory
import arcs.sdk.android.storage.service.DefaultConnectionFactory
import arcs.sdk.android.storage.service.StorageServiceConnection
import java.time.Instant
import java.util.UUID
import kotlin.coroutines.CoroutineContext
import kotlin.random.Random
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancelChildren
import kotlinx.coroutines.channels.consumeEach
import kotlinx.coroutines.flow.asFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.mapNotNull
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Factory which can be supplied to [Store.activate] to force store creation to use the
 * [ServiceStore].
 */
@ExperimentalCoroutinesApi
@UseExperimental(FlowPreview::class)
class ServiceStoreFactory<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
    private val context: Context,
    private val lifecycle: Lifecycle,
    private val crdtType: ParcelableCrdtType,
    private val coroutineContext: CoroutineContext = Dispatchers.IO,
    private val connectionFactory: ConnectionFactory? = null
) : ActivationFactory<Data, Op, ConsumerData> {
    override suspend operator fun invoke(
        options: StoreOptions<Data, Op, ConsumerData>
    ): ServiceStore<Data, Op, ConsumerData> {
        val storeContext = coroutineContext + CoroutineName("ServiceStore(${options.storageKey})")
        return ServiceStore(
            options = options,
            crdtType = crdtType,
            lifecycle = lifecycle,
            connectionFactory = connectionFactory
                ?: DefaultConnectionFactory(context, coroutineContext = storeContext),
            coroutineContext = storeContext
        ).initialize()
    }
}

/** Implementation of [ActiveStore] which pipes [ProxyMessage]s to and from the [StorageService]. */
@UseExperimental(FlowPreview::class)
@ExperimentalCoroutinesApi
class ServiceStore<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
    private val options: StoreOptions<Data, Op, ConsumerData>,
    private val crdtType: ParcelableCrdtType,
    lifecycle: Lifecycle,
    private val connectionFactory: ConnectionFactory,
    private val coroutineContext: CoroutineContext
) : ActiveStore<Data, Op, ConsumerData>(options), LifecycleObserver {
    private val scope = CoroutineScope(coroutineContext)
    private var storageService: IStorageService? = null
    private var serviceConnection: StorageServiceConnection? = null
    private val proxyCallbacks = RandomProxyCallbackManager<Data, Op, ConsumerData>(
        UUID.randomUUID().toString(),
        Random(Instant.now().toEpochMilli())
    )
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
            flow.onEach { it.result.complete(true) }
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
            val messageToSend = when (message) {
                // Store implementations only send their ModelUpdate messages to the thing that
                // sent them the sync request, so we need to ensure they send it to us, instead of
                // trying to send it to the storage proxy itself (the originator of the
                // SyncRequest), because for the StorageService in particular: this fails - since
                // the storage proxy doesn't directly listen to the storage service (and thus, its
                // listener id won't exist in the StorageService-side ActiveStore).
                is ProxyMessage.SyncRequest -> message.copy(id = serviceCallbackToken)
                else -> message
            }
            service.sendProxyMessage(messageToSend.toParcelable(crdtType), result)
        }
        // Just return false if the message couldn't be applied.
        return try { result.await() } catch (e: CrdtException) { false }
    }

    @VisibleForTesting(otherwise = VisibleForTesting.PACKAGE_PRIVATE)
    suspend fun initialize() = apply {
        check(serviceConnection == null ||
            storageService == null ||
            storageService?.asBinder()?.isBinderAlive != true) {
            "Connection to StorageService is already alive."
        }
        val connection = connectionFactory(options, crdtType)
        // Need to initiate the connection on the main thread.
        val service = IStorageService.Stub.asInterface(connection.connectAsync().await())

        val messageChannel = ParcelableProxyMessageChannel(coroutineContext)

        // Open subscription before attaching callback to make sure that we capture all messages
        val subscription = messageChannel.openSubscription()
        scope.launch {
            subscription.consumeEach {
                handleMessageAndResultFromService(it)
            }
        }

        serviceCallbackToken = withContext(coroutineContext) {
            service.registerCallback(messageChannel)
        }

        this.serviceConnection = connection
        this.storageService = service
    }

    @OnLifecycleEvent(Lifecycle.Event.ON_DESTROY)
    @VisibleForTesting(otherwise = VisibleForTesting.PACKAGE_PRIVATE)
    fun onLifecycleDestroyed() {
        serviceConnection?.disconnect()
        storageService?.unregisterCallback(serviceCallbackToken)
        storageService = null
        scope.coroutineContext[Job.Key]?.cancelChildren()
    }

    @Suppress("UNCHECKED_CAST")
    private suspend fun handleMessageAndResultFromService(messageAndResult: MessageAndResult) {
        try {
            val actualMessage = CrdtException.requireNotNull(
                messageAndResult.message.actual as? ProxyMessage<Data, Op, ConsumerData>
            ) { "Could not cast ProxyMessage to required type." }

            sendQueue.enqueue {
                val proxyResult = proxyCallbacks.send(actualMessage)

                messageAndResult.result.complete(proxyResult)
            }
        } catch (e: Exception) {
            messageAndResult.result.completeExceptionally(e)
        }
    }
}
