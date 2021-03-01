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
package arcs.core.allocator

import arcs.core.data.Capabilities
import arcs.core.data.Capability
import arcs.core.data.Plan
import arcs.core.entity.ForeignReferenceCheckerImpl
import arcs.core.host.ArcHostContext
import arcs.core.host.ArcState
import arcs.core.host.HandleManagerFactory
import arcs.core.host.HandleManagerImpl
import arcs.core.host.HostRegistry
import arcs.core.host.PersonPlan
import arcs.core.host.ReadPerson
import arcs.core.host.ReadPerson2
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.host.TestingHost
import arcs.core.host.TestingJvmProdHost
import arcs.core.host.WritePerson
import arcs.core.host.WritePerson2
import arcs.core.storage.testutil.testStorageEndpointManager
import kotlin.coroutines.EmptyCoroutineContext
import arcs.core.host.toRegistration
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import arcs.core.host.ReadPerson_Person
import arcs.core.host.api.Particle
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.jvm.host.ExplicitHostRegistry
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth
import kotlinx.coroutines.runBlocking
import org.junit.Before

abstract class AllocatorTestFramework {
  protected val schedulerProvider = SimpleSchedulerProvider(Dispatchers.Default)
  protected lateinit var scope: CoroutineScope

  protected lateinit var allocator: Allocator
  protected lateinit var hostRegistry: HostRegistry
  protected lateinit var writePersonParticle: Plan.Particle
  protected lateinit var readPersonParticle: Plan.Particle
  protected lateinit var purePersonParticle: Plan.Particle

  protected val personSchema = ReadPerson_Person.SCHEMA

  protected lateinit var readingExternalHost: TestingHost
  protected lateinit var writingExternalHost: TestingHost
  protected lateinit var pureHost: TestingJvmProdHost

  protected class WritingHost : TestingHost(
    HandleManagerFactory(
      SimpleSchedulerProvider(EmptyCoroutineContext),
      testStorageEndpointManager(),
      platformTime = FakeTime()
    ),
    ::WritePerson.toRegistration(),
    ::WritePerson2.toRegistration()
  )

  protected class ReadingHost : TestingHost(
    HandleManagerFactory(
      SimpleSchedulerProvider(EmptyCoroutineContext),
      testStorageEndpointManager(),
      platformTime = FakeTime()
    ),
    ::ReadPerson.toRegistration(),
    ::ReadPerson2.toRegistration()
  )

  /** Return the [ArcHost] that contains [ReadPerson]. */
  open fun readingHost(): TestingHost = ReadingHost()

  /** Return the [ArcHost] that contains [WritePerson]. */
  open fun writingHost(): TestingHost = WritingHost()

  /** Return the [ArcHost] that contains all isolatable [Particle]s. */
  open fun pureHost() = TestingJvmProdHost(
    HandleManagerFactory(
      schedulerProvider,
      testStorageEndpointManager(),
      FakeTime()
    )
  )

  open val storageCapability = Capabilities(Capability.Shareable(true))

  open fun runAllocatorTest(
    testBody: suspend CoroutineScope.() -> Unit
  ) = runBlocking {
    testBody()
  }

  open suspend fun hostRegistry(): HostRegistry {
    val registry = ExplicitHostRegistry()
    registry.registerHost(readingExternalHost)
    registry.registerHost(writingExternalHost)
    registry.registerHost(pureHost)

    return registry
  }

  @Before
  open fun setUp() = runBlocking {
    RamDisk.clear()
    DriverAndKeyConfigurator.configure(null)

    readingExternalHost = readingHost()
    writingExternalHost = writingHost()
    pureHost = pureHost()

    hostRegistry = hostRegistry()
    scope = CoroutineScope(Dispatchers.Default)
    allocator = Allocator.create(
      hostRegistry,
      HandleManagerImpl(
        time = FakeTime(),
        scheduler = schedulerProvider("allocator"),
        storageEndpointManager = testStorageEndpointManager(),
        foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
      ),
      scope
    )

    readPersonParticle =
      requireNotNull(PersonPlan.particles.find { it.particleName == "ReadPerson" }) {
        "No ReadPerson particle in PersonPlan"
      }

    writePersonParticle =
      requireNotNull(PersonPlan.particles.find { it.particleName == "WritePerson" }) {
        "No WritePerson particle in PersonPlan"
      }

    purePersonParticle =
      requireNotNull(PersonPlan.particles.find { it.particleName == "PurePerson" }) {
        "No PurePerson particle in PersonPlan"
      }

    readingExternalHost.setup()
    pureHost.setup()
    writingExternalHost.setup()
    WritePerson.throws = false
  }

  protected suspend fun assertAllStatus(
    arc: Arc,
    arcState: ArcState
  ) {
    check(arc.partitions.isNotEmpty()) { "No partitions for ${arc.id}" }
    arc.partitions.forEach { partition ->
      val hostId = partition.arcHost
      val status = when {
        hostId.contains("${readingExternalHost.hashCode()}") ->
          readingExternalHost.lookupArcHostStatus(partition)
        hostId.contains("${pureHost.hashCode()}") ->
          pureHost.lookupArcHostStatus(partition)
        hostId.contains("${writingExternalHost.hashCode()}") ->
          writingExternalHost.lookupArcHostStatus(partition)
        else -> throw IllegalArgumentException("Unknown ${partition.arcHost}")
      }
      Truth.assertThat(status).isEqualTo(arcState)
    }
  }

  protected fun particleToContext(context: ArcHostContext, particle: Plan.Particle) =
    context.particles.first {
      it.planParticle.particleName == particle.particleName
    }
}
