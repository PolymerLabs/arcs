/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs.core.data.builder

import arcs.core.data.CountType
import arcs.core.data.HandleMode
import arcs.core.data.SingletonType
import arcs.core.storage.testutil.DummyStorageKey
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class ParticleBuilderTest {
  @Test
  fun minimal() {
    val actual = particle("MyParticle", "C:\\Program Files\\Arcs\\MyParticle")

    assertThat(actual.particleName).isEqualTo("MyParticle")
    assertThat(actual.location).isEqualTo("C:\\Program Files\\Arcs\\MyParticle")
  }

  @Test
  fun withHandleConnections_builtInline() {
    val actual = particle("MyParticle", "/Users/sundar/myparticle.txt") {
      handleConnection("handle1", HandleMode.Read, HANDLE_1)
      handleConnection("handle2", HandleMode.ReadWriteQuery, HANDLE_2)
    }

    assertThat(actual.particleName).isEqualTo("MyParticle")
    assertThat(actual.location).isEqualTo("/Users/sundar/myparticle.txt")
    assertThat(actual.handles).containsExactly(
      "handle1", handleConnection(HandleMode.Read, HANDLE_1),
      "handle2", handleConnection(HandleMode.ReadWriteQuery, HANDLE_2)
    )
  }

  @Test
  fun withHandleConnections_prebuilt() {
    val handle1Conn = handleConnection(HandleMode.Read, HANDLE_1)
    val handle2Conn = handleConnection(HandleMode.ReadWriteQuery, HANDLE_2)
    val actual = particle("MyParticle", "/Users/sundar/myparticle.txt") {
      add("handle1" to handle1Conn)
      add("handle2" to handle2Conn)
    }

    assertThat(actual.particleName).isEqualTo("MyParticle")
    assertThat(actual.location).isEqualTo("/Users/sundar/myparticle.txt")
    assertThat(actual.handles).containsExactly(
      "handle1", handleConnection(HandleMode.Read, HANDLE_1),
      "handle2", handleConnection(HandleMode.ReadWriteQuery, HANDLE_2)
    )
  }

  companion object {
    private val HANDLE_1 = handle(DummyStorageKey("Handle1Key"), CountType())
    private val HANDLE_2 = handle(DummyStorageKey("Handle2Key"), SingletonType(CountType()))
  }
}
