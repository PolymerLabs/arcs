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

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.crdt.ParcelableCrdtType
import arcs.android.storage.toParcelable
import arcs.core.crdt.CrdtCount
import arcs.core.crdt.VersionMap
import arcs.core.data.CountType
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StorageKey
import arcs.core.storage.Store
import arcs.core.storage.StoreOptions
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.keys.RamDiskStorageKey
import com.google.common.truth.Truth.assertThat
import kotlin.coroutines.coroutineContext
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancelChildren
import kotlinx.coroutines.flow.asFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.yield
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [BindingContext]. */
@RunWith(AndroidJUnit4::class)
@UseExperimental(ExperimentalCoroutinesApi::class, FlowPreview::class)
class BindingContextTest {
    private lateinit var store: Store<CrdtCount.Data, CrdtCount.Operation, Int>
    private lateinit var storageKey: StorageKey

    @Before
    fun setup() {
        RamDiskDriverProvider()
        RamDisk.clear()
        storageKey = RamDiskStorageKey("myCount")
        store = Store(
            StoreOptions(
                storageKey,
                CountType()
            )
        )
    }

    private suspend fun buildContext(
        callback: suspend (StorageKey, ProxyMessage<*, *, *>) -> Unit = { _, _ -> }
    ) = BindingContext(
        store,
        ParcelableCrdtType.Count,
        coroutineContext,
        BindingContextStatsImpl(),
        callback
    )

    @Test
    fun getLocalData_fetchesLocalData() = runBlocking {
        val bindingContext = buildContext()
        val messageChannel = ParcelableProxyMessageChannel(coroutineContext)
        bindingContext.getLocalData(messageChannel)

        var message = messageChannel.asFlow().first()
        message.result.complete(true)

        var modelUpdate = checkNotNull(message.message.actual as? ProxyMessage.ModelUpdate)
        var model = checkNotNull(modelUpdate.model as? CrdtCount.Data)

        // Should be empty to start.
        assertThat(model.values).isEmpty()

        // Now let's increment the count.
        store.activate().onProxyMessage(
            ProxyMessage.Operations(
                listOf(CrdtCount.Operation.Increment("alice", 0 to 1)),
                id = 1
            )
        )

        bindingContext.getLocalData(messageChannel)
        message = messageChannel.asFlow().first()
        message.result.complete(true)

        modelUpdate = checkNotNull(message.message.actual as? ProxyMessage.ModelUpdate)
        model = checkNotNull(modelUpdate.model as? CrdtCount.Data)

        // Should contain a single entry.
        assertThat(model.values).containsExactly("alice", 1).inOrder()
    }

    @Test
    fun sendProxyMessage_propagatesToTheStore() = runBlocking {
        val bindingContext = buildContext()
        val deferredResult = DeferredResult(coroutineContext)
        val message = ProxyMessage.Operations<CrdtCount.Data, CrdtCount.Operation, Int>(
            listOf(CrdtCount.Operation.MultiIncrement("alice", 0 to 10, 10)),
            id = 1
        )
        bindingContext.sendProxyMessage(
            message.toParcelable(ParcelableCrdtType.Count),
            deferredResult
        )

        assertThat(deferredResult.await()).isTrue()

        val data = store.activate().getLocalData()
        assertThat(data.versionMap).isEqualTo(VersionMap("alice" to 10))
        assertThat(data.values).containsExactly("alice", 10)

        coroutineContext[Job.Key]?.cancelChildren()
        Unit
    }

    @Test
    fun registerCallback_registersCallbackWithStore() = runBlocking {
        val bindingContext = buildContext()
        val callback = ParcelableProxyMessageChannel(coroutineContext)
        val token = bindingContext.registerCallback(callback)

        assertThat(token).isEqualTo(1)

        // Now send a message directly to the store, and see if we hear it from our callback.
        val message = ProxyMessage.Operations<CrdtCount.Data, CrdtCount.Operation, Int>(
            listOf(
                CrdtCount.Operation.Increment("alice", 0 to 1),
                CrdtCount.Operation.Increment("bob", 0 to 1)
            ),
            id = null
        )

        launch {
            store.activate().onProxyMessage(message)
        }

        val heardMessage = callback.asFlow().first()
        heardMessage.result.complete(true)

        // The received message should have id == the token of the receiver.
        assertThat(heardMessage.message.actual.id).isEqualTo(token)

        val operations = heardMessage.message.actual as ProxyMessage.Operations
        assertThat(operations.operations).isEqualTo(message.operations)
    }

    @Test
    fun unregisterCallback_unregistersCallbackFromStore() = runBlocking {
        val bindingContext = buildContext()
        val callback = ParcelableProxyMessageChannel(coroutineContext)
        val token = bindingContext.registerCallback(callback)

        bindingContext.unregisterCallback(token)

        // Yield to let the unregister go through.
        yield()

        // Now send a message directly to the store, and ensure we didn't hear of it with our
        // callback.
        val message = ProxyMessage.Operations<CrdtCount.Data, CrdtCount.Operation, Int>(
            listOf(
                CrdtCount.Operation.Increment("alice", 0 to 1),
                CrdtCount.Operation.Increment("bob", 0 to 1)
            ),
            id = null
        )
        assertThat(store.activate().onProxyMessage(message)).isTrue()

        callback.close()
        assertThat(callback.asFlow().toList()).isEmpty()
    }

    @Test
    fun sendProxyMessage_causesSendToCallback() = runBlocking {
        var receivedKey: StorageKey? = null
        var receivedMessage: ProxyMessage<*, *, *>? = null
        val bindingContext = buildContext { key, message ->
            receivedKey = key
            receivedMessage = message
        }
        val deferredResult = DeferredResult(coroutineContext)
        val message = ProxyMessage.Operations<CrdtCount.Data, CrdtCount.Operation, Int>(
            listOf(CrdtCount.Operation.MultiIncrement("alice", 0 to 10, 10)),
            id = 1
        )
        bindingContext.sendProxyMessage(
            message.toParcelable(ParcelableCrdtType.Count),
            deferredResult
        )

        assertThat(deferredResult.await()).isTrue()

        assertThat(receivedKey).isEqualTo(storageKey)
        assertThat(receivedMessage).isEqualTo(message)

        coroutineContext[Job.Key]?.cancelChildren()
        Unit
    }
}
