package arcs.core.allocator

import arcs.core.data.Plan
import arcs.core.data.testutil.CreatableStorageKeyGenerator
import arcs.core.data.testutil.HandleConnectionGenerator
import arcs.core.data.testutil.HandleGenerator
import arcs.core.data.testutil.HandleModeFromType
import arcs.core.data.testutil.ParticleInfoGenerator
import arcs.core.data.testutil.PlanFromParticles
import arcs.core.data.testutil.PlanParticleGenerator
import arcs.core.host.PersonPlan
import arcs.core.host.PurePerson
import arcs.core.host.ReadPerson
import arcs.core.host.WritePerson
import arcs.core.host.testutil.HostRegistryFromParticles
import arcs.core.host.toRegistration
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.testutil.ChooseFromList
import arcs.core.testutil.FuzzingRandom
import arcs.core.testutil.Generator
import arcs.core.testutil.ListOf
import arcs.core.testutil.MapOf
import arcs.core.testutil.SequenceOf
import arcs.core.testutil.Value
import arcs.core.testutil.runFuzzTest
import arcs.core.testutil.runRegressionTest
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test

class AllocatorFuzzTest {
  @Before
  fun setUp() = runBlocking {
    RamDisk.clear()
    DriverAndKeyConfigurator.configure(null)
  }

  /**
   * Test that adding a randomly generated unmapped particle will result in a plan being unable to
   * be started.
   */
  @Test
  fun addUnmappedParticle_generatesError() = runFuzzTest {
    val particle = PlanParticleGenerator(
      ChooseFromList(it, listOf("Particle", "Shmarticle", "Blarticle", "Fred", "Jordan", "Bob")),
      ChooseFromList(it, listOf("location.one", "a.location.two", "the.location.three")),
      handleMapGenerator(it)
    )

    val particleRegistrations = listOf(
      ::WritePerson.toRegistration(),
      ::ReadPerson.toRegistration(),
      ::PurePerson.toRegistration()
    )
    val hostRegistry = HostRegistryFromParticles(it)(particleRegistrations)

    invariant_addUnmappedParticle_generatesError(PersonPlan, hostRegistry, particle())
  }

  /**
   * Test that a randomly generated plan will resolve against a randomly generated registry,
   * as long as the registry hosts all particles in the plan.
   */
  @Test
  fun planWithOnly_mappedParticles_willResolve() = runFuzzTest {
    val names = ChooseFromList(
      it,
      listOf("Particle", "Shmarticle", "Blarticle", "Fred", "Jordan", "Bob")
    )
    val particles = ListOf(
      ParticleInfoGenerator(
        it,
        names,
        handleMapGenerator(
          it
        )
      ),
      Value(10)
    )()
    val plan = PlanFromParticles(it)(particles.map { it.plan })
    val registry = HostRegistryFromParticles(it)(particles.map { it.registration })

    invariant_planWithOnly_mappedParticles_willResolve(plan, registry)
  }

  /**
   * Test that [PersonPlan] will resolve when the contained particles are randomly
   * distributed amongst [ArcHost]s.
   */
  @Test
  fun PersonPlan_willResolve() = runFuzzTest {
    val particleRegistrations = listOf(
      ::WritePerson.toRegistration(),
      ::ReadPerson.toRegistration(),
      ::PurePerson.toRegistration()
    )
    val hostRegistry = HostRegistryFromParticles(it)(particleRegistrations)

    invariant_planWithOnly_mappedParticles_willResolve(PersonPlan, hostRegistry)
  }

  /**
   * Regression for planWithOnly_mappedParticles_willResolve.
   *
   * Multiple particles that shared the same class were not correctly being mapped. This is
   * because by default the [Allocator] maps by classpath, so all particles that share a
   * class get aliased together.
   *
   * This isn't a massive issue for the standard approach of using code-gen to define particles,
   * but it's a gotcha if particle behaviour is defined by closures rather than subclassing.
   *
   * Resolved for now by modifying [ParticleRegistrationGenerator] to create a unique
   * location for each particle; we should consider whether a more pervasive fix is
   * warranted (b/175062665).
   */
  // TODO(b/176945325): replace this seeded random with direct inputs to the invariant
  // once the infrastructure is available.
  @Test
  fun regression_planWithOnly_mappedParticles_willResolve() = runRegressionTest(-633081472) {
    val names = ChooseFromList(
      it,
      listOf("Particle", "Shmarticle", "Blarticle", "Fred", "Jordan", "Bob")
    )
    val particles = ListOf(
      ParticleInfoGenerator(
        it,
        names,
        handleMapGenerator(
          it
        )
      ),
      Value(10)
    )()
    val plan = PlanFromParticles(it)(particles.map { it.plan })
    val registry = HostRegistryFromParticles(it)(particles.map { it.registration })

    invariant_planWithOnly_mappedParticles_willResolve(plan, registry)
  }

  /**
   * Generate a random handleConnection map.
   */
  fun handleMapGenerator(s: FuzzingRandom): Generator<Map<String, Plan.HandleConnection>> {
    val storageKey = ChooseFromList(s, listOf("sk1", "sk2", "sk3", "sk4", "sk5", "sk6"))
    return MapOf(
      SequenceOf(listOf("a", "b", "c", "d", "e")),
      HandleConnectionGenerator(
        handle = HandleGenerator(
          storageKey = CreatableStorageKeyGenerator(
            storageKey
          ),
          // TODO(b/176946024): Add a type generator
          type = Value(PersonPlan.handles[0].type)
        ),
        mode = HandleModeFromType(s),
        type = Value(PersonPlan.handles[0].type)
      ),
      ChooseFromList(s, listOf(1, 2, 3, 4, 5))
    )
  }
}
