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
package arcs.core.host

import arcs.core.allocator.Allocator
import arcs.core.data.Plan
import arcs.core.entity.ForeignReferenceCheckerImpl
import arcs.core.host.api.HandleHolder
import arcs.core.host.api.Particle
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.core.util.Scheduler
import arcs.jvm.host.ExplicitHostRegistry
import arcs.jvm.util.testutil.FakeTime
import arcs.sdk.Entity
import arcs.sdk.EntitySpec
import arcs.sdk.Handle
import arcs.sdk.HandleHolderBase
import com.google.common.truth.Truth.assertThat
import kotlin.coroutines.EmptyCoroutineContext
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.TestCoroutineScope
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class HandleHolderLifecycleTest {

  /** An [ArcHost] used to spy on and inject a custom [Particle] class for tests. */
  class ParticleSpyArcHost(
    handleManagerFactory: HandleManagerFactory,
    vararg particles: ParticleRegistration
  ) : TestingHost(handleManagerFactory, *particles) {

    private var particleTransform: ((Particle) -> Particle)? = null

    fun registerParticleTransform(block: (Particle) -> Particle) {
      particleTransform = block
    }

    override suspend fun instantiateParticle(
      identifier: ParticleIdentifier,
      spec: Plan.Particle?
    ): Particle {
      val currentParticle = super.instantiateParticle(identifier, spec)
      return particleTransform?.let { cb -> cb(currentParticle) } ?: currentParticle
    }
  }

  private lateinit var schedulerProvider: SchedulerProvider
  private lateinit var scheduler: Scheduler
  private lateinit var handleManagerFactory: HandleManagerFactory

  private val testScope = TestCoroutineScope()

  @Before
  fun setUp() = runBlocking {
    RamDisk.clear()
    DriverAndKeyConfigurator.configure(null)
    schedulerProvider = SimpleSchedulerProvider(EmptyCoroutineContext)
    scheduler = schedulerProvider("test")
    handleManagerFactory = HandleManagerFactory(
      schedulerProvider,
      testStorageEndpointManager(),
      platformTime = FakeTime()
    )
  }

  @After
  fun tearDown(): Unit = runBlocking {
    try {
      scheduler.waitForIdle()
      handleManagerFactory.cancel()
    } finally {
      schedulerProvider.cancelAll()
    }
  }

  fun setupHost(host: TestingHost): Allocator = runBlocking {
    val hostRegistry = ExplicitHostRegistry().also { it.registerHost(host) }
    val handleManagerImpl = HandleManagerImpl(
      time = FakeTime(),
      scheduler = scheduler,
      storageEndpointManager = testStorageEndpointManager(),
      foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
    )
    val allocator = Allocator.create(hostRegistry, handleManagerImpl, testScope)
    host.setup()

    allocator
  }

  fun createHost(
    schedulerProvider: SchedulerProvider,
    vararg particles: ParticleRegistration
  ) = ParticleSpyArcHost(
    HandleManagerFactory(
      schedulerProvider,
      testStorageEndpointManager(),
      platformTime = FakeTime()
    ),
    *particles
  )

  /** A fake [Particle] that allows one to inject a [HandleHolderSpy] for tests. */
  @Suppress("UNCHECKED_CAST")
  class ParticleSpy(val parent: Particle) : Particle {
    override val handles = HandleHolderSpy(parent.handles as HandleHolderBase)
  }

  /** A [HandleHolder] with relaxed constraints and method flags used for tests. */
  class HandleHolderSpy(val parent: HandleHolderBase) : HandleHolderBase("Test", emptyMap()) {

    var detachWasCalled = false
    var resetWasCalled = false

    init {
      parent.handles.entries.forEach { (name, handle) -> this.setHandle(name, handle) }
    }

    override fun getEntitySpecs(handleName: String): Set<EntitySpec<out Entity>> {
      return parent.getEntitySpecs(handleName)
    }

    override fun getHandle(handleName: String): Handle {
      return handles[handleName] ?: handles.values.first()
    }

    override fun setHandle(handleName: String, handle: Handle) {
      handles[handleName] = handle
    }

    override fun detach() {
      super.detach()
      detachWasCalled = true
    }

    override fun reset() {
      super.reset()
      resetWasCalled = true
    }
  }

  @Test
  fun startArc_handleHolder_startsOutEmpty() = runBlocking {
    val host = createHost(schedulerProvider, ::SingleReadHandleParticle.toRegistration())
    val allocator = setupHost(host)

    var callbackExecuted = false
    host.registerParticleTransform { particle ->
      callbackExecuted = true
      // Assert that the particle starts out empty.
      assertThat(particle.handles.isEmpty()).isTrue()
      particle
    }

    // Calls ArcHost.startArc()
    allocator.startArcForPlan(SingleReadHandleTestPlan).waitForStart()

    assertThat(callbackExecuted).isTrue()
  }

  @Test
  fun startArc_handleHolder_hasAllHandlesSet() = runBlocking {
    val host = createHost(schedulerProvider, ::MultiHandleParticle.toRegistration())
    val allocator = setupHost(host)

    var callbackExecuted = false
    var handleHolder: HandleHolder? = null
    host.registerParticleTransform { particle ->
      callbackExecuted = true
      handleHolder = particle.handles
      particle
    }

    // Calls ArcHost.startArc()
    allocator.startArcForPlan(MultiHandleTestPlan).waitForStart()
    assertThat(callbackExecuted).isTrue()

    // Handles in handle holder are set
    assertThat(handleHolder?.isEmpty()).isFalse()
    assertThat(handleHolder?.getHandle("data")).isNotNull()
    assertThat(handleHolder?.getHandle("data")?.mode).isEqualTo(HandleMode.Read)
    assertThat(handleHolder?.getHandle("list")).isNotNull()
    assertThat(handleHolder?.getHandle("list")?.mode).isEqualTo(HandleMode.ReadWrite)
    assertThat(handleHolder?.getHandle("result")).isNotNull()
    assertThat(handleHolder?.getHandle("result")?.mode).isEqualTo(HandleMode.Write)
    assertThat(handleHolder?.getHandle("config")).isNotNull()
    assertThat(handleHolder?.getHandle("config")?.mode).isEqualTo(HandleMode.Read)
  }

  @Test
  fun stopArc_handleHolder_hasCallbacksUnregistered() = runBlocking {
    val host = createHost(schedulerProvider, ::MultiHandleParticle.toRegistration())
    val allocator = setupHost(host)

    var callbackExecuted = false
    var handleHolder: HandleHolderSpy? = null
    host.registerParticleTransform { particle ->
      callbackExecuted = true
      val newParticle = ParticleSpy(particle)
      handleHolder = newParticle.handles
      newParticle
    }

    // Calls ArcHost.startArc()
    val arc = allocator.startArcForPlan(MultiHandleTestPlan).waitForStart()
    assertThat(callbackExecuted).isTrue()

    // Calls ArcHost.stopArc()
    arc.stop()
    arc.waitForStop()

    assertThat(handleHolder?.detachWasCalled).isTrue()
  }

  @Test
  fun stopArc_handleHolder_isEmpty() = runBlocking {
    val host = createHost(schedulerProvider, ::MultiHandleParticle.toRegistration())
    val allocator = setupHost(host)

    var callbackExecuted = false
    var handleHolder: HandleHolderSpy? = null
    host.registerParticleTransform { particle ->
      callbackExecuted = true
      val newParticle = ParticleSpy(particle)
      handleHolder = newParticle.handles
      newParticle
    }

    // Calls ArcHost.startArc()
    val arc = allocator.startArcForPlan(MultiHandleTestPlan).waitForStart()
    assertThat(callbackExecuted).isTrue()

    // Calls ArcHost.stopArc()
    arc.stop()
    arc.waitForStop()

    assertThat(handleHolder?.resetWasCalled).isTrue()
  }
}
