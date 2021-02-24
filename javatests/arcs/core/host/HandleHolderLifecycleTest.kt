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

import arcs.core.data.EntityType
import arcs.core.data.Plan
import arcs.core.data.SingletonType
import arcs.core.entity.testutil.DummyEntity
import arcs.core.host.api.HandleHolder
import arcs.core.host.api.Particle
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.jvm.util.testutil.FakeTime
import arcs.sdk.Entity
import arcs.sdk.EntitySpec
import arcs.sdk.Handle
import arcs.sdk.HandleHolderBase
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
@Suppress("UNCHECKED_CAST")
class HandleHolderLifecycleTest : AbstractArcHostTestBase() {

  /** An [ArcHost] used to spy on or inject a custom [Particle] class for tests. */
  class ParticleSpyArcHost(
    handleManagerFactory: HandleManagerFactory,
    vararg particles: ParticleRegistration
  ) : TestHost(handleManagerFactory, false, *particles) {

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

  override fun createHost(
    schedulerProvider: SchedulerProvider,
    vararg particles: ParticleRegistration
  ): TestHost = ParticleSpyArcHost(
    HandleManagerFactory(
      schedulerProvider,
      testStorageEndpointManager(),
      platformTime = FakeTime()
    ),
    *particles
  )

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
      return handles.getValue(handleName)
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
    val schedulerProvider = SimpleSchedulerProvider(coroutineContext)
    val host = createHost(schedulerProvider, ::TestParticle.toRegistration()) as ParticleSpyArcHost
    val partition = Plan.Partition(
      "arcId", "arcHost",
      listOf(
        Plan.Particle(
          "TestParticle",
          "arcs.core.host.AbstractArcHostTestBase.TestParticle",
          emptyMap()
        )
      )
    )

    var callbackExecuted = false
    host.registerParticleTransform { particle ->
      callbackExecuted = true
      assertThat(particle.handles.isEmpty()).isTrue()
      particle
    }

    host.startArc(partition)
    assertThat(callbackExecuted).isTrue()
    host.waitForArcIdle("arcId")

    schedulerProvider.cancelAll()
  }

  @Test
  fun startArc_handleHolder_hasAllHandlesSet() = runBlocking {
    val schedulerProvider = SimpleSchedulerProvider(coroutineContext)
    val host = createHost(schedulerProvider, ::InOutParticle.toRegistration()) as ParticleSpyArcHost

    val handle1StorageKey = ReferenceModeStorageKey(
      backingKey = RamDiskStorageKey("backing"),
      storageKey = RamDiskStorageKey("container1")
    )

    val handle2StorageKey = ReferenceModeStorageKey(
      backingKey = RamDiskStorageKey("backing"),
      storageKey = RamDiskStorageKey("container2")
    )

    val hc1 = Plan.HandleConnection(
      Plan.Handle(
        handle1StorageKey,
        SingletonType(EntityType(DummyEntity.SCHEMA)),
        emptyList()
      ),
      HandleMode.Read,
      SingletonType(EntityType(DummyEntity.SCHEMA)),
      emptyList()
    )

    val hc2 = Plan.HandleConnection(
      Plan.Handle(
        handle2StorageKey,
        SingletonType(EntityType(DummyEntity.SCHEMA)),
        emptyList()
      ),
      HandleMode.Write,
      SingletonType(EntityType(DummyEntity.SCHEMA)),
      emptyList()
    )

    val partition = Plan.Partition(
      "arcId", "arcHost",
      listOf(
        Plan.Particle(
          "InOutParticle", "arcs.core.host.AbstractArcHostTestBase.InOutParticle",
          mapOf("input" to hc1, "output" to hc2)
        )
      )
    )

    var callbackExecuted = false
    var handleHolder: HandleHolder? = null
    host.registerParticleTransform { particle ->
      callbackExecuted = true
      handleHolder = particle.handles
      particle
    }

    host.startArc(partition)
    assertThat(host.lookupArcHostStatus(partition)).isEqualTo(ArcState.Running)
    assertThat(callbackExecuted).isTrue()

    host.waitForArcIdle("arcId")

    // Handles in handle holder are set
    assertThat(handleHolder?.isEmpty()).isFalse()
    assertThat(handleHolder?.getHandle("input")).isNotNull()
    assertThat(handleHolder?.getHandle("input")?.mode).isEqualTo(hc1.mode)
    assertThat(handleHolder?.getHandle("output")).isNotNull()
    assertThat(handleHolder?.getHandle("output")?.mode).isEqualTo(hc2.mode)

    schedulerProvider.cancelAll()
  }

  @Test
  fun stopArc_handleHolder_hasCallbacksUnregistered() = runBlocking {
    val schedulerProvider = SimpleSchedulerProvider(coroutineContext)
    val host = createHost(schedulerProvider, ::InOutParticle.toRegistration()) as ParticleSpyArcHost

    val handle1StorageKey = ReferenceModeStorageKey(
      backingKey = RamDiskStorageKey("backing"),
      storageKey = RamDiskStorageKey("container1")
    )

    val handle2StorageKey = ReferenceModeStorageKey(
      backingKey = RamDiskStorageKey("backing"),
      storageKey = RamDiskStorageKey("container2")
    )

    val hc1 = Plan.HandleConnection(
      Plan.Handle(
        handle1StorageKey,
        SingletonType(EntityType(DummyEntity.SCHEMA)),
        emptyList()
      ),
      HandleMode.Read,
      SingletonType(EntityType(DummyEntity.SCHEMA)),
      emptyList()
    )

    val hc2 = Plan.HandleConnection(
      Plan.Handle(
        handle2StorageKey,
        SingletonType(EntityType(DummyEntity.SCHEMA)),
        emptyList()
      ),
      HandleMode.Write,
      SingletonType(EntityType(DummyEntity.SCHEMA)),
      emptyList()
    )

    val partition = Plan.Partition(
      "arcId", "arcHost",
      listOf(
        Plan.Particle(
          "InOutParticle", "arcs.core.host.AbstractArcHostTestBase.InOutParticle",
          mapOf("input" to hc1, "output" to hc2)
        )
      )
    )

    var callbackExecuted = false
    var handleHolder: HandleHolderSpy? = null
    host.registerParticleTransform { particle ->
      callbackExecuted = true
      val newParticle = object : InOutParticle() {
        override val handles = HandleHolderSpy(particle.handles as HandleHolderBase)
      }
      handleHolder = newParticle.handles
      newParticle
    }

    host.startArc(partition)
    assertThat(host.lookupArcHostStatus(partition)).isEqualTo(ArcState.Running)
    assertThat(callbackExecuted).isTrue()

    host.waitForArcIdle("arcId")

    host.stopArc(partition)
    assertThat(handleHolder?.detachWasCalled).isTrue()

    schedulerProvider.cancelAll()
  }

  @Test
  fun stopArc_handleHolder_isEmpty() = runBlocking {
    val schedulerProvider = SimpleSchedulerProvider(coroutineContext)
    val host = createHost(schedulerProvider, ::InOutParticle.toRegistration()) as ParticleSpyArcHost

    val handle1StorageKey = ReferenceModeStorageKey(
      backingKey = RamDiskStorageKey("backing"),
      storageKey = RamDiskStorageKey("container1")
    )

    val handle2StorageKey = ReferenceModeStorageKey(
      backingKey = RamDiskStorageKey("backing"),
      storageKey = RamDiskStorageKey("container2")
    )

    val hc1 = Plan.HandleConnection(
      Plan.Handle(
        handle1StorageKey,
        SingletonType(EntityType(DummyEntity.SCHEMA)),
        emptyList()
      ),
      HandleMode.Read,
      SingletonType(EntityType(DummyEntity.SCHEMA)),
      emptyList()
    )

    val hc2 = Plan.HandleConnection(
      Plan.Handle(
        handle2StorageKey,
        SingletonType(EntityType(DummyEntity.SCHEMA)),
        emptyList()
      ),
      HandleMode.Write,
      SingletonType(EntityType(DummyEntity.SCHEMA)),
      emptyList()
    )

    val partition = Plan.Partition(
      "arcId", "arcHost",
      listOf(
        Plan.Particle(
          "InOutParticle", "arcs.core.host.AbstractArcHostTestBase.InOutParticle",
          mapOf("input" to hc1, "output" to hc2)
        )
      )
    )

    var callbackExecuted = false
    var handleHolder: HandleHolderSpy? = null
    host.registerParticleTransform { particle ->
      callbackExecuted = true
      val newParticle = object : InOutParticle() {
        override val handles = HandleHolderSpy(particle.handles as HandleHolderBase)
      }
      handleHolder = newParticle.handles
      newParticle
    }

    host.startArc(partition)
    assertThat(host.lookupArcHostStatus(partition)).isEqualTo(ArcState.Running)
    assertThat(callbackExecuted).isTrue()

    host.waitForArcIdle("arcId")

    host.stopArc(partition)
    assertThat(handleHolder?.resetWasCalled).isTrue()

    schedulerProvider.cancelAll()
  }
}
