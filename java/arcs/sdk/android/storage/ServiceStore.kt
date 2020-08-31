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
import arcs.sdk.android.storage.service.ConnectionFactory
import arcs.sdk.android.storage.service.DefaultConnectionFactory
import arcs.sdk.android.storage.service.StorageServiceConnection
import kotlin.coroutines.CoroutineContext
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancelChildren
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout

/**
 * Factory which can be supplied to [Store.activate] to force store creation to use the
 * [ServiceStore].
 */
@ExperimentalCoroutinesApi
@OptIn(FlowPreview::class)
class ServiceStoreFactory(
    private val context: Context,
    private val coroutineContext: CoroutineContext = Dispatchers.IO,
    private val connectionFactory: ConnectionFactory? = null
) : ActivationFactory {
    override suspend operator fun <Data : CrdtData, Op : CrdtOperation, ConsumerData> invoke(
        options: StoreOptions
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
        return ServiceStore<Data, Op, ConsumerData>(
            options = options,
            crdtType = parcelableType,
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
    private val options: StoreOptions,
    private val crdtType: ParcelableCrdtType,
    private val connectionFactory: ConnectionFactory,
    private val coroutineContext: CoroutineContext
) : ActiveStore<Data, Op, ConsumerData>(options) {
    // TODO(#5551): Consider including hash of options.storageKey for tracking.
    private val log = TaggedLog { "ServiceStore" }
    private val scope = CoroutineScope(coroutineContext)
    private var storageService: IStorageService? = null
    private var serviceConnection: StorageServiceConnection? = null
    private val outgoingMessages = atomic(0)

    override suspend fun idle() = coroutineScope {
        log.debug { "Waiting for service store to be idle" }
        while (outgoingMessages.value > 0) delay(10)
        val service = checkNotNull(storageService)
        val callback = DeferredResult(this@coroutineScope.coroutineContext)
        service.idle(TIMEOUT_IDLE_WAIT_MILLIS, callback)
        withTimeout(TIMEOUT_IDLE_WAIT_MILLIS) { callback.await() }
        log.debug { "ServiceStore is idle" }
    }

    override suspend fun on(callback: ProxyCallback<Data, Op, ConsumerData>): Int {
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
        service.unregisterCallback(callbackToken)
    }

    override suspend fun onProxyMessage(message: ProxyMessage<Data, Op, ConsumerData>): Boolean {
        val service = checkNotNull(storageService)
        val result = DeferredResult(coroutineContext)
        // Trick: make an indirect access to the message to keep kotlin flow
        // from holding the entire message that might encapsulate a large size data.
        outgoingMessages.incrementAndGet()
        service.sendProxyMessage(message.toProto().toByteArray(), result)
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

    @VisibleForTesting(otherwise = VisibleForTesting.PACKAGE_PRIVATE)
    override fun close() {
        serviceConnection?.disconnect()
        storageService = null
        scope.coroutineContext[Job.Key]?.cancelChildren()
    }

    companion object {
        private const val TIMEOUT_IDLE_WAIT_MILLIS = 10000L
    }
}
