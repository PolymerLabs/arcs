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

import arcs.core.policy.StorageMedium
import com.google.common.truth.Truth.assertThat
import java.time.Duration
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class PolicyBuilderTest {
  @Test
  fun minimal() {
    val actual = policy("MyPolicy", "Analytics")

    assertThat(actual.name).isEqualTo("MyPolicy")
    assertThat(actual.egressType).isEqualTo("Analytics")
    assertThat(actual.description).isEqualTo("")
    assertThat(actual.configs).isEmpty()
    assertThat(actual.targets).isEmpty()
  }

  @Test
  fun withDescription() {
    val actual = policy("MyPolicy", "Analytics") {
      description = "This is my description."
    }

    assertThat(actual.name).isEqualTo("MyPolicy")
    assertThat(actual.egressType).isEqualTo("Analytics")
    assertThat(actual.description).isEqualTo("This is my description.")
    assertThat(actual.configs).isEmpty()
    assertThat(actual.targets).isEmpty()
  }

  @Test
  fun withTargets() {
    val actual = policy("MyPolicy", "Analytics") {
      target("Foo") {
        maxAgeMillis = Duration.ofMinutes(15).toMillis()
        retention(StorageMedium.RAM, encryptionRequired = false)
      }
      target("Bar") {
        maxAgeMillis = Duration.ofDays(2).toMillis()
        retention(StorageMedium.DISK, encryptionRequired = true)
      }
    }

    assertThat(actual.name).isEqualTo("MyPolicy")
    assertThat(actual.egressType).isEqualTo("Analytics")
    assertThat(actual.description).isEqualTo("")
    assertThat(actual.configs).isEmpty()
    assertThat(actual.targets).containsExactly(
      target("Foo") {
        maxAgeMillis = Duration.ofMinutes(15).toMillis()
        retention(StorageMedium.RAM, encryptionRequired = false)
      },
      target("Bar") {
        maxAgeMillis = Duration.ofDays(2).toMillis()
        retention(StorageMedium.DISK, encryptionRequired = true)
      }
    )
  }

  @Test
  fun withConfigs() {
    val actual = policy("MyPolicy", "Analytics") {
      config("DiskStorage") {
        "engine" to "innoDB"
      }
      config("Cache") {
        "maxItems" to "15"
      }
    }

    assertThat(actual.name).isEqualTo("MyPolicy")
    assertThat(actual.egressType).isEqualTo("Analytics")
    assertThat(actual.description).isEqualTo("")
    assertThat(actual.configs).containsExactly(
      "DiskStorage", PolicyConfigBuilder().apply { "engine" to "innoDB" }.build(),
      "Cache", PolicyConfigBuilder().apply { "maxItems" to "15" }.build()
    )
    assertThat(actual.targets).isEmpty()
  }
}
