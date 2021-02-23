package arcs.core.host

import arcs.core.data.Annotation
import arcs.core.data.Capabilities
import arcs.core.data.Capability
import arcs.core.data.CollectionType
import arcs.core.data.DefaultSchemaSerializer
import arcs.core.data.EntitySchemaProviderType
import arcs.core.data.EntityType
import arcs.core.data.Plan
import arcs.core.data.SingletonType
import arcs.core.entity.ForeignReferenceCheckerImpl
import arcs.core.entity.testutil.FixtureEntity
import arcs.core.storage.CapabilitiesResolver
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.testutil.DummyStorageKey
import arcs.core.storage.testutil.DummyStorageKeyManager
import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.core.type.Tag
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import java.util.Random
import java.util.concurrent.Executors
import kotlin.test.assertFailsWith
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@Suppress("UNCHECKED_CAST")
@OptIn(ExperimentalCoroutinesApi::class)
class ArcHostContextParticleTest {
  private lateinit var schedulerProvider: SimpleSchedulerProvider
  private lateinit var random: Random
  private lateinit var particles: MutableList<ArcHostContextParticle>

  @Before
  fun setUp() = runBlocking {
    schedulerProvider = SimpleSchedulerProvider(
      Executors.newSingleThreadExecutor().asCoroutineDispatcher()
    )
    random = Random(System.currentTimeMillis())
    particles = mutableListOf()
  }

  @After
  fun tearDown() = runBlocking {
    schedulerProvider.cancelAll()
    CapabilitiesResolver.reset()
    particles.forEach { it.close() }
    particles.clear()
  }

  private suspend fun createParticleWithHandles(
    arcId: String = "defaultArcId",
    hostId: String = "defaultHostId_${random.nextInt(1000)}"
  ): ArcHostContextParticle {
    return createParticle(arcId, hostId, shouldSetHandles = true)
  }

  private suspend fun createParticle(
    arcId: String = "defaultArcId",
    hostId: String = "defaultHostId",
    shouldSetHandles: Boolean = false
  ): ArcHostContextParticle {
    val handleManager = HandleManagerImpl(
      arcId = arcId,
      hostId = hostId,
      time = FakeTime(),
      scheduler = schedulerProvider("test"),
      storageEndpointManager = testStorageEndpointManager(),
      foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
    )
    val particle = ArcHostContextParticle(
      hostId,
      handleManager,
      DummyStorageKeyManager(),
      DefaultSchemaSerializer()
    )
    if (shouldSetHandles) {
      particle.apply {
        val partition = createArcHostContextPersistencePlan(
          Capabilities(),
          ARC_ID
        )
        partition.particles[0].handles.forEach { handleSpec ->
          createHandle(
            handleManager,
            handleSpec.key,
            handleSpec.value,
            handles,
            this.toString(),
            true,
            (handleSpec.value.handle.type as? EntitySchemaProviderType)?.entitySchema
          )
        }
      }
    }
    particles.add(particle)
    return particle
  }

  private fun verifyEqual(context1: ArcHostContext?, context2: ArcHostContext?) {
    assertThat(requireNotNull(context1).arcId).isEqualTo(requireNotNull(context2).arcId)
    assertThat(context1.arcState).isEqualTo(context2.arcState)
    assertThat(context1.particles.size).isEqualTo(context2.particles.size)
    context1.particles.forEachIndexed { index, particle ->
      val planParticle1 = particle.planParticle
      val planParticle2 = context2.particles[index].planParticle
      assertThat(planParticle1.particleName).isEqualTo(planParticle2.particleName)
      assertThat(planParticle1.location).isEqualTo(planParticle2.location)
      assertThat(planParticle1.handles.size).isEqualTo(planParticle2.handles.size)
      planParticle1.handles.forEach { name, connection1 ->
        val connection2 = planParticle2.handles[name]!!
        // TODO(b/179920198): uncomment when serialization supports EntityRef field annotation.
        // assertThat(handle.type).isEqualTo(connection2.type)
        assertThat(connection1.type.tag).isEqualTo(connection2.type.tag)
        assertThat(connection1.mode).isEqualTo(connection2.mode)
        assertThat(connection1.handle.storageKey).isEqualTo(connection2.storageKey)
      }
      assertThat(particle.particleState).isEqualTo(context2.particles[index].particleState)
    }
  }

  @Test
  fun writeArcHostContext_handlesNotReady_throws() = runBlocking {
    val particle = createParticle()
    val e = assertFailsWith<IllegalStateException> {
      particle.writeArcHostContext(ArcHostContext(ARC_ID))
    }
    assertThat(e).hasMessageThat().isEqualTo(
      "No dispatcher available for a HandleHolder with no handles."
    )
  }

  @Test
  fun readArcHostContext_handlesNotReady_throws() = runBlocking {
    val particle = createParticle()
    val e = assertFailsWith<IllegalStateException> {
      particle.readArcHostContext(ArcHostContext(ARC_ID))
    }
    assertThat(e).hasMessageThat().isEqualTo(
      "No dispatcher available for a HandleHolder with no handles."
    )
  }

  @Test
  fun writeArcHostContext_writeReadRoundTrip() = runBlocking {
    DriverAndKeyConfigurator.configureKeyParsersAndFactories()
    val particle = createParticleWithHandles()
    val type = EntityType(FixtureEntity.SCHEMA)
    val context = ArcHostContext(
      ARC_ID,
      listOf<ParticleContext>(
        ParticleContext(
          Plan.Particle(
            particleName = "testParticle",
            location = "foo",
            handles = mapOf(
              "testHandle" to Plan.HandleConnection(
                Plan.Handle(DummyStorageKey("bar"), type, emptyList()),
                HandleMode.Write,
                type,
                emptyList()
              ),
              "testHandleWithTtl" to Plan.HandleConnection(
                Plan.Handle(DummyStorageKey("bar"), type, emptyList()),
                HandleMode.Write,
                type,
                listOf(Annotation.createTtl("2hours"))
              )
            )
          ),
          ParticleState.FirstStart
        )
      ),
      ArcState.NeverStarted
    )
    particle.writeArcHostContext(context)
    verifyEqual(particle.readArcHostContext(ArcHostContext(ARC_ID)), context)
  }

  @Test
  fun writeArcHostContext_twoConsecutiveWrites_overridesOriginalValue() = runBlocking {
    DriverAndKeyConfigurator.configureKeyParsersAndFactories()
    val particle = createParticleWithHandles()
    val context = ArcHostContext(arcId = ARC_ID, initialArcState = ArcState.NeverStarted)
    particle.writeArcHostContext(context)
    verifyEqual(particle.readArcHostContext(ArcHostContext(ARC_ID)), context)

    val newContext = ArcHostContext(arcId = ARC_ID, initialArcState = ArcState.Running)
    particle.writeArcHostContext(newContext)
    verifyEqual(particle.readArcHostContext(ArcHostContext(ARC_ID)), newContext)
  }

  @Test
  fun writeArcHostContext_writeTwoContexts_bothCanBeRead() = runBlocking {
    DriverAndKeyConfigurator.configureKeyParsersAndFactories()
    val arcId1 = "$ARC_ID-1"
    val arcId2 = "$ARC_ID-2"
    val particle1 = createParticleWithHandles(arcId1)
    val particle2 = createParticleWithHandles(arcId2)
    val context1 = ArcHostContext(arcId1, initialArcState = ArcState.NeverStarted)
    val context2 = ArcHostContext(arcId2, initialArcState = ArcState.Running)

    particle1.writeArcHostContext(context1)
    particle2.writeArcHostContext(context2)

    verifyEqual(particle1.readArcHostContext(ArcHostContext(arcId1)), context1)
    verifyEqual(particle2.readArcHostContext(ArcHostContext(arcId2)), context2)
  }

  @Test
  fun readArcHostContext_nonexistent_returnsNull() = runBlocking {
    DriverAndKeyConfigurator.configureKeyParsersAndFactories()
    val particle = createParticleWithHandles(arcId = ARC_ID)
    assertThat(particle.readArcHostContext(ArcHostContext(ARC_ID))).isNull()
  }

  @Test
  fun fromTag_illegalTag_throws() = runBlocking {
    val particle = createParticle()
    val e = assertFailsWith<IllegalArgumentException> {
      particle.fromTag(ARC_ID, FixtureEntity.SCHEMA, "unsupportedTag")
    }
    assertThat(e).hasMessageThat().contains("No enum constant arcs.core.type.Tag.unsupportedTag")
  }

  @Test
  fun fromTag_unsupportedTag_throws() = runBlocking {
    val particle = createParticle()
    val e = assertFailsWith<IllegalArgumentException> {
      particle.fromTag(ARC_ID, FixtureEntity.SCHEMA, Tag.Reference.toString())
    }
    assertThat(e).hasMessageThat().isEqualTo(
      "Illegal Tag Reference when deserializing ArcHostContext with ArcId '$ARC_ID'"
    )
  }

  @Test
  fun fromTag_entityType() = runBlocking {
    val particle = createParticle()
    val type = particle.fromTag(ARC_ID, FixtureEntity.SCHEMA, Tag.Entity.toString())
    assertThat(type).isInstanceOf(EntityType::class.java)
    assertThat((type as EntityType).entitySchema).isEqualTo(FixtureEntity.SCHEMA)
  }

  @Test
  fun fromTag_collectionType() = runBlocking {
    val particle = createParticle()
    val type = particle.fromTag(ARC_ID, FixtureEntity.SCHEMA, Tag.Collection.toString())
    assertThat(type).isInstanceOf(CollectionType::class.java)
    assertThat((type as CollectionType<EntityType>).entitySchema).isEqualTo(FixtureEntity.SCHEMA)
  }

  @Test
  fun fromTag_singletonType() = runBlocking {
    val particle = createParticle()
    val type = particle.fromTag(ARC_ID, FixtureEntity.SCHEMA, Tag.Singleton.toString())
    assertThat(type).isInstanceOf(SingletonType::class.java)
    assertThat((type as SingletonType<EntityType>).entitySchema).isEqualTo(FixtureEntity.SCHEMA)
  }

  @Test
  fun createArcHostContextPersistencePlan_success() = runBlocking {
    val particle = createParticle(arcId = ARC_ID, hostId = HOST_ID)
    DriverAndKeyConfigurator.configureKeyParsersAndFactories()
    val partition = particle.createArcHostContextPersistencePlan(
      Capabilities(Capability.Persistence.IN_MEMORY),
      ARC_ID
    )
    assertThat(partition.arcId).isEqualTo(ARC_ID)
    assertThat(partition.arcHost).isEqualTo(HOST_ID)
    val planParticle = partition.particles.single()
    assertThat(planParticle.handles).hasSize(4)
    planParticle.handles.forEach { handleSpec ->
      assertThat(handleSpec.value.handle.storageKey).isNotNull()
    }
  }

  @Test
  fun createArcHostContextPersistencePlan_unsupportedCapabilities_throws() = runBlocking {
    val particle = createParticle(arcId = ARC_ID, hostId = HOST_ID)
    val e = assertFailsWith<IllegalArgumentException> {
      particle.createArcHostContextPersistencePlan(Capabilities(), ARC_ID)
    }
    assertThat(e).hasMessageThat().contains(
      "Cannot create storage key for handle '${HOST_ID}_arcState' with capabilities"
    )
  }

  companion object {
    private val ARC_ID = "testArcId"
    private val HOST_ID = "testHostId"
  }
}
