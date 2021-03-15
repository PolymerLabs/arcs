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
import arcs.core.policy.PolicyRetention
import arcs.core.policy.StorageMedium
import arcs.core.policy.UsageType
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class PolicyTargetBuilderTest {
  @Test
  fun minimal() {
    val actual = target("MySchema", maxAgeMillis = 1234)

    assertThat(actual.schemaName).isEqualTo("MySchema")
    assertThat(actual.maxAgeMs).isEqualTo(1234L)
    assertThat(actual.fields).isEmpty()
    assertThat(actual.annotations).isEmpty()
    assertThat(actual.retentions).isEmpty()
  }

  @Test
  fun withPreExistingAnnotation() {
    val annotation = annotation("myAnnotation")
    val actual = target("MySchema", maxAgeMillis = 0) {
      add(annotation)
    }

    assertThat(actual.schemaName).isEqualTo("MySchema")
    assertThat(actual.maxAgeMs).isEqualTo(0L)
    assertThat(actual.fields).isEmpty()
    assertThat(actual.annotations).containsExactly(
      annotation("myAnnotation")
    )
    assertThat(actual.retentions).isEmpty()
  }

  @Test
  fun withInlineAnnotation() {
    val actual = target("MySchema", maxAgeMillis = 0) {
      annotation("myAnnotation")
      annotation("yourAnnotation") { param("name", "someone") }
    }

    assertThat(actual.schemaName).isEqualTo("MySchema")
    assertThat(actual.maxAgeMs).isEqualTo(0L)
    assertThat(actual.fields).isEmpty()
    assertThat(actual.annotations).containsExactly(
      annotation("myAnnotation"),
      annotation("yourAnnotation") { param("name", "someone") }
    )
    assertThat(actual.retentions).isEmpty()
  }

  @Test
  fun withRetention() {
    val actual = target("MySchema", maxAgeMillis = 0) {
      retention(StorageMedium.DISK, encryptionRequired = true)
      retention(StorageMedium.RAM, encryptionRequired = false)
    }

    assertThat(actual.schemaName).isEqualTo("MySchema")
    assertThat(actual.maxAgeMs).isEqualTo(0L)
    assertThat(actual.fields).isEmpty()
    assertThat(actual.annotations).isEmpty()
    assertThat(actual.retentions).containsExactly(
      PolicyRetention(StorageMedium.DISK, encryptionRequired = true),
      PolicyRetention(StorageMedium.RAM, encryptionRequired = false)
    )
  }

  @Test
  fun withField() {
    val actual = target("MySchema", maxAgeMillis = 0) {
      "name" to { rawUsage(UsageType.EGRESS) }
    }

    assertThat(actual.schemaName).isEqualTo("MySchema")
    assertThat(actual.maxAgeMs).isEqualTo(0L)
    assertThat(actual.fields).containsExactly(
      PolicyFieldBuilder(listOf("name")).apply { rawUsage(UsageType.EGRESS) }.build()
    )
    assertThat(actual.annotations).isEmpty()
    assertThat(actual.retentions).isEmpty()
  }
}
