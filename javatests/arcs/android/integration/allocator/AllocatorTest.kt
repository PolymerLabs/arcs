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
package arcs.android.integration.allocator

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.integration.IntegrationEnvironment
import arcs.core.host.MultiplePersonPlan
import arcs.core.host.NonRelevant
import arcs.core.host.PersonPlan
import arcs.core.host.PurePerson
import arcs.core.host.ReadPerson
import arcs.core.host.ReadPerson2
import arcs.core.host.WritePerson
import arcs.core.host.WritePerson2
import arcs.core.host.toRegistration
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@OptIn(ExperimentalCoroutinesApi::class, kotlin.time.ExperimentalTime::class)
@RunWith(AndroidJUnit4::class)
class AllocatorTest {

  @get:Rule
  val log = LogRule()

  /** Note, a new IntegrationEnvironment is allocated for each test method. */
  @get:Rule
  val env = IntegrationEnvironment()

  @Test
  fun allocator_withSingleHostAndMultipleParticles_canStartArc() = runBlocking {
    env.addNewHostWith(
      ::ReadPerson.toRegistration(),
      ::PurePerson.toRegistration(),
      ::WritePerson.toRegistration()
    )
    val arc = env.startArc(PersonPlan)
    val writeParticle = env.getParticle<WritePerson>(arc)
    val readParticle = env.getParticle<ReadPerson>(arc)

    writeParticle.await()
    assertThat(writeParticle.firstStartCalled).isTrue()
    assertThat(writeParticle.wrote).isTrue()

    readParticle.await()
    assertThat(readParticle.firstStartCalled).isTrue()
    assertThat(readParticle.name).isEqualTo("Hello John Wick")
  }

  @Test
  fun allocator_withThreeHostsContainingSingleParticle_canStart() = runBlocking {
    env.addNewHostWith(::ReadPerson.toRegistration())
    env.addNewHostWith(::PurePerson.toRegistration())
    env.addNewHostWith(::WritePerson.toRegistration())
    val arc = env.startArc(PersonPlan)
    val writeParticle = env.getParticle<WritePerson>(arc)
    val readParticle = env.getParticle<ReadPerson>(arc)

    writeParticle.await()
    assertThat(writeParticle.firstStartCalled).isTrue()
    assertThat(writeParticle.wrote).isTrue()

    readParticle.await()
    assertThat(readParticle.firstStartCalled).isTrue()
    assertThat(readParticle.name).isEqualTo("Hello John Wick")
  }

  @Test
  fun allocator_withThreeHostsAndTwoParticlesPerHost_canStart() = runBlocking {
    env.addNewHostWith(::ReadPerson.toRegistration(), ::ReadPerson2.toRegistration())
    env.addNewHostWith(::PurePerson.toRegistration())
    env.addNewHostWith(::WritePerson.toRegistration(), ::WritePerson2.toRegistration())
    val arc = env.startArc(MultiplePersonPlan)
    val writeParticle = env.getParticle<WritePerson>(arc)
    val readParticle = env.getParticle<ReadPerson>(arc)
    val writeParticle2 = env.getParticle<WritePerson>(arc)
    val readParticle2 = env.getParticle<ReadPerson>(arc)

    writeParticle.await()
    assertThat(writeParticle.firstStartCalled).isTrue()
    assertThat(writeParticle.wrote).isTrue()

    writeParticle2.await()
    assertThat(writeParticle.firstStartCalled).isTrue()
    assertThat(writeParticle.wrote).isTrue()

    readParticle.await()
    assertThat(readParticle.firstStartCalled).isTrue()
    assertThat(readParticle.name).isEqualTo("Hello John Wick")

    readParticle2.await()
    assertThat(readParticle.firstStartCalled).isTrue()
    assertThat(readParticle.name).isEqualTo("Hello John Wick")
  }

  @Test
  fun allocator_withNonRelevantParticle_canStartArcInTwoExternalHosts() = runBlocking {
    env.addNewHostWith(::ReadPerson.toRegistration(), ::NonRelevant.toRegistration())
    env.addNewHostWith(::PurePerson.toRegistration())
    env.addNewHostWith(::WritePerson.toRegistration())
    val arc = env.startArc(PersonPlan)
    val writeParticle = env.getParticle<WritePerson>(arc)
    val readParticle = env.getParticle<ReadPerson>(arc)

    writeParticle.await()
    assertThat(writeParticle.firstStartCalled).isTrue()
    assertThat(writeParticle.wrote).isTrue()

    readParticle.await()
    assertThat(readParticle.firstStartCalled).isTrue()
    assertThat(readParticle.name).isEqualTo("Hello John Wick")
  }

  @Test
  fun allocator_withNonRelevantHost_canStartArcInTwoExternalHosts() = runBlocking {
    env.addNewHostWith(::ReadPerson.toRegistration())
    env.addNewHostWith(::PurePerson.toRegistration())
    env.addNewHostWith(::WritePerson.toRegistration())
    env.addNewHostWith(::NonRelevant.toRegistration())
    val arc = env.startArc(PersonPlan)
    val writeParticle = env.getParticle<WritePerson>(arc)
    val readParticle = env.getParticle<ReadPerson>(arc)

    writeParticle.await()
    assertThat(writeParticle.firstStartCalled).isTrue()
    assertThat(writeParticle.wrote).isTrue()

    readParticle.await()
    assertThat(readParticle.firstStartCalled).isTrue()
    assertThat(readParticle.name).isEqualTo("Hello John Wick")
  }
}
