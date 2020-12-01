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

package arcs.core.storage.util

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.VersionMap
import arcs.core.storage.ProxyMessage
import com.google.common.truth.Truth.assertThat
import kotlin.random.Random
import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

private typealias DummyProxyMessage = ProxyMessage<DummyData, DummyOp, String>

/** Tests for the [CallbackManager]. */
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(JUnit4::class)
class CallbackManagerTest {
  private val manager: CallbackManager<DummyProxyMessage> =
    callbackManager("", Random)

  private val noOpTestCallback1: Callback<DummyProxyMessage> = { }
  private val noOpTestCallback2: Callback<DummyProxyMessage> = { }

  @Test
  fun isEmpty_withNothingRegistered_returnsTrue() {
    assertThat(manager.isEmpty()).isTrue()
  }

  @Test
  fun hasBecomeEmpty_withNothingEverRegistered_returnsFalse() {
    assertThat(manager.hasBecomeEmpty()).isFalse()
  }

  @Test
  fun isEmpty_withOneRegisteredCallback_returnsFalse() {
    manager.register(noOpTestCallback1)

    assertThat(manager.isEmpty()).isFalse()
  }

  @Test
  fun isEmpty_withCallbacksRegistered_andThenUnregistered_returnsTrue() {
    val token1 = manager.register(noOpTestCallback1)
    val token2 = manager.register(noOpTestCallback2)
    manager.unregister(token1)
    manager.unregister(token2)

    assertThat(manager.isEmpty()).isTrue()
  }

  @Test
  fun getCallback_afterRegisteringCallbacks_andThenUnregistering_returnsNull() {
    val token1 = manager.register(noOpTestCallback1)
    val token2 = manager.register(noOpTestCallback2)
    manager.unregister(token1)
    manager.unregister(token2)

    assertThat(manager.getCallback(token1)).isNull()
    assertThat(manager.getCallback(token2)).isNull()
  }

  @Test
  fun getCallback_afterRegisteringCallbacks_andThenUnregisteringCallbacks_returnsNull() {
    val token1 = manager.register(noOpTestCallback1)
    val token2 = manager.register(noOpTestCallback2)
    manager.unregister(token1)
    manager.unregister(token2)

    assertThat(manager.getCallback(token1)).isNull()
    assertThat(manager.getCallback(token2)).isNull()
  }

  @Test
  fun isEmpty_afterRegisteringCallbacks_andThenClearing_returnsTrue() {
    manager.register(noOpTestCallback1)
    manager.register(noOpTestCallback2)
    manager.clear()

    assertThat(manager.isEmpty()).isTrue()
  }

  @Test
  fun hasBecomeEmpty_afterRegisteringCallbacks_andThenClearing_returnsTrue() {
    manager.register(noOpTestCallback1)
    manager.register(noOpTestCallback2)
    manager.clear()

    assertThat(manager.hasBecomeEmpty()).isTrue()
  }

  @Test
  fun getCallback_afterClear_returnsNull() {
    val token1 = manager.register(noOpTestCallback1)
    val token2 = manager.register(noOpTestCallback2)
    manager.clear()

    val returnedCallback1 = manager.getCallback(token1)
    val returnedCallback2 = manager.getCallback(token2)

    assertThat(returnedCallback1).isNull()
    assertThat(returnedCallback2).isNull()
  }

  @Test
  fun hasBecomeEmpty_afterRegisteringCallbacks_andThenUnregistering_returnsTrue() {
    val token1 = manager.register(noOpTestCallback1)
    val token2 = manager.register(noOpTestCallback2)
    manager.unregister(token1)
    manager.unregister(token2)

    assertThat(manager.hasBecomeEmpty()).isTrue()
  }

  @Test
  fun getCallback_afterRegisteringCallbacks_returnsCallbackForToken() {
    val token1 = manager.register(noOpTestCallback1)
    val token2 = manager.register(noOpTestCallback2)

    val returnedCallback1 = manager.getCallback(token1)
    val returnedCallback2 = manager.getCallback(token2)

    assertThat(returnedCallback1).isEqualTo(noOpTestCallback1)
    assertThat(returnedCallback2).isEqualTo(noOpTestCallback2)
  }

  @Test
  fun allCallbacksExcept_afterRegisteringCallbacks_returnsAllCallbacksExceptSpecified() {
    val token1 = manager.register(noOpTestCallback1)
    val token2 = manager.register(noOpTestCallback2)

    val returnedCallbacksExcept1 = manager.allCallbacksExcept(token1)
    val returnedCallbacksExcept2 = manager.allCallbacksExcept(token2)

    assertThat(returnedCallbacksExcept1).containsExactly(noOpTestCallback2)
    assertThat(returnedCallbacksExcept2).containsExactly(noOpTestCallback1)
  }
}

private data class DummyData(
  val name: String,
  override var versionMap: VersionMap = VersionMap()
) : CrdtData

private data class DummyOp(val name: String) : CrdtOperation
