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
import arcs.core.data.RawEntity
import arcs.core.host.toRegistration
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@OptIn(ExperimentalCoroutinesApi::class, kotlin.time.ExperimentalTime::class)
@RunWith(AndroidJUnit4::class)
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

    ingest.storeFinished.join()
    egressAB.handleRegistered.join()

    // Then data with fiends Thing {a, b} will be egressed
    assertThat(egressAB.outputForTest).hasSize(6)

    val startingKey = (egressAB.handles.output.getProxy().storageKey as ReferenceModeStorageKey)
      .storageKey

    // And only Thing {a, b} is written to storage
    var callbackExecuted = false
    env.getDatabaseEntities(startingKey, AbstractIngressThing.Thing.SCHEMA)
      .forEach { entity ->
        assertRawEntityHasFields(entity.rawEntity, setOf("a", "b"))
        callbackExecuted = true
    }
    assertThat(callbackExecuted).isTrue()

    env.stopArc(arc)

    // And Thing {a, b} data persists after the arc is run
    callbackExecuted = false
    env.getDatabaseEntities(startingKey, AbstractIngressThing.Thing.SCHEMA)
      .forEach { entity ->
        assertRawEntityHasFields(entity.rawEntity, setOf("a", "b"))
        callbackExecuted = true
      }
    assertThat(callbackExecuted).isTrue()

    env.stopRuntime()

    // And Thing {a, b} data persists after runtime ends
    callbackExecuted = false
    env.getDatabaseEntities(startingKey, AbstractIngressThing.Thing.SCHEMA)
      .forEach { entity ->
        assertRawEntityHasFields(entity.rawEntity, setOf("a", "b"))
        callbackExecuted = true
      }
    assertThat(callbackExecuted).isTrue()
  }

  companion object {
    /** Assert that a [RawEntity] contains non-null / non-empty data for target fields. */
    fun assertRawEntityHasFields(
      rawEntity: RawEntity,
      singletons: Set<String> = emptySet(),
      collections: Set<String> = emptySet()
    ) {
      val singletonSetEntries = rawEntity.singletons.entries.filter { it.value != null }
      val collectionSetEntries = rawEntity.collections.entries.filter { it.value.isNotEmpty() }
      assertThat(singletonSetEntries.map { it.key }.toSet()).isEqualTo(singletons)
      assertThat(collectionSetEntries.map { it.key }.toSet()).isEqualTo(collections)
    }
  }
}
