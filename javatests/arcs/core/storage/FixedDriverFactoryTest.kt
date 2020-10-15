package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.storage.testutil.DummyStorageKey
import arcs.core.storage.testutil.FakeDriverProvider
import arcs.core.type.Type
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.mock
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
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

  private val mockType: Type = mock {}
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

    assertThat(factory.getDriver(storageKey1, fakeClass, mockType)).isEqualTo(mockDriver1)
    assertThat(factory.getDriver(storageKey2, fakeClass, mockType)).isEqualTo(mockDriver2)
    assertThat(factory.getDriver(storageKey3, fakeClass, mockType)).isEqualTo(mockDriver3)
  }

  @Test
  fun getDriver_withoutMatch_returnsNull() = runBlockingTest {
    val factory = FixedDriverFactory(listOf(provider1))

    assertThat(factory.getDriver(storageKey2, fakeClass, mockType)).isNull()
  }
}
