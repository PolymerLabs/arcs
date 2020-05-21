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
import arcs.android.storage.decodeProxyMessage
import arcs.android.storage.toProto
import arcs.core.crdt.CrdtCount
import arcs.core.crdt.VersionMap
import arcs.core.data.CountType
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StorageKey
import arcs.core.storage.Store
import arcs.core.storage.StoreOptions
import arcs.core.storage.StoreWriteBack
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.testutil.WriteBackForTesting
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlin.coroutines.coroutineContext
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.cancelChildren
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.yield
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [BindingContext]. */
@RunWith(AndroidJUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class, FlowPreview::class)
class BindingContextTest {
    @get:Rule
    val log = LogRule()

    private lateinit var bindingContextScope: CoroutineScope
    private lateinit var store: Store<CrdtCount.Data, CrdtCount.Operation, Int>
    private lateinit var storageKey: StorageKey

    @Before
    fun setUp() {
        bindingContextScope = CoroutineScope(Dispatchers.Default + Job())
        RamDiskDriverProvider()
        RamDisk.clear()
        StoreWriteBack.writeBackFactoryOverride = WriteBackForTesting
        storageKey = RamDiskStorageKey("myCount")
        store = Store(
            StoreOptions(
                storageKey,
                CountType()
            )
        )
    }

    @After
    fun tearDown() {
        bindingContextScope.cancel()
    }

    private fun buildContext(
        callback: suspend (StorageKey, ProxyMessage<*, *, *>) -> Unit = { _, _ -> }
    ) = BindingContext(
        store,
        bindingContextScope.coroutineContext,
        BindingContextStatsImpl(),
        callback
    )

    @Test
    fun getLocalData_fetchesLocalData() = runBlocking {
        val bindingContext = buildContext()
        val callback = DeferredProxyCallback()
        bindingContext.getLocalData(callback)

        var modelUpdate = callback.await().decodeProxyMessage() as ProxyMessage.ModelUpdate
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

        val callback2 = DeferredProxyCallback()
        bindingContext.getLocalData(callback2)

        modelUpdate = callback2.await().decodeProxyMessage() as ProxyMessage.ModelUpdate
        model = checkNotNull(modelUpdate.model as? CrdtCount.Data)

        // Should contain a single entry.
        assertThat(model.values).containsExactly("alice", 1).inOrder()
    }

    @Test
    fun sendProxyMessage_propagatesToTheStore() = runBlocking<Unit> {
        val bindingContext = buildContext()
        val deferredResult = DeferredResult(coroutineContext)
        val message = ProxyMessage.Operations<CrdtCount.Data, CrdtCount.Operation, Int>(
            listOf(CrdtCount.Operation.MultiIncrement("alice", 0 to 10, 10)),
            id = 1
        )
        bindingContext.sendProxyMessage(message.toProto().toByteArray(), deferredResult)

        assertThat(deferredResult.await()).isTrue()

        val data = store.activate().getLocalData()
        assertThat(data.versionMap).isEqualTo(VersionMap("alice" to 10))
        assertThat(data.values).containsExactly("alice", 10)
    }

    @Test
    fun registerCallback_registersCallbackWithStore() = runBlocking {
        val bindingContext = buildContext()
        val callback = DeferredProxyCallback()
        bindingContext.registerCallback(callback)

        // Now send a message directly to the store, and see if we hear it from our callback.
        val message = ProxyMessage.Operations<CrdtCount.Data, CrdtCount.Operation, Int>(
            listOf(
                CrdtCount.Operation.Increment("alice", 0 to 1),
                CrdtCount.Operation.Increment("bob", 0 to 1)
            ),
            id = null
        )

        val messageSend = launch(Dispatchers.IO) { store.activate().onProxyMessage(message) }

        log("waiting for message-send to finish")
        withTimeout(5000) { messageSend.join() }
        log("message-send finished")

        log("waiting for callback")
        val operations = withTimeout(5000) {
            callback.await().decodeProxyMessage() as ProxyMessage.Operations
        }
        log("callback heard")
        assertThat(operations.operations).isEqualTo(message.operations)
    }

    @Test
    fun unregisterCallback_unregistersCallbackFromStore() = runBlocking {
        val bindingContext = buildContext()
        val callback = DeferredProxyCallback()
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

        assertThat(callback.isCompleted).isEqualTo(false)
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
        bindingContext.sendProxyMessage(message.toProto().toByteArray(), deferredResult)

        assertThat(deferredResult.await()).isTrue()

        assertThat(receivedKey).isEqualTo(storageKey)
        assertThat(receivedMessage).isEqualTo(message)
    }
}
