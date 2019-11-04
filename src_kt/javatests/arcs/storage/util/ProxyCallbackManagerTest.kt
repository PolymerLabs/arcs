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

package arcs.storage.util

import arcs.crdt.CrdtData
import arcs.crdt.CrdtOperation
import arcs.crdt.internal.VersionMap
import arcs.storage.MultiplexedProxyCallback
import arcs.storage.ProxyCallback
import arcs.storage.ProxyMessage
import com.google.common.truth.Truth.assertThat
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import java.util.concurrent.Executors
import kotlin.random.Random

/** Tests for the [ProxyCallbackManager]. */
@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class ProxyCallbackManagerTest {
    private val threadPoolDispatcher = Executors.newFixedThreadPool(100).asCoroutineDispatcher()
    private val random = Random.Default

    private lateinit var manager: ProxyCallbackManager<DummyData, DummyOp, String>

    @Before
    fun setup() {
        manager = ProxyCallbackManager()
    }

    @Test
    fun concurrentRegistrations_dontCollideTokens() = runBlocking(threadPoolDispatcher) {
        // Launch 200 coroutines and concurrently add 200 callbacks.
        0.until(200).map {
            launch {
                Thread.sleep(random.nextLong(0, 1000))
                manager.register(ProxyCallback { true })
            }
        }.joinAll()

        // Now check that the nextCallbackToken is correct (should be 201 if we didn't erroneously
        // attempt to increment outside of a lock.
        assertThat(manager.nextCallbackToken).isEqualTo(201)
        assertThat(manager.callbacks.size).isEqualTo(200)
    }

    @Test
    fun sendWhichCausesARegistration_doesntDeadlock() = runBlockingTest {
        val registeredMessage = atomic<ProxyMessage<DummyData, DummyOp, String>?>(null)
        val registeredCallback = ProxyCallback<DummyData, DummyOp, String> {
            registeredMessage.value = it
            true
        }
        val registeringCallback = ProxyCallback<DummyData, DummyOp, String> {
            manager.register(registeredCallback)
            true
        }

        val shouldBeReceivedByRegistered = makeMessage("bar", 1)

        manager.register(registeringCallback)

        manager.send(makeMessage("foo", 1))
        assertThat(registeredMessage.value).isNull()

        manager.send(shouldBeReceivedByRegistered)
        assertThat(registeredMessage.value).isEqualTo(shouldBeReceivedByRegistered)
    }

    @Test
    fun sendMultiplexedWhichCausesARegistration_doesntDeadlock() = runBlockingTest {
        val registeredMessage = atomic<ProxyMessage<DummyData, DummyOp, String>?>(null)
        val registeredCallback =
            MultiplexedProxyCallback<DummyData, DummyOp, String> { message, _ ->
                registeredMessage.value = message
                true
            }
        val registeringCallback =
            MultiplexedProxyCallback<DummyData, DummyOp, String> { _, _ ->
                manager.register(registeredCallback)
                true
            }

        val shouldBeReceivedByRegistered = makeMessage("bar", 1)

        manager.register(registeringCallback)

        manager.sendMultiplexed(makeMessage("foo", 1), "mux1")
        assertThat(registeredMessage.value).isNull()

        manager.sendMultiplexed(shouldBeReceivedByRegistered, "mux1")
        assertThat(registeredMessage.value).isEqualTo(shouldBeReceivedByRegistered)
    }

    private fun makeMessage(name: String, id: Int): ProxyMessage<DummyData, DummyOp, String> =
        ProxyMessage.ModelUpdate(DummyData(name), id = id)

    private data class DummyData(
        val name: String,
        override var versionMap: VersionMap = VersionMap()
    ) : CrdtData

    private data class DummyOp(val name: String) : CrdtOperation
}
