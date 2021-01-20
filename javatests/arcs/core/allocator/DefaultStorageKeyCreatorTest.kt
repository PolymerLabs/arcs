package arcs.core.allocator

import arcs.core.common.Id
import arcs.core.data.CreatableStorageKey
import arcs.core.data.Plan
import arcs.core.host.ExternalPersonPlan
import arcs.core.host.MultiplePersonPlan
import arcs.core.host.PersonPlan
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class DefaultStorageKeyCreatorTest {

  private val idGenerator = Id.Generator.newSession()
  private val testArcId = idGenerator.newArcId("Test")
  private val keyCreator = DefaultStorageKeyCreator()

  @Before
  fun setUp() = runBlocking {
    RamDisk.clear()
    DriverAndKeyConfigurator.configure(null)
  }

  /**
   * Simple test case of [DefaultStorageKeyCreator.createStorageKeysIfNecessary].
   *
   * Plan is based on PersonPlan recipe in the //javatests/arcs/core/host/person.arcs file.
   */
  @Test
  fun keyCreator_createStorageKeysIfNecessary() = creatorKeyTest(PersonPlan)

  /**
   * Complex test case of [DefaultStorageKeyCreator.createStorageKeysIfNecessary].
   *
   * Plan is based on MultiplePersonPlan recipe in the //javatests/arcs/core/host/person.arcs file.
   */
  @Test
  fun keyCreator_createStorageKeysIfNecessary_manyParticles() = creatorKeyTest(MultiplePersonPlan)

  /**
   * Test for [DefaultStorageKeyCreator.createStorageKeysIfNecessary] with a mix of
   * [CreatableStorageKey]s and already created storage keys.
   *
   * Plan is based on ExternalPerson and CreatePersonStore recipes in the
   * //javatests/arcs/core/host/person.arcs file.
   */
  @Test
  fun keyCreator_createStorageKeysIfNecessary_mixedKeys() {
    val createdPlan = keyCreator.createStorageKeysIfNecessary(
      testArcId,
      idGenerator,
      ExternalPersonPlan
    )

    // Verify the plan returned by keyCreator has the correct type of keys.
    createdPlan.particles.forEach { particle ->
      particle.handles.values.forEach { connection ->
        assertThat(connection.storageKey).isNotInstanceOf(CreatableStorageKey::class.java)
      }
    }
  }

  /**
   * Given a [Plan], test that its keys start as [CreatableStorageKey]s and are transformed
   * using the [DefaultStorageKeyCreator.createStorageKeysIfNecessary] method. Verify that the
   * returned plan has all the storage keys created.
   */
  private fun creatorKeyTest(plan: Plan) {
    // Verify the handle storage keys start as creatable.
    plan.particles.forEach { particle ->
      particle.handles.values.forEach { connection ->
        assertThat(connection.storageKey).isInstanceOf(CreatableStorageKey::class.java)
      }
    }

    val firstPlan = keyCreator.createStorageKeysIfNecessary(
      testArcId,
      idGenerator,
      plan
    )

    // Verify the plan returned by keyCreator has the correct type of keys.
    firstPlan.particles.forEach { particle ->
      particle.handles.values.forEach { connection ->
        assertThat(connection.storageKey).isNotInstanceOf(CreatableStorageKey::class.java)
      }
    }

    // Call createStorageKeysIfNecessary again to verify if the keys already exist, they will not
    // be recreated.
    val secondPlan = keyCreator.createStorageKeysIfNecessary(
      testArcId,
      idGenerator,
      firstPlan
    )

    // Verify the keys are not recreated with the second call of createStorageKeysIfNecessary.
    firstPlan.particles.forEach { particle ->
      val secondParticle = secondPlan.particles.findLast { it == particle }
      assertThat(secondParticle).isNotNull()
      particle.handles.values.forEach { connection ->
        assertThat(secondParticle?.handles?.containsValue(connection)).isTrue()
      }
    }
  }
}
