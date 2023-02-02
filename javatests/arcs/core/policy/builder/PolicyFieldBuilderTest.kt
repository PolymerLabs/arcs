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
package arcs.core.policy.builder

import arcs.core.data.builder.annotation
import arcs.core.policy.UsageType
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class PolicyFieldBuilderTest {
  @Test
  fun minimal() {
    val actual = PolicyFieldBuilder(listOf("foo")).build()

    assertThat(actual.annotations).isEmpty()
    assertThat(actual.fieldPath).containsExactly("foo").inOrder()
    assertThat(actual.rawUsages).isEmpty()
    assertThat(actual.redactedUsages).isEmpty()
    assertThat(actual.subfields).isEmpty()
  }

  @Test
  fun withRawUsages() {
    val actual = PolicyFieldBuilder(listOf("foo")).apply {
      rawUsage(UsageType.JOIN, UsageType.EGRESS)
    }.build()

    assertThat(actual.annotations).isEmpty()
    assertThat(actual.fieldPath).containsExactly("foo").inOrder()
    assertThat(actual.rawUsages).containsExactly(UsageType.JOIN, UsageType.EGRESS)
    assertThat(actual.redactedUsages).isEmpty()
    assertThat(actual.subfields).isEmpty()
  }

  @Test
  fun withConditionalUsages() {
    val actual = PolicyFieldBuilder(listOf("foo")).apply {
      conditionalUsage("evenNumbered", UsageType.JOIN, UsageType.EGRESS)
      conditionalUsage("mangled", UsageType.ANY)
    }.build()

    assertThat(actual.annotations).isEmpty()
    assertThat(actual.fieldPath).containsExactly("foo").inOrder()
    assertThat(actual.rawUsages).isEmpty()
    assertThat(actual.redactedUsages).containsExactly(
      "evenNumbered",
      setOf(UsageType.JOIN, UsageType.EGRESS),
      "mangled",
      setOf(UsageType.ANY)
    )
    assertThat(actual.subfields).isEmpty()
  }

  @Test
  fun withPreExistingAnnotation() {
    val annotation = annotation("myAnnotation")
    val actual = PolicyFieldBuilder(listOf("foo")).apply {
      add(annotation)
    }.build()

    assertThat(actual.annotations).containsExactly(annotation)
    assertThat(actual.fieldPath).containsExactly("foo").inOrder()
    assertThat(actual.rawUsages).isEmpty()
    assertThat(actual.redactedUsages).isEmpty()
    assertThat(actual.subfields).isEmpty()
  }

  @Test
  fun withInlineAnnotation() {
    val actual = PolicyFieldBuilder(listOf("foo")).apply {
      annotation("myAnnotation")
      annotation("yourAnnotation") { param("you", "rock") }
    }.build()

    assertThat(actual.annotations).containsExactly(
      annotation("myAnnotation"),
      annotation("yourAnnotation") { param("you", "rock") }
    )
    assertThat(actual.fieldPath).containsExactly("foo").inOrder()
    assertThat(actual.rawUsages).isEmpty()
    assertThat(actual.redactedUsages).isEmpty()
    assertThat(actual.subfields).isEmpty()
  }

  @Test
  fun withSubField() {
    val actual = PolicyFieldBuilder(listOf("foo")).apply {
      "bar" to { rawUsage(UsageType.JOIN) }
      "baz.bean" to { rawUsage(UsageType.EGRESS) }
    }.build()

    assertThat(actual.annotations).isEmpty()
    assertThat(actual.fieldPath).containsExactly("foo").inOrder()
    assertThat(actual.rawUsages).isEmpty()
    assertThat(actual.redactedUsages).isEmpty()
    assertThat(actual.subfields).containsExactly(
      PolicyFieldBuilder(listOf("foo", "bar")).apply { rawUsage(UsageType.JOIN) }.build(),
      PolicyFieldBuilder(listOf("foo", "baz", "bean")).apply { rawUsage(UsageType.EGRESS) }.build()
    )
  }
}
