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

import arcs.core.host.api.HandleHolder
import arcs.sdk.Particle
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class ParticleIdentifierTest {
  @Test
  fun from_emptyString_throws() {
    val e = assertFailsWith<IllegalArgumentException> {
      ParticleIdentifier.from("")
    }
    assertThat(e).hasMessageThat().contains("Canonical variant of \"\" is blank")
  }

  @Test
  fun from_blankString_throws() {
    val e = assertFailsWith<IllegalArgumentException> {
      ParticleIdentifier.from("      \t")
    }
    assertThat(e).hasMessageThat().contains("Canonical variant of \"      \t\" is blank")
  }

  @Test
  fun from_allSlashes_throws() {
    val e = assertFailsWith<IllegalArgumentException> {
      ParticleIdentifier.from("////////")
    }
    assertThat(e).hasMessageThat().contains("Canonical variant of \"////////\" is blank")
  }

  @Test
  fun from_almostAllSlashes() {
    val pid = ParticleIdentifier.from("///a/////")
    assertThat(pid.id).isEqualTo("a")
  }

  @Test
  fun from_simple() {
    val pid = ParticleIdentifier.from("ThisIsMe")
    assertThat(pid.id).isEqualTo("ThisIsMe")
  }

  @Test
  fun from_bazelPath() {
    val pid = ParticleIdentifier.from("//java/arcs/core/host/ParticleIdentifier")
    assertThat(pid.id).isEqualTo("java.arcs.core.host.ParticleIdentifier")
  }

  @Test
  fun kclassToParticleIdentifier() {
    val pid = MyParticleImplementation::class.toParticleIdentifier()
    assertThat(pid.id)
      .isEqualTo("arcs.core.host.ParticleIdentifierTest.MyParticleImplementation")
  }

  @Test
  fun anonymousKClassToParticleIdentifier() {
    val pid = (
      object : Particle {
        override val handles: HandleHolder
          get() = throw UnsupportedOperationException()
      }
      )::class.toParticleIdentifier()
    assertThat(pid.id)
      .isEqualTo("arcs.core.host.ParticleIdentifierTest.anonymousKClassToParticleIdentifier.pid.1")
  }

  private class MyParticleImplementation : Particle {
    override val handles: HandleHolder
      get() = throw UnsupportedOperationException()
  }
}
