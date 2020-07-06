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
import arcs.android.storage.decodeProxyMessage
import arcs.android.storage.service.DeferredResult
import arcs.android.storage.service.IStorageService
import arcs.android.storage.service.IStorageServiceCallback
import arcs.android.storage.toProto
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtOperation
import arcs.core.data.CollectionType
import arcs.core.data.CountType
import arcs.core.data.EntityType
import arcs.core.data.SingletonType
import arcs.core.storage.ActivationFactory
import arcs.core.storage.ActiveStore
import arcs.core.storage.ProxyCallback
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StoreOptions
import arcs.core.util.TaggedLog
import arcs.jvm.util.JvmDispatchers
import arcs.sdk.android.storage.service.ConnectionFactory
import arcs.sdk.android.storage.service.DefaultConnectionFactory
import arcs.sdk.android.storage.service.StorageServiceConnection
import kotlin.coroutines.CoroutineContext
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancelChildren
import kotlinx.coroutines.channels.BroadcastChannel
import kotlinx.coroutines.channels.ClosedSendChannelException
import kotlinx.coroutines.channels.ConflatedBroadcastChannel
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.asFlow
import kotlinx.coroutines.flow.buffer
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout

/**
 * Factory which can be supplied to [Store.activate] to force store creation to use the
 * [ServiceStore].
 */
@ExperimentalCoroutinesApi
@OptIn(FlowPreview::class)
class ServiceStoreFactory(
    private val context: Context,
    private val lifecycle: Lifecycle,
    private val coroutineContext: CoroutineContext = JvmDispatchers.IO,
    private val connectionFactory: ConnectionFactory? = null
) : ActivationFactory {
    override suspend operator fun <Data : CrdtData, Op : CrdtOperation, ConsumerData> invoke(
        options: StoreOptions<Data, Op, ConsumerData>
    ): ServiceStore<Data, Op, ConsumerData> {
        val storeContext = coroutineContext + CoroutineName("ServiceStore(${options.storageKey})")
        val parcelableType = when (options.type) {
            is CountType -> ParcelableCrdtType.Count
            is CollectionType<*> -> ParcelableCrdtType.Set
            is SingletonType<*> -> ParcelableCrdtType.Singleton
            is EntityType -> ParcelableCrdtType.Entity
            else ->
                throw IllegalArgumentException("Service store can't handle type ${options.type}")
        }
        return ServiceStore(
            options = options,
            crdtType = parcelableType,
            lifecycle = lifecycle,
            connectionFactory = connectionFactory
                ?: DefaultConnectionFactory(context, coroutineContext = storeContext),
            coroutineContext = storeContext
        ).initialize()
    }
}

/** Implementation of [ActiveStore] which pipes [ProxyMessage]s to and from the [StorageService]. */
@Suppress("EXPERIMENTAL_API_USAGE")
@OptIn(FlowPreview::class)
@ExperimentalCoroutinesApi
class ServiceStore<Data : CrdtData, Op : CrdtOperation, ConsumerData>(
    private val options: StoreOptions<Data, Op, ConsumerData>,
    private val crdtType: ParcelableCrdtType,
    lifecycle: Lifecycle,
    private val connectionFactory: ConnectionFactory,
    private val coroutineContext: CoroutineContext
) : ActiveStore<Data, Op, ConsumerData>(options), LifecycleObserver {
    // TODO(#5551): Consider including hash of options.storageKey for tracking.
    private val log = TaggedLog { "ServiceStore" }
    private val scope = CoroutineScope(coroutineContext)
    private var storageService: IStorageService? = null
    private var serviceConnection: StorageServiceConnection? = null
    private var channel: BroadcastChannel<suspend () -> Unit>? = null
    private var channelConsumptionJob: Job? = null
    private val outgoingMessages = atomic(0)

    init {
        lifecycle.addObserver(this)
        initChannel()
    }

    // Channel has an internal queue which can retain work if stopped
    // So we need to create fresh instances when off() invoked
    private fun initChannel() {
        synchronized(this) {
            channel?.takeIf { !it.isClosedForSend }?.cancel()
            channel = ConflatedBroadcastChannel<suspend () -> Unit>().also {
                channelConsumptionJob = it.asFlow().buffer()
                    .onEach { it() }
                    .launchIn(scope)
            }
        }
    }

    override suspend fun idle() = coroutineScope<Unit> {
        log.debug { "Waiting for service store to be idle" }
        while (outgoingMessages.value > 0) delay(10)
        val service = checkNotNull(storageService)
        val callback = DeferredResult(this@coroutineScope.coroutineContext)
        service.idle(TIMEOUT_IDLE_WAIT_MILLIS, callback)
        withTimeout(TIMEOUT_IDLE_WAIT_MILLIS) { callback.await() }
        log.debug { "ServiceStore is idle" }
    }

    override fun on(callback: ProxyCallback<Data, Op, ConsumerData>): Int {
        val service = checkNotNull(storageService)
        return service.registerCallback(object : IStorageServiceCallback.Stub() {
            override fun onProxyMessage(proxyMessage: ByteArray) {
                scope.launch {
                    @Suppress("UNCHECKED_CAST")
                    callback.invoke(
                        proxyMessage.decodeProxyMessage() as ProxyMessage<Data, Op, ConsumerData>
                    )
                }
            }
        })
    }

    override fun off(callbackToken: Int) {
        val service = checkNotNull(storageService)
        runBlocking {
            send {
                service.unregisterCallback(callbackToken)
                initChannel()
            }
        }
    }

    private suspend fun send(block: suspend () -> Unit) = requireNotNull(channel) {
        "Channel is not initialized"
    }.apply {
        try {
            send(block)
        } catch (e: ClosedSendChannelException) {
            log.debug { "Channel is closed, ignoring" }
        }
    }

    override suspend fun onProxyMessage(message: ProxyMessage<Data, Op, ConsumerData>): Boolean {
        val service = checkNotNull(storageService)
        val result = DeferredResult(coroutineContext)
        // Trick: make an indirect access to the message to keep kotlin flow
        // from holding the entire message that might encapsulate a large size data.
        var messageRef: ProxyMessage<Data, Op, ConsumerData>? = message
        outgoingMessages.incrementAndGet()
        send {
            service.sendProxyMessage(messageRef!!.toProto().toByteArray(), result)
            messageRef = null
        }
        // Just return false if the message couldn't be applied.
        return try {
            result.await()
        } catch (e: CrdtException) {
            log.debug(e) { "CrdtException occurred in onProxyMessage" }
            false
        } finally {
            outgoingMessages.decrementAndGet()
        }
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

        this.serviceConnection = connection
        this.storageService = service
    }

    @OnLifecycleEvent(Lifecycle.Event.ON_DESTROY)
    @VisibleForTesting(otherwise = VisibleForTesting.PACKAGE_PRIVATE)
    fun onLifecycleDestroyed() {
        serviceConnection?.disconnect()
        storageService = null
        channel?.cancel()
        channel = null
        scope.coroutineContext[Job.Key]?.cancelChildren()
    }

    companion object {
        private const val TIMEOUT_IDLE_WAIT_MILLIS = 10000L
    }
}
