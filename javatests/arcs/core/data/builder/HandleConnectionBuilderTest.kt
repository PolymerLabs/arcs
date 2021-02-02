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
class HandleConnectionBuilderTest {
  @Test
  fun minimal() {
    val actual = handleConnection(HandleMode.ReadWrite, HANDLE)

    assertThat(actual.mode).isEqualTo(HandleMode.ReadWrite)
    assertThat(actual.handle).isEqualTo(HANDLE)
    assertThat(actual.type).isEqualTo(HANDLE.type)
    assertThat(actual.expression).isNull()
    assertThat(actual.annotations).isEmpty()
  }

  @Test
  fun customType() {
    val actual = handleConnection(HandleMode.ReadWrite, HANDLE) {
      type = SingletonType(CountType())
    }

    assertThat(actual.mode).isEqualTo(HandleMode.ReadWrite)
    assertThat(actual.handle).isEqualTo(HANDLE)
    assertThat(actual.type).isEqualTo(SingletonType(CountType()))
    assertThat(actual.expression).isNull()
    assertThat(actual.annotations).isEmpty()
  }

  @Test
  fun withAnnotations_builtInline() {
    val actual = handleConnection(HandleMode.ReadWrite, HANDLE) {
      annotation("encrypted")
      annotation("ttl") { param("duration", "15 days") }
    }

    assertThat(actual.mode).isEqualTo(HandleMode.ReadWrite)
    assertThat(actual.handle).isEqualTo(HANDLE)
    assertThat(actual.type).isEqualTo(HANDLE.type)
    assertThat(actual.expression).isNull()
    assertThat(actual.annotations).containsExactly(
      annotation("encrypted"),
      annotation("ttl") { param("duration", "15 days") }
    )
  }

  @Test
  fun withAnnotations_prebuilt() {
    val encrypted = annotation("encrypted")
    val ttl = annotation("ttl") { param("duration", "15 days") }

    val actual = handleConnection(HandleMode.ReadWrite, HANDLE) {
      add(encrypted)
      add(ttl)
    }

    assertThat(actual.mode).isEqualTo(HandleMode.ReadWrite)
    assertThat(actual.handle).isEqualTo(HANDLE)
    assertThat(actual.type).isEqualTo(HANDLE.type)
    assertThat(actual.expression).isNull()
    assertThat(actual.annotations).containsExactly(
      annotation("encrypted"),
      annotation("ttl") { param("duration", "15 days") }
    )
  }

  companion object {
    val HANDLE = handle(DummyStorageKey("KeyForHandle"), CountType())
  }
}
