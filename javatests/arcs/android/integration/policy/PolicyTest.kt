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
import arcs.core.storage.database.DatabaseData
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
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

  @Test
  fun persistentHandlesWithEgress_StoresIngressRestrictedValues_neverDeleted() = runBlocking {
    env.addNewHostWith(
      ::IngressThing.toRegistration(),
      ::EgressAB.toRegistration()
    )

    val arc = env.startArc(PersistsEgressesPlan)

    val createHandleArgs = env.getCreateHandleArgs()
    // Ensure that the store contains the ingress-restricted schema (`Thing {b, c}`)
    val allStoreSchemas = createHandleArgs.map { it.storeSchema }.filterNotNull()
    assertThat(allStoreSchemas).doesNotContain(AbstractIngressThing.Thing.SCHEMA)
    assertThat(allStoreSchemas).contains(AbstractEgressAB.Thing.SCHEMA)

    env.waitForIdle(arc)

    val ingest = env.getParticle<IngressThing>(arc)
    val egressAB = env.getParticle<EgressAB>(arc)

    withTimeout(30000) {
      ingest.storeFinished.join()
      egressAB.handleRegistered.join()
    }
    // Data is egressed to the egress particle
    assertThat(egressAB.outputForTest).hasSize(6)

    // db test
    // TODO(alxr): use wait for entities util function before checking db

    val states = env.getStorageState(egressAB.handles.output, AbstractIngressThing.Thing.SCHEMA)

    var callbackExecuted = false
    states
      .filterIsInstance<DatabaseData.Entity>()
      .forEach { entity ->
        // Only fields "a" and "b" have data set in the raw entity.
        val setEntries = entity.rawEntity.singletons.entries.filter { it.value != null }
        assertThat(setEntries.map { it.key }.toSet()).isEqualTo(setOf("a", "b"))
        assertThat(entity.rawEntity.collections).isEmpty()
        callbackExecuted = true
    }

    assertThat(callbackExecuted).isTrue()

    env.stopArc(arc)
  }
}
