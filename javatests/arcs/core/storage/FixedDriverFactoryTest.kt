package arcs.core.storage

import arcs.core.common.CompositeException
import arcs.core.crdt.CrdtData
import arcs.core.storage.testutil.DummyStorageKey
import arcs.core.storage.testutil.FakeDriverProvider
import arcs.core.testutil.CallbackChoreographer
import arcs.core.testutil.assertSuspendingThrows
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.mock
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class FixedDriverFactoryTest {
  private val mockDriver1 = mock<Driver<CrdtData>> {}
  private val mockDriver2 = mock<Driver<CrdtData>> {}
  private val mockDriver3 = mock<Driver<CrdtData>> {}

  private val storageKey1 = DummyStorageKey("1")
  private val storageKey2 = DummyStorageKey("2")
  private val storageKey3 = DummyStorageKey("3")

  private val provider1 = FakeDriverProvider(storageKey1 to mockDriver1)
  private val provider2 = FakeDriverProvider(
    storageKey1 to mockDriver1,
    storageKey2 to mockDriver2
  )
  private val provider3 = FakeDriverProvider(
    storageKey1 to mockDriver1,
    storageKey2 to mockDriver2,
    storageKey3 to mockDriver3
  )

  private val fakeClass = CrdtData::class

  @Test
  fun willSupport_withMatch_returnsTrue() = runBlockingTest {
    val factory = FixedDriverFactory(listOf(provider3))

    assertThat(factory.willSupport(storageKey1)).isTrue()
    assertThat(factory.willSupport(storageKey2)).isTrue()
    assertThat(factory.willSupport(storageKey3)).isTrue()
  }

  @Test
  fun willSupport_withoutMatch_returnsFalse() = runBlockingTest {
    val factory = FixedDriverFactory(listOf(provider1))

    assertThat(factory.willSupport(storageKey1)).isTrue()
    assertThat(factory.willSupport(storageKey2)).isFalse()
    assertThat(factory.willSupport(storageKey3)).isFalse()
  }

  @Test
  fun getDriver_withMatch_returnsFirstMatching() = runBlockingTest {
    val factory = FixedDriverFactory(listOf(provider1, provider2, provider3))

    assertThat(factory.getDriver(storageKey1, fakeClass)).isEqualTo(mockDriver1)
    assertThat(factory.getDriver(storageKey2, fakeClass)).isEqualTo(mockDriver2)
    assertThat(factory.getDriver(storageKey3, fakeClass)).isEqualTo(mockDriver3)
  }

  @Test
  fun getDriver_withoutMatch_returnsNull() = runBlockingTest {
    val factory = FixedDriverFactory(listOf(provider1))

    assertThat(factory.getDriver(storageKey2, fakeClass)).isNull()
  }

  @Test
  fun removeEntitiesCreatedBetween_propagatesArguments() = runBlockingTest {
    val startParam = 1000L
    val endParam = 2000L

    val handlerCalls = atomic(0)

    val checkHandler: (suspend (Long, Long) -> Unit) = { start, end ->
      assertThat(start).isEqualTo(startParam)
      assertThat(end).isEqualTo(endParam)
      handlerCalls.incrementAndGet()
    }

    provider1.onRemoveEntitiesCreatedBetween = checkHandler
    provider2.onRemoveEntitiesCreatedBetween = checkHandler
    provider3.onRemoveEntitiesCreatedBetween = checkHandler

    val providers = listOf(provider1, provider2, provider3)
    val factory = FixedDriverFactory(providers)
    factory.removeEntitiesCreatedBetween(startParam, endParam)
    assertThat(handlerCalls.value).isEqualTo(providers.size)
  }

  @Test
  fun removeEntitiesCreatedBetween_waitsForAllComplete() = runBlockingTest {
    val choreographer1 = CallbackChoreographer()
    provider1.onRemoveEntitiesCreatedBetween = { _, _ -> choreographer1.callback() }

    val choreographer2 = CallbackChoreographer()
    provider2.onRemoveEntitiesCreatedBetween = { _, _ -> choreographer2.callback() }

    val choreographer3 = CallbackChoreographer()
    provider3.onRemoveEntitiesCreatedBetween = { _, _ -> choreographer3.callback() }

    val factory = FixedDriverFactory(listOf(provider1, provider2, provider3))

    // Start the removal job.
    // Use `async` rather than `launch` so the exception is passed to us via `await`.
    val removalJob = async {
      factory.removeEntitiesCreatedBetween(1000, 2000)
    }

    assertThat(removalJob.isCompleted).isFalse()

    choreographer1.signalCallback()
    choreographer1.awaitCallback()
    assertThat(removalJob.isCompleted).isFalse()

    choreographer2.signalCallback()
    choreographer2.awaitCallback()
    assertThat(removalJob.isCompleted).isFalse()

    choreographer3.signalCallback()
    choreographer3.awaitCallback()
    removalJob.await()
  }

  @Test
  fun removeEntitiesCreatedBetween_allJobsRun_evenIfOneThrows() = runBlockingTest {
    val choreographer1 = CallbackChoreographer()
    provider1.onRemoveEntitiesCreatedBetween = { _, _ -> choreographer1.callback() }

    val choreographer2 = CallbackChoreographer { throw Exception("provider 2 failure") }
    provider2.onRemoveEntitiesCreatedBetween = { _, _ -> choreographer2.callback() }

    val choreographer3 = CallbackChoreographer()
    provider3.onRemoveEntitiesCreatedBetween = { _, _ -> choreographer3.callback() }

    val factory = FixedDriverFactory(listOf(provider1, provider2, provider3))

    // Start the removal job.
    // Use `async` rather than `launch` so the exception is passed to us via `await`.
    val removalJob = async {
      factory.removeEntitiesCreatedBetween(1000, 2000)
    }

    assertThat(removalJob.isCompleted).isFalse()

    choreographer1.signalCallback()
    assertThat(removalJob.isCompleted).isFalse()

    choreographer2.signalCallback()
    assertThat(removalJob.isCompleted).isFalse()

    choreographer3.signalCallback()

    val exception = assertSuspendingThrows(CompositeException::class) {
      removalJob.await()
    }
    assertThat(exception.exceptions).containsExactly(choreographer2.actionException)
    choreographer1.awaitCallback()
    choreographer3.awaitCallback()
  }

  @Test
  fun removeAllEntities_waitsForAllComplete() = runBlockingTest {
    val choreographer1 = CallbackChoreographer()
    provider1.onRemoveAllEntities = choreographer1::callback

    val choreographer2 = CallbackChoreographer()
    provider2.onRemoveAllEntities = choreographer2::callback

    val choreographer3 = CallbackChoreographer()
    provider3.onRemoveAllEntities = choreographer3::callback

    val factory = FixedDriverFactory(listOf(provider1, provider2, provider3))

    // Start the removal job.
    // Use `async` rather than `launch` so the exception is passed to us via `await`.
    val removalJob = async {
      factory.removeAllEntities()
    }

    assertThat(removalJob.isCompleted).isFalse()

    choreographer1.signalCallback()
    choreographer1.awaitCallback()
    assertThat(removalJob.isCompleted).isFalse()

    choreographer2.signalCallback()
    choreographer2.awaitCallback()
    assertThat(removalJob.isCompleted).isFalse()

    choreographer3.signalCallback()
    choreographer3.awaitCallback()
    removalJob.await()
  }

  @Test
  fun removeAllEntities_allJobsRun_evenIfOneThrows() = runBlockingTest {
    val choreographer1 = CallbackChoreographer()
    provider1.onRemoveAllEntities = choreographer1::callback

    var provider2Threw: Exception? = null
    val choreographer2 = CallbackChoreographer {
      throw Exception("provider 2 failure").also {
        provider2Threw = it
      }
    }
    provider2.onRemoveAllEntities = choreographer2::callback

    val choreographer3 = CallbackChoreographer()
    provider3.onRemoveAllEntities = choreographer3::callback

    val factory = FixedDriverFactory(listOf(provider1, provider2, provider3))

    // Start the removal job.
    // Use `async` rather than `launch` so the exception is passed to us via `await`.
    val removalJob = async {
      factory.removeAllEntities()
    }

    assertThat(removalJob.isCompleted).isFalse()

    choreographer1.signalCallback()
    assertThat(removalJob.isCompleted).isFalse()

    choreographer2.signalCallback()
    assertThat(removalJob.isCompleted).isFalse()

    choreographer3.signalCallback()

    val exception = assertSuspendingThrows(CompositeException::class) {
      removalJob.await()
    }

    choreographer1.awaitCallback()
    assertThat(exception.exceptions).containsExactly(provider2Threw)
    choreographer3.awaitCallback()
  }
}
