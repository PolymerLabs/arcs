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

import arcs.core.data.CollectionType
import arcs.core.data.CountType
import arcs.core.data.HandleMode
import arcs.core.data.SingletonType
import arcs.core.storage.testutil.DummyStorageKey
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class PlanBuilderTest {
  @Test
  fun minimal() {
    val plan = plan()

    assertThat(plan.arcId).isNull()
    assertThat(plan.annotations).isEmpty()
    assertThat(plan.particles).isEmpty()
    assertThat(plan.handles).isEmpty()
  }

  @Test
  fun withArcId() {
    val plan = plan { arcId = "MyPlan" }

    assertThat(plan.arcId).isEqualTo("MyPlan")
    assertThat(plan.annotations).containsExactly(
      annotation("arcId") { param("id", "MyPlan") }
    )
    assertThat(plan.particles).isEmpty()
    assertThat(plan.handles).isEmpty()
  }

  @Test
  fun changingArcId_usesLatest() {
    val plan = plan {
      assertThat(arcId).isNull()
      arcId = "MyPlan"
      assertThat(arcId).isEqualTo("MyPlan")
      arcId = "NewPlanId"
    }

    assertThat(plan.arcId).isEqualTo("NewPlanId")
    assertThat(plan.annotations).containsExactly(
      annotation("arcId") { param("id", "NewPlanId") }
    )
    assertThat(plan.particles).isEmpty()
    assertThat(plan.handles).isEmpty()
  }

  @Test
  fun arcIdAsAnnotation() {
    val plan = plan {
      annotation("arcId") { param("id", "MyArc") }
      assertThat(arcId).isEqualTo("MyArc")
    }

    assertThat(plan.arcId).isEqualTo("MyArc")
    assertThat(plan.annotations).containsExactly(
      annotation("arcId") { param("id", "MyArc") }
    )
    assertThat(plan.particles).isEmpty()
    assertThat(plan.handles).isEmpty()
  }

  @Test
  fun withAnnotations_builtInline() {
    val plan = plan {
      annotation("ingestion")
      annotation("isSuperAwesome") { param("value", true) }
    }

    assertThat(plan.arcId).isNull()
    assertThat(plan.annotations).containsExactly(
      annotation("ingestion"),
      annotation("isSuperAwesome") { param("value", true) }
    )
    assertThat(plan.particles).isEmpty()
    assertThat(plan.handles).isEmpty()
  }

  @Test
  fun withAnnotations_prebuilt() {
    val ingestion = annotation("ingestion")
    val isSuperAwesome = annotation("isSuperAwesome") { param("value", true) }
    val plan = plan {
      add(ingestion)
      add(isSuperAwesome)
    }

    assertThat(plan.arcId).isNull()
    assertThat(plan.annotations).containsExactly(
      annotation("ingestion"),
      annotation("isSuperAwesome") { param("value", true) }
    )
    assertThat(plan.particles).isEmpty()
    assertThat(plan.handles).isEmpty()
  }

  @Test
  fun withHandles_builtInline() {
    val plan = plan {
      handle(STORAGE_KEY_1, SingletonType(CountType()))
      handle(STORAGE_KEY_2) { type = CollectionType(CountType()) }
    }

    assertThat(plan.arcId).isNull()
    assertThat(plan.annotations).isEmpty()
    assertThat(plan.particles).isEmpty()
    assertThat(plan.handles).containsExactly(
      handle(STORAGE_KEY_1, SingletonType(CountType())),
      handle(STORAGE_KEY_2) { type = CollectionType(CountType()) }
    )
  }

  @Test
  fun withHandles_preBuilt() {
    val handle1 = handle(STORAGE_KEY_1, SingletonType(CountType()))
    val handle2 = handle(STORAGE_KEY_2) { type = CollectionType(CountType()) }
    val plan = plan {
      add(handle1)
      add(handle2)
    }

    assertThat(plan.arcId).isNull()
    assertThat(plan.annotations).isEmpty()
    assertThat(plan.particles).isEmpty()
    assertThat(plan.handles).containsExactly(
      handle(STORAGE_KEY_1, SingletonType(CountType())),
      handle(STORAGE_KEY_2) { type = CollectionType(CountType()) }
    )
  }

  @Test
  fun withParticles_builtInline() {
    val plan = plan {
      val handle1 = handle(STORAGE_KEY_1, SingletonType(CountType()))
      particle("Particle1", "/Particle1.txt") {
        handleConnection("handle1", HandleMode.Read, handle1)
      }
      particle("Particle2", "/Particle2.txt") {
        handleConnection("handle1", HandleMode.ReadWrite, handle1)
      }
    }

    assertThat(plan.arcId).isNull()
    assertThat(plan.annotations).isEmpty()
    assertThat(plan.particles).containsExactly(
      particle("Particle1", "/Particle1.txt") {
        handleConnection(
          "handle1",
          HandleMode.Read,
          handle(STORAGE_KEY_1, SingletonType(CountType()))
        )
      },
      particle("Particle2", "/Particle2.txt") {
        handleConnection(
          "handle1",
          HandleMode.ReadWrite,
          handle(STORAGE_KEY_1, SingletonType(CountType()))
        )
      }
    )
    assertThat(plan.handles).containsExactly(
      handle(STORAGE_KEY_1, SingletonType(CountType()))
    )
  }

  @Test
  fun withParticles_prebuilt() {
    val handle1 = handle(STORAGE_KEY_1, SingletonType(CountType()))
    val particle1 = particle("Particle1", "/Particle1.txt") {
      handleConnection("handle1", HandleMode.Read, handle1)
    }
    val particle2 = particle("Particle2", "/Particle2.txt") {
      handleConnection("handle1", HandleMode.ReadWrite, handle1)
    }

    val plan = plan {
      add(particle1)
      add(particle2)
    }

    assertThat(plan.arcId).isNull()
    assertThat(plan.annotations).isEmpty()
    assertThat(plan.particles).containsExactly(
      particle("Particle1", "/Particle1.txt") {
        handleConnection(
          "handle1",
          HandleMode.Read,
          handle(STORAGE_KEY_1, SingletonType(CountType()))
        )
      },
      particle("Particle2", "/Particle2.txt") {
        handleConnection(
          "handle1",
          HandleMode.ReadWrite,
          handle(STORAGE_KEY_1, SingletonType(CountType()))
        )
      }
    )
    assertThat(plan.handles).containsExactly(
      handle(STORAGE_KEY_1, SingletonType(CountType()))
    )
  }

  companion object {
    private val STORAGE_KEY_1 = DummyStorageKey("sk1")
    private val STORAGE_KEY_2 = DummyStorageKey("sk2")
  }
}
