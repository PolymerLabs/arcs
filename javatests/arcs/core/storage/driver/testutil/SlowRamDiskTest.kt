package arcs.core.storage.driver.testutil

import arcs.core.common.ArcId
import arcs.core.storage.driver.volatiles.VolatileEntry
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.keys.VolatileStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class SlowRamDiskTest {
  @Test
  fun driverProvider_supportsOnly_ramDiskStorageKey() = runBlockingTest {
    val provider = SlowRamDiskDriverProvider { _, _ -> }

    assertThat(provider.willSupport(RamDiskStorageKey("foo")))
      .isTrue()
    assertThat(provider.willSupport(VolatileStorageKey(ArcId.newForTest("foo"), "foo")))
      .isFalse()
    assertThat(
      provider.willSupport(
        ReferenceModeStorageKey(RamDiskStorageKey("foo"), RamDiskStorageKey("bar"))
      )
    ).isFalse()
  }

  @Test
  fun contains_callsWaitOp() = runBlockingTest {
    var shouldAssert = false
    var calledForExpectedOp = false
    val memory = SlowVolatileMemory { op, _ ->
      if (shouldAssert) {
        assertThat(op == SlowVolatileMemory.MemoryOp.Contains).isTrue()
        calledForExpectedOp = true
      }
    }

    shouldAssert = true
    memory.contains(KEY)
    assertThat(calledForExpectedOp).isTrue()
  }

  @Test
  fun get_callsWaitOp() = runBlockingTest {
    var shouldAssert = false
    var calledForExpectedOp = false
    val memory = SlowVolatileMemory { op, _ ->
      if (shouldAssert) {
        assertThat(op == SlowVolatileMemory.MemoryOp.Get).isTrue()
        calledForExpectedOp = true
      }
    }

    shouldAssert = true
    assertThat(memory.get<Int>(KEY)).isNull()
    assertThat(calledForExpectedOp).isTrue()
  }

  @Test
  fun set_callsWaitOp() = runBlockingTest {
    var shouldAssert = false
    var calledForExpectedOp = false
    val memory = SlowVolatileMemory { op, _ ->
      if (shouldAssert) {
        assertThat(op == SlowVolatileMemory.MemoryOp.Set).isTrue()
        calledForExpectedOp = true
      }
    }

    shouldAssert = true
    memory.set(KEY, VolatileEntry(5))
    assertThat(calledForExpectedOp).isTrue()
  }

  @Test
  fun update_callsWaitOp() = runBlockingTest {
    var shouldAssert = false
    var calledForExpectedOp = false
    val memory = SlowVolatileMemory { op, _ ->
      if (shouldAssert) {
        assertThat(op == SlowVolatileMemory.MemoryOp.Update).isTrue()
        calledForExpectedOp = true
      }
    }

    memory.set(KEY, VolatileEntry(5))

    shouldAssert = true
    val (isNew, previousValue) = memory.update<Int>(KEY) { entry ->
      entry?.copy(data = 7) ?: VolatileEntry(7)
    }
    assertThat(isNew).isTrue()
    assertThat(previousValue.data).isEqualTo(7)
    assertThat(calledForExpectedOp).isTrue()
  }

  @Test
  fun clear_callsWaitOp() = runBlockingTest {
    var shouldAssert = false
    var calledForExpectedOp = false
    val memory = SlowVolatileMemory { op, _ ->
      if (shouldAssert) {
        assertThat(op == SlowVolatileMemory.MemoryOp.Clear).isTrue()
        calledForExpectedOp = true
      }
    }

    shouldAssert = true
    memory.clear()
    assertThat(calledForExpectedOp).isTrue()
  }

  companion object {
    private val KEY = RamDiskStorageKey("slowness")
  }
}
