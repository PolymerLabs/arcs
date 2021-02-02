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
import arcs.core.storage.testutil.DummyStorageKey
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class PlanHandleBuilderTest {
  @Test
  fun handle_withoutType_throws() {
    val e = assertFailsWith<IllegalArgumentException> {
      handle(KEY) { }
    }

    assertThat(e).hasMessageThat().isEqualTo("Type must be specified in Plan.Handle builder")
  }

  @Test
  fun handle_minimal() {
    val actual = handle(KEY, TYPE)

    assertThat(actual.storageKey).isEqualTo(KEY)
    assertThat(actual.type).isEqualTo(TYPE)
    assertThat(actual.annotations).isEmpty()
  }

  @Test
  fun handle_minimalInlineType() {
    val actual = handle(KEY) { type = TYPE }

    assertThat(actual.storageKey).isEqualTo(KEY)
    assertThat(actual.type).isEqualTo(TYPE)
    assertThat(actual.annotations).isEmpty()
  }

  @Test
  fun handle_withAnnotationsBuiltInline() {
    val actual = handle(KEY, TYPE) {
      annotation("encrypted")
      annotation("ttl") { param("duration", "15 days") }
    }

    assertThat(actual.storageKey).isEqualTo(KEY)
    assertThat(actual.type).isEqualTo(TYPE)
    assertThat(actual.annotations).containsExactly(
      annotation("encrypted"),
      annotation("ttl") { param("duration", "15 days") }
    )
  }

  @Test
  fun handle_withPrebuiltAnnotations() {
    val encrypted = annotation("encrypted")
    val ttl = annotation("ttl") { param("duration", "15 days") }
    val actual = handle(KEY, TYPE) {
      add(encrypted)
      add(ttl)
    }

    assertThat(actual.storageKey).isEqualTo(KEY)
    assertThat(actual.type).isEqualTo(TYPE)
    assertThat(actual.annotations).containsExactly(encrypted, ttl)
  }

  companion object {
    val KEY = DummyStorageKey("dummy")
    val TYPE = CountType()
  }
}
