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
package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.VersionMap
import arcs.core.data.util.toReferencable
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.times
import com.nhaarman.mockitokotlin2.verify
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(JUnit4::class)
class LocalStorageEndpointTest {

  @Test
  fun endpoint_idle_delegatesToStore() = runTest {
    val mock = mock<ActiveStore<*, CrdtOperation, *>>()
    val endpoint = LocalStorageEndpoint(mock, 0)

    endpoint.idle()

    verify(mock, times(1)).idle()
  }

  @Test
  fun endpoint_proxyMessage_delegatesToStoreAndCopiesId() = runTest {
    val mock = mock<ActiveStore<CrdtData, CrdtOperation, Any?>>()
    val endpoint = LocalStorageEndpoint(mock, 10)

    endpoint.onProxyMessage(DUMMY_PROXY_MESSAGE)

    verify(mock, times(1)).onProxyMessage(DUMMY_PROXY_MESSAGE.copy(id = 10))
  }

  @Test
  fun endpoint_close_removesStoreCallback() = runTest {
    val mock = mock<ActiveStore<*, CrdtOperation, *>>()
    val endpoint = LocalStorageEndpoint(mock, 12)

    endpoint.close()

    verify(mock, times(1)).off(12)
  }

  private fun runTest(block: suspend CoroutineScope.() -> Unit): Unit = runBlockingTest {
    block()
  }

  companion object {
    val DUMMY_PROXY_MESSAGE = ProxyMessage.ModelUpdate<CrdtData, CrdtOperation, Any?>(
      model = CrdtEntity.Data(
        singletons = mapOf(
          "a" to CrdtSingleton<CrdtEntity.Reference>(
            VersionMap("alice" to 1),
            CrdtEntity.ReferenceImpl("AAA".toReferencable().id)
          ),
          "b" to CrdtSingleton<CrdtEntity.Reference>(
            VersionMap("bob" to 1),
            CrdtEntity.ReferenceImpl("BBB".toReferencable().id)
          )
        ),
        collections = mapOf(),
        versionMap = VersionMap("Bar" to 2),
        creationTimestamp = 971,
        expirationTimestamp = -1
      ),
      id = 1
    )
  }
}
