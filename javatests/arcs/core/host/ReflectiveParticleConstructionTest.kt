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

import arcs.core.allocator.Allocator
import arcs.core.data.FieldType
import arcs.core.data.Plan
import arcs.core.entity.ForeignReferenceCheckerImpl
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.core.util.TaggedLog
import arcs.core.util.testutil.LogRule
import arcs.jvm.host.ExplicitHostRegistry
import arcs.jvm.util.JvmTime
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.TestCoroutineScope
import kotlinx.coroutines.withTimeout
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class ReflectiveParticleConstructionTest {
  @get:Rule
  val log = LogRule()

  private val testScope = TestCoroutineScope()

  class JvmProdHost(
    handleManagerFactory: HandleManagerFactory,
    vararg particles: ParticleRegistration
  ) : AbstractArcHost(
    coroutineContext = Dispatchers.Default,
    handleManagerFactory = handleManagerFactory,
    arcHostContextSerializer = StoreBasedArcHostContextSerializer(
      Dispatchers.Default,
      handleManagerFactory
    ),
    initialParticles = particles
  ),
    ProdHost

  class AssertingReflectiveParticle(spec: Plan.Particle?) : TestReflectiveParticle(spec) {
    private val log = TaggedLog { "AssertingReflectiveParticle" }

    override fun onStart() {
      log.info { "onStart()" }
      handles.data
      assertThat(schema.name?.name).isEqualTo("Thing")
      assertThat(schema.fields.singletons).containsExactly("name", FieldType.Text)
      assertThat(schema.fields.collections).isEmpty()
      started.complete()
    }

    companion object {
      val started = Job()
    }
  }

  @Test
  fun host_canCreateReflectiveParticle() = runBlocking {
    RamDisk.clear()
    DriverAndKeyConfigurator.configure(null)

    val hostRegistry = ExplicitHostRegistry()
    val schedulerProvider = SimpleSchedulerProvider(Dispatchers.Default)
    val handleManagerFactory = HandleManagerFactory(
      schedulerProvider = schedulerProvider,
      storageEndpointManager = testStorageEndpointManager(),
      platformTime = JvmTime
    )

    val fakeRegistration = Pair(
      TestReflectiveParticle::class.toParticleIdentifier(),
      ::AssertingReflectiveParticle.toRegistration().second
    )

    hostRegistry.registerHost(JvmProdHost(handleManagerFactory, fakeRegistration))

    val allocator = Allocator.create(
      hostRegistry,
      HandleManagerImpl(
        time = FakeTime(),
        scheduler = schedulerProvider("allocator"),
        storageEndpointManager = testStorageEndpointManager(),
        foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
      ),
      testScope
    )

    val arcId = allocator.startArcForPlan(TestReflectiveRecipePlan).waitForStart().id
    // Ensure that it's at least started up.
    withTimeout(1500) { AssertingReflectiveParticle.started.join() }
    allocator.stopArc(arcId)
  }
}
