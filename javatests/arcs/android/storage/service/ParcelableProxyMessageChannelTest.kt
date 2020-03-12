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
import arcs.android.storage.ParcelableProxyMessage
import arcs.android.storage.toParcelable
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.ProxyMessage
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.asFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.supervisorScope
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelableProxyMessageChannel]. */
@RunWith(AndroidJUnit4::class)
@UseExperimental(ExperimentalCoroutinesApi::class, FlowPreview::class)
class ParcelableProxyMessageChannelTest {
    @Test
    fun proxyMessages_pipedToChannel() = runBlocking {
        val channel = ParcelableProxyMessageChannel(
            coroutineContext
        )

        // Subscribe to the flow of messages, and map them to their IDs.
        val receivedIds = async {
            channel.asFlow()
                .onEach { it.result.complete(true) }
                .map { it.message.id }
                .toList()
        }

        // Publish messages with different IDs.
        val messageJob = launch {
            repeat(100) {
                channel.onProxyMessage(makeMessage(it),
                    DeferredResult(coroutineContext)
                )
            }
        }

        // Wait for publishing to finish.
        messageJob.join()
        // Close the channel, so that `.toList` on the flow is called.
        channel.close()

        assertThat(receivedIds.await())
            .containsExactlyElementsIn((0..99).toList())
            .inOrder()
    }

    @Test
    fun proxyMessages_whenHandledResultIsFalse_sendExceptionToCallback() = runBlocking {
        val channel = ParcelableProxyMessageChannel(coroutineContext)
        val deferredResult = DeferredResult(coroutineContext)
        channel.onProxyMessage(makeMessage(0), deferredResult)
        channel.openSubscription().receive().result.complete(false)
        assertThat(deferredResult.await()).isFalse()
    }

    @Test
    fun proxyMessages_whenResultIsCompletedExceptionally_sendExceptionToCallback() = runBlocking {
        try {
            supervisorScope {
                val channel = ParcelableProxyMessageChannel(coroutineContext)
                val deferredResult = DeferredResult(coroutineContext)
                channel.onProxyMessage(makeMessage(0), deferredResult)
                channel.openSubscription().receive().result
                    .completeExceptionally(CrdtException("Uh Oh!"))
                deferredResult.await()
            }
            Unit
        } catch (e: Exception) {
            assertThat(e.message).contains("Uh Oh!")
        }
    }

    private fun makeMessage(id: Int): ParcelableProxyMessage =
        ProxyMessage.SyncRequest<CrdtData, CrdtOperation, Any?>(id)
            .toParcelable(ParcelableCrdtType.Count)
}
