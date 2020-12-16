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
package arcs.core.host

import arcs.core.common.ArcId
import arcs.core.common.toArcId
import arcs.core.data.CountType
import arcs.core.data.Plan
import arcs.core.storage.StorageKey
import arcs.core.storage.testutil.DummyStorageKey
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.mock
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class ArcHostContextTest {
  @Test
  fun setArcState_differentFromCurrentState_firesStateChange() {
    val context = ArcHostContext("myArc", initialArcState = ArcState.NeverStarted)
    val nextState = ArcState.Running

    var calledArcId: ArcId? = null
    var calledArcState: ArcState? = null
    context.addOnArcStateChange(
      ArcStateChangeRegistration("myCallback")
    ) { arcId, arcState ->
      calledArcId = arcId
      calledArcState = arcState
    }

    context.arcState = nextState

    assertThat(context.arcState).isEqualTo(nextState)
    assertThat(calledArcId).isEqualTo(context.arcId.toArcId())
    assertThat(calledArcState).isEqualTo(nextState)
  }

  @Test
  fun setArcState_sameAsCurrentState_doesNotFireStateChange() {
    val context = ArcHostContext("myArc", initialArcState = ArcState.Running)
    val nextState = ArcState.Running

    var called = false
    context.addOnArcStateChange(ArcStateChangeRegistration("myCallback")) { _, _ ->
      called = true
    }

    context.arcState = nextState

    assertThat(context.arcState).isEqualTo(nextState)
    assertThat(called).isFalse()
  }

  @Test
  fun removeOnArcStateChange_removesTheListener() {
    val context = ArcHostContext("myArc", initialArcState = ArcState.NeverStarted)
    val registration = ArcStateChangeRegistration("myCallback")
    var called = false
    context.addOnArcStateChange(registration) { _, _ ->
      called = true
    }

    context.removeOnArcStateChange(registration)
    context.arcState = ArcState.Running

    assertThat(called).isFalse()
  }

  @Test
  fun setArcState_handlerThrows_otherHandlersCalled() {
    val context = ArcHostContext("myArc", initialArcState = ArcState.NeverStarted)
    var aCalled = false
    var bCalled = false
    var cCalled = false
    context.addOnArcStateChange(ArcStateChangeRegistration("a")) { _, _ ->
      aCalled = true
      throw UnsupportedOperationException("Not implemented! Whoops!")
    }
    context.addOnArcStateChange(ArcStateChangeRegistration("b")) { _, _ ->
      bCalled = true
      throw UnsupportedOperationException("Not implemented! Whoops!")
    }
    context.addOnArcStateChange(ArcStateChangeRegistration("c")) { _, _ ->
      cCalled = true
      throw UnsupportedOperationException("Not implemented! Whoops!")
    }

    context.arcState = ArcState.Running
    assertThat(aCalled).isTrue()
    assertThat(bCalled).isTrue()
    assertThat(cCalled).isTrue()
  }

  @Test
  fun addParticle_addsParticleAtEnd() {
    val context = ArcHostContext("myArc")
    val particle1 = buildParticleContext("a")
    val particle2 = buildParticleContext("b")

    context.addParticle(particle1)
    assertThat(context.particles.last()).isSameInstanceAs(particle1)

    context.addParticle(particle2)
    assertThat(context.particles.last()).isSameInstanceAs(particle2)
  }

  @Test
  fun setParticle_setsParticleAtLocation() {
    val context = ArcHostContext("myArc")
    val particle1 = buildParticleContext("a")
    val particle2 = buildParticleContext("b")
    val particle3 = buildParticleContext("c")

    context.addParticle(particle1)
    context.addParticle(particle2)
    context.setParticle(0, particle3)

    assertThat(context.particles[0]).isSameInstanceAs(particle3)
  }

  @Test
  fun allReadableStorageKeys_noParticles_returnsEmptyList() {
    val context = ArcHostContext(
      "myArc",
      particles = emptyList()
    )

    assertThat(context.allReadableStorageKeys()).isEmpty()
  }

  @Test
  fun allReadableStorageKeys_noReadableHandles_returnsEmptyList() {
    val context = ArcHostContext(
      arcId = "myArc",
      particles = listOf(
        buildParticleContext(
          "a",
          mapOf(
            "foo" to buildHandleConnection(DummyStorageKey("writable"), HandleMode.Write)
          )
        ),
        buildParticleContext(
          "b",
          mapOf(
            "bar" to buildHandleConnection(DummyStorageKey("writable2"), HandleMode.Write)
          )
        )
      )
    )

    assertThat(context.allReadableStorageKeys()).isEmpty()
  }

  @Test
  fun allReadableStorageKeys() {
    val storageKeys = listOf(
      DummyStorageKey("sk1"),
      DummyStorageKey("sk2")
    )
    val context = ArcHostContext(
      arcId = "myArc",
      particles = listOf(
        buildParticleContext(
          "a",
          mapOf(
            "foo" to buildHandleConnection(storageKeys[0], HandleMode.Read)
          )
        ),
        buildParticleContext(
          "b",
          mapOf(
            "bar" to buildHandleConnection(storageKeys[1], HandleMode.ReadWrite)
          )
        )
      )
    )

    assertThat(context.allReadableStorageKeys()).containsExactlyElementsIn(storageKeys)
  }

  @Test
  fun allReadableStorageKeys_deduplicates() {
    val storageKeys = listOf(
      DummyStorageKey("sk1"),
      DummyStorageKey("sk2")
    )
    val context = ArcHostContext(
      arcId = "myArc",
      particles = listOf(
        buildParticleContext(
          "a",
          mapOf(
            "foo" to buildHandleConnection(storageKeys[0], HandleMode.Read)
          )
        ),
        buildParticleContext(
          "b",
          mapOf(
            "bar" to buildHandleConnection(storageKeys[1], HandleMode.ReadWrite)
          )
        ),
        buildParticleContext(
          "c",
          mapOf(
            "another" to buildHandleConnection(storageKeys[1], HandleMode.ReadWrite)
          )
        )
      )
    )

    assertThat(context.allReadableStorageKeys()).containsExactlyElementsIn(storageKeys)
  }

  @Test
  fun toString_format() {
    val particle1 = buildParticleContext("a")
    val particle2 = buildParticleContext("b")
    val context = ArcHostContext(
      "myArc",
      particles = listOf(particle1, particle2),
      initialArcState = ArcState.Running
    )

    assertThat(context.toString())
      .isEqualTo(
        "ArcHostContext(arcId=myArc, arcState=Running, particles=${listOf(particle1, particle2)})"
      )
  }

  private fun buildParticleContext(
    name: String,
    handles: Map<String, Plan.HandleConnection> = emptyMap()
  ): ParticleContext {
    return ParticleContext(
      particle = mock(),
      planParticle = Plan.Particle(
        particleName = name,
        location = "loc",
        handles = handles
      )
    )
  }

  private fun buildHandleConnection(key: StorageKey, mode: HandleMode): Plan.HandleConnection {
    return Plan.HandleConnection(
      handle = Plan.Handle(key, CountType(), emptyList()),
      mode = mode,
      type = CountType()
    )
  }
}
