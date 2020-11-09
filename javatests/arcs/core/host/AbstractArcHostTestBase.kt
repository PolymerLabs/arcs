package arcs.core.host

import arcs.core.data.Annotation
import arcs.core.data.Capability.Ttl
import arcs.core.data.EntityType
import arcs.core.data.Plan
import arcs.core.data.RawEntity.Companion.UNINITIALIZED_TIMESTAMP
import arcs.core.data.SingletonType
import arcs.core.entity.DummyEntity
import arcs.core.entity.EntityBase
import arcs.core.entity.EntityBaseSpec
import arcs.core.entity.HandleSpec
import arcs.core.entity.ReadSingletonHandle
import arcs.core.entity.ReadWriteSingletonHandle
import arcs.core.entity.RestrictedDummyEntity
import arcs.core.entity.WriteSingletonHandle
import arcs.core.storage.StorageKey
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.core.testutil.handles.dispatchFetch
import arcs.core.testutil.handles.dispatchStore
import arcs.jvm.util.testutil.FakeTime
import arcs.sdk.BaseParticle
import arcs.sdk.HandleHolderBase
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
abstract class AbstractArcHostTestBase {

  class TestParticle : BaseParticle() {
    override val handles = HandleHolderBase(
      "TestParticle",
      mapOf("foo" to setOf(EntityBaseSpec(DummyEntity.SCHEMA)))
    )

    override fun onFirstStart() {
      if (failAtStart) throw IllegalStateException("boom")
    }

    companion object {
      var failAtStart = false
    }
  }

  class InOutParticle : BaseParticle() {
    override val handles = HandleHolderBase(
      "InOutParticle",
      mapOf(
        "input" to setOf(DummyEntity),
        "output" to setOf(DummyEntity)
      )
    )

    @Suppress("UNCHECKED_CAST")
    val output: WriteSingletonHandle<DummyEntity>
      get() = handles.getHandle("output") as WriteSingletonHandle<DummyEntity>

    @Suppress("UNCHECKED_CAST")
    val input: ReadSingletonHandle<DummyEntity>
      get() = handles.getHandle("input") as ReadSingletonHandle<DummyEntity>

    override fun onUpdate() {
      val result = requireNotNull(input.fetch())
      if (waitForSignal) {
        runBlocking() {
          while (waitForSignal) {
            delay(100)
          }
        }
      }
      output.store(result)
    }

    companion object {
      var waitForSignal = false
    }
  }

  abstract class TestHost(
    schedulerProvider: SchedulerProvider,
    vararg particles: ParticleRegistration
  ) : AbstractArcHost(
    auxiliaryScope = CoroutineScope(Dispatchers.Default),
    arcSerializationScope = CoroutineScope(Dispatchers.Default),
    schedulerProvider = schedulerProvider,
    storageEndpointManager = testStorageEndpointManager(),
    initialParticles = *particles
  ) {
    override val platformTime = FakeTime()

    @Suppress("UNCHECKED_CAST")
    suspend fun getFooHandle(): ReadWriteSingletonHandle<DummyEntity> {
      val p = getArcHostContext("arcId")!!.particles.first {
        it.planParticle.particleName == "Foobar"
      }.particle as TestParticle
      return p.handles.getHandle("foo") as ReadWriteSingletonHandle<DummyEntity>
    }

    @Suppress("UNCHECKED_CAST")
    suspend fun makeWriteHandle(
      arcId: String,
      key: StorageKey
    ): WriteSingletonHandle<DummyEntity> =
      makeHandle(arcId, key, HandleMode.Write) as WriteSingletonHandle<DummyEntity>

    @Suppress("UNCHECKED_CAST")
    suspend fun makeReadHandle(
      arcId: String,
      key: StorageKey
    ): ReadSingletonHandle<DummyEntity> =
      makeHandle(arcId, key, HandleMode.Read) as ReadSingletonHandle<DummyEntity>

    private suspend fun makeHandle(arcId: String, key: StorageKey, mode: HandleMode) =
      entityHandleManager(arcId).createHandle(
        HandleSpec(
          "special_handle",
          mode,
          SingletonType(EntityType(DummyEntity.SCHEMA)),
          DummyEntity
        ),
        key,
        Ttl.Infinite(),
        "special_particle",
        true,
        DummyEntity.SCHEMA
      )
  }

  open abstract fun createHost(
    schedulerProvider: SchedulerProvider,
    vararg particles: ParticleRegistration
  ): TestHost

  @Before
  fun setUp() = runBlocking {
    RamDisk.clear()
    DriverAndKeyConfigurator.configure(null)
    TestParticle.failAtStart = false
    InOutParticle.waitForSignal = false
  }

  @Test
  fun emptyPartitionIsIdle() = runBlocking {
    val schedulerProvider = SimpleSchedulerProvider(coroutineContext)
    val host = createHost(schedulerProvider)

    val partition = Plan.Partition("arcId", "arcHost", listOf())
    host.startArc(partition)
    assertThat(host.lookupArcHostStatus(partition)).isEqualTo(ArcState.Running)
    host.waitForArcIdle("arcId")

    schedulerProvider.cancelAll()
  }

  @Test
  fun aParticle_withNoWork_isIdle() = runBlocking {
    val schedulerProvider = SimpleSchedulerProvider(coroutineContext)
    val host = createHost(schedulerProvider, ::TestParticle.toRegistration())

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
    host.startArc(partition)
    assertThat(host.lookupArcHostStatus(partition)).isEqualTo(ArcState.Running)
    host.waitForArcIdle("arcId")

    schedulerProvider.cancelAll()
  }

  @Test
  fun aParticle_isIdle_AfterDoingStuff() = runBlocking {
    val schedulerProvider = SimpleSchedulerProvider(coroutineContext)
    val host = createHost(schedulerProvider, ::InOutParticle.toRegistration())

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
    host.startArc(partition)
    assertThat(host.lookupArcHostStatus(partition)).isEqualTo(ArcState.Running)

    val writeHandle = host.makeWriteHandle("arcId", handle1StorageKey)
    val readHandle = host.makeReadHandle("acrdId", handle2StorageKey)

    val entity = DummyEntity().apply {
      text = "Watson"
      num = 42.0
      bool = true
    }

    withContext(writeHandle.dispatcher) { writeHandle.store(entity) }
    host.waitForArcIdle("arcId")
    assertThat(readHandle.dispatchFetch()).isEqualTo(entity)

    schedulerProvider.cancelAll()
  }

  @Test
  fun waitForIdle_waitsForAChain_ofParticles() = runBlocking {
    val schedulerProvider = SimpleSchedulerProvider(coroutineContext)
    val host = createHost(schedulerProvider, ::InOutParticle.toRegistration())

    val storageKeys = (0 until PARTICLE_CHAIN_LENGTH).toList().map {
      ReferenceModeStorageKey(
        backingKey = RamDiskStorageKey("backing"),
        storageKey = RamDiskStorageKey("container$it")
      )
    }

    val handles = storageKeys.map {
      Plan.Handle(it, SingletonType(EntityType(DummyEntity.SCHEMA)), emptyList())
    }

    val particles = (0 until PARTICLE_CHAIN_LENGTH - 1).toList().map {
      Plan.Particle(
        "InOutParticle", "arcs.core.host.AbstractArcHostTestBase.InOutParticle",
        mapOf(
          "input" to Plan.HandleConnection(
            handles[it],
            HandleMode.Read,
            SingletonType(EntityType(DummyEntity.SCHEMA)),
            emptyList()
          ),
          "output" to Plan.HandleConnection(
            handles[it + 1],
            HandleMode.Write,
            SingletonType(EntityType(DummyEntity.SCHEMA)),
            emptyList()
          )
        )
      )
    }

    val partition = Plan.Partition("arcId", "arcHost", particles)

    val writeHandle = host.makeWriteHandle("arcId", storageKeys[0])
    val readHandle = host.makeReadHandle("arcId", storageKeys[PARTICLE_CHAIN_LENGTH - 1])

    host.startArc(partition)
    assertThat(host.lookupArcHostStatus(partition)).isEqualTo(ArcState.Running)

    val entity = DummyEntity().apply {
      text = "Watson"
      num = 42.0
      bool = true
    }

    withContext(writeHandle.dispatcher) { writeHandle.store(entity) }

    // NOTE to flakiness hunters: this is *probably* safe to assume, because there's
    // a long chain of particles and a bunch of mechanisms that need to kick in before
    // the readHandle gets populated with data. However, this is *technically* a race
    // because all that happens on a different context. So if there's flakiness, maybe
    // suspect this next line? Talk to shanestephens@ for more context.
    assertThat(readHandle.dispatchFetch()).isNull()

    host.waitForArcIdle("arcId")
    assertThat(readHandle.dispatchFetch()).isEqualTo(entity)

    schedulerProvider.cancelAll()
  }

  @Test
  fun waitForIdle_canBeCancelled() = runBlocking {
    InOutParticle.waitForSignal = true

    val schedulerProvider = SimpleSchedulerProvider(coroutineContext)
    val host = createHost(schedulerProvider, ::InOutParticle.toRegistration())

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
    host.startArc(partition)
    assertThat(host.lookupArcHostStatus(partition)).isEqualTo(ArcState.Running)

    val writeHandle = host.makeWriteHandle("arcId", handle1StorageKey)
    val readHandle = host.makeReadHandle("acrdId", handle2StorageKey)

    val entity = DummyEntity().apply {
      text = "Watson"
      num = 42.0
      bool = true
    }

    withContext(writeHandle.dispatcher) { writeHandle.store(entity) }

    withTimeoutOrNull(500) {
      host.waitForArcIdle("arcId")
    }
    assertThat(readHandle.dispatchFetch()).isNull()
    InOutParticle.waitForSignal = false
    host.waitForArcIdle("arcId")
    assertThat(readHandle.dispatchFetch()).isEqualTo(entity)

    schedulerProvider.cancelAll()
  }

  @Test
  fun pause_Unpause() = runBlocking {
    val schedulerProvider = SimpleSchedulerProvider(coroutineContext)
    val host = createHost(schedulerProvider)
    val partition = Plan.Partition("arcId", "arcHost", listOf())
    val partition2 = Plan.Partition("arcId2", "arcHost", listOf())
    val partition3 = Plan.Partition("arcId3", "arcHost", listOf())
    host.startArc(partition)
    assertThat(host.lookupArcHostStatus(partition)).isEqualTo(ArcState.Running)

    host.pause()

    assertThat(host.lookupArcHostStatus(partition)).isEqualTo(ArcState.Stopped)
    // Start while in pause, should only start after unpause().
    host.startArc(partition2)
    assertThat(host.lookupArcHostStatus(partition2)).isEqualTo(ArcState.NeverStarted)
    // Resurrect while in pause, should only start after unpause().
    host.onResurrected("arcId3", listOf())
    assertThat(host.lookupArcHostStatus(partition3)).isEqualTo(ArcState.NeverStarted)

    host.unpause()

    assertThat(host.lookupArcHostStatus(partition)).isEqualTo(ArcState.Running)
    assertThat(host.lookupArcHostStatus(partition2)).isEqualTo(ArcState.Running)
    assertThat(host.lookupArcHostStatus(partition3)).isEqualTo(ArcState.Running)

    schedulerProvider.cancelAll()
  }

  // Regression test for b/152713120.
  @Test
  fun ttlUsed() = runBlocking {
    val schedulerProvider = SimpleSchedulerProvider(coroutineContext)
    val host = createHost(schedulerProvider, ::TestParticle.toRegistration())
    val handleStorageKey = ReferenceModeStorageKey(
      backingKey = RamDiskStorageKey("backing"),
      storageKey = RamDiskStorageKey("container")
    )

    val handleConnection = Plan.HandleConnection(
      Plan.Handle(
        handleStorageKey,
        SingletonType(EntityType(DummyEntity.SCHEMA)),
        emptyList()
      ),
      HandleMode.ReadWrite,
      SingletonType(EntityType(DummyEntity.SCHEMA)),
      listOf(Annotation.createTtl("2minutes"))
    )
    val particle = Plan.Particle(
      "Foobar",
      "arcs.core.host.AbstractArcHostTestBase.TestParticle",
      mapOf("foo" to handleConnection)
    )
    val partition = Plan.Partition("arcId", "arcHost", listOf(particle))
    host.startArc(partition)

    // Verify that the created handle use the TTL config to set an expiry time.
    val entity = DummyEntity()
    host.getFooHandle().dispatchStore(entity)
    // Should expire in 2 minutes.
    val expectedExpiry = 2 * 60 * 1000 + FakeTime().currentTimeMillis
    assertThat(entity.expirationTimestamp).isEqualTo(expectedExpiry)

    schedulerProvider.cancelAll()
  }

  @Suppress("UNCHECKED_CAST")
  @Test
  fun storeRestrictedHandleSchema() = runBlocking {
    val schedulerProvider = SimpleSchedulerProvider(coroutineContext)
    val host = createHost(schedulerProvider, ::TestParticle.toRegistration())
    val handleStorageKey = ReferenceModeStorageKey(
      backingKey = RamDiskStorageKey("backing"),
      storageKey = RamDiskStorageKey("container")
    )

    val handleConnection = Plan.HandleConnection(
      Plan.Handle(
        handleStorageKey,
        SingletonType(EntityType(RestrictedDummyEntity.SCHEMA)),
        emptyList()
      ),
      HandleMode.ReadWrite,
      SingletonType(EntityType(DummyEntity.SCHEMA)),
      listOf(Annotation.createTtl("2minutes"))
    )
    val particle = Plan.Particle(
      "Foobar",
      "arcs.core.host.AbstractArcHostTestBase.TestParticle",
      mapOf("foo" to handleConnection)
    )
    val partition = Plan.Partition("arcId", "arcHost", listOf(particle))
    host.startArc(partition)

    val entity = DummyEntity().apply {
      text = "Watson"
      num = 42.0
      bool = true
    }
    host.getFooHandle().dispatchStore(entity)

    val thing = (host.getFooHandle() as ReadWriteSingletonHandle<EntityBase>).dispatchFetch()

    // Monkey patch the entityId
    var storedEntity = EntityBase(
      "EntityBase",
      DummyEntity.SCHEMA,
      thing?.entityId,
      thing?.creationTimestamp ?: UNINITIALIZED_TIMESTAMP,
      thing?.expirationTimestamp ?: UNINITIALIZED_TIMESTAMP
    )
    storedEntity.setSingletonValue("text", "Watson")

    assertThat(thing).isEqualTo(storedEntity)
    schedulerProvider.cancelAll()
  }

  companion object {
    val PARTICLE_CHAIN_LENGTH = 30
  }
}
