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
package arcs.android.integration.policy

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.integration.IntegrationEnvironment
import arcs.core.host.toRegistration
import arcs.core.storage.StorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import kotlin.time.hours
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@OptIn(ExperimentalCoroutinesApi::class, kotlin.time.ExperimentalTime::class)
@RunWith(AndroidJUnit4::class)
@Config(instrumentedPackages = ["arcs.jvm.util"]) // TODO: inject Time into DatabaseImpl
class PolicyTest {

  @get:Rule
  val log = LogRule()

  /** Note, a new IntegrationEnvironment is allocated for each test method. */
  @get:Rule
  val env = IntegrationEnvironment()

  /**
   * Scenario: A policy-compliant recipe with @persistent handles egresses data
   * and stores ingress-restricted values to disk that is never deleted.
   */
  @Test
  fun persistentHandlesWithEgress_StoresIngressRestrictedValues_neverDeleted() = runBlocking {
    env.addNewHostWith(
      ::IngressThing.toRegistration(),
      ::EgressAB.toRegistration()
    )

    val arc = env.startArc(PersistsEgressesPlan)

    // When the Arc is run...
    env.waitForIdle(arc)

    val ingest = env.getParticle<IngressThing>(arc)
    val egressAB = env.getParticle<EgressAB>(arc)

    withTimeout(30000) {
      ingest.storeFinished.join()
      egressAB.handleRegistered.join()
    }

    // Then data with fields Thing {a, b} will be egressed
    assertThat(egressAB.fetchThings()).hasSize(6)

    val startingKey = (egressAB.handles.output.getProxy().storageKey as ReferenceModeStorageKey)
      .storageKey

    // And only Thing {a, b} is written to storage
    assertStorageContains(startingKey, setOf("a", "b"))

    env.stopArc(arc)

    // And Thing {a, b} data persists after the arc is run
    assertStorageContains(startingKey, setOf("a", "b"))

    env.stopRuntime()

    // And Thing {a, b} data persists after runtime ends
    assertStorageContains(startingKey, setOf("a", "b"))
  }

  /**
   * Scenario: A policy-compliant recipe with @ttl handles egresses data and stores
   * ingress-restricted values to RAM that are deleted after the TTL expires and at the runtime’s
   * end.
   */
  @Test
  fun ttlHandlesWithEgress_StoresIngressRestrictedValues_deletedAtTtlTimeAndRuntimeEnd() =
    runBlocking {
      env.addNewHostWith(
        ::IngressThing.toRegistration(),
        ::EgressAB.toRegistration()
      )

      // When the Arc is run...
      val arc = env.startArc(TtlEgressesPlan)
      env.waitForIdle(arc)

      val ingest = env.getParticle<IngressThing>(arc)
      val egressAB = env.getParticle<EgressAB>(arc)

      withTimeout(30000) {
        ingest.storeFinished.join()
        egressAB.handleRegistered.join()
      }

      // Then data with fields Thing {a, b} will be egressed
      assertThat(egressAB.fetchThings()).hasSize(6)

      val startingKey = (egressAB.handles.output.getProxy().storageKey as ReferenceModeStorageKey)
        .storageKey

      // And only Thing {a, b} is written to storage (RAM)
      assertStorageContains(startingKey, setOf("a", "b"))

      // And the egress data with fields Thing {a, b} will be exfiltrated (filtered with no output
      //  read) after 2 hours have passed.
      env.advanceClock(3.hours)
      assertThat(egressAB.fetchThings()).isEmpty()

      // And the data is removed from storage after 2 hours have passed.
      env.triggerCleanupWork()
      assertThat(env.getDatabaseEntities(startingKey, AbstractIngressThing.Thing.SCHEMA)).isEmpty()

      // When new data is ingressed...
      ingest.writeThings()
      withTimeout(30000) {
        ingest.storeFinished.join()
      }
      env.stopArc(arc)

      // Then Thing {a, b} data persists after the arc is finished
      assertStorageContains(startingKey, setOf("a", "b"))

      env.stopRuntime()

      // And Thing {a, b} data will be deleted at Arcs' runtime end
      assertThat(env.getDatabaseEntities(startingKey, AbstractIngressThing.Thing.SCHEMA)).isEmpty()
    }

  /** Assert that all entities only contains values for the specified fields. */
  private suspend fun assertStorageContains(
    startingKey: StorageKey,
    singletons: Set<String> = emptySet(),
    collections: Set<String> = emptySet()
  ) {
    var callbackExecuted = false
    env.getDatabaseEntities(startingKey, AbstractIngressThing.Thing.SCHEMA)
      .forEach { entity ->
        val singletonSetEntries = entity.rawEntity.singletons.entries.filter { it.value != null }
        val collectionSetEntries = entity.rawEntity.collections.entries.filter {
          it.value.isNotEmpty()
        }
        assertThat(singletonSetEntries.map { it.key }.toSet()).isEqualTo(singletons)
        assertThat(collectionSetEntries.map { it.key }.toSet()).isEqualTo(collections)
        callbackExecuted = true
      }
    assertThat(callbackExecuted).isTrue()
  }
}
