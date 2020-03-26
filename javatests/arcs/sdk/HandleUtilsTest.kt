/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.sdk

import arcs.core.common.Id
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.ReadWriteSingletonHandle
import arcs.core.host.EntityHandleManager
import arcs.core.host.HandleMode
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.handle.Stores
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.jvm.util.testutil.TimeImpl
import com.google.common.truth.Truth.assertWithMessage
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

private typealias Person = ReadSdkPerson_Person

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
@Suppress("UNCHECKED_CAST")
class HandleUtilsTest {
  private lateinit var manager: EntityHandleManager
  private val idGenerator = Id.Generator.newForTest("session")

  @Before
  fun setUp() {
    RamDiskDriverProvider()
    ReferenceModeStorageKey.registerParser()
      manager = EntityHandleManager(
          "testArc",
          "testHost",
          TimeImpl()
      )
  }

  @After
  fun tearDown() {
    RamDisk.clear()
  }

  @Test
  fun handleUtils_combineTwoUpdatesTest() = runBlockingTest {
    val collection = manager.createCollectionHandle(
      HandleMode.ReadWrite,
      READ_WRITE_HANDLE,
      Person,
      STORAGE_KEY_ONE
    ) as ReadWriteCollectionHandle<Person>

    val singleton = manager.createSingletonHandle(
      HandleMode.ReadWrite,
      READ_WRITE_HANDLE,
      Person,
      STORAGE_KEY_TWO
    ) as ReadWriteSingletonHandle<Person>

    var x = 0
    var y = 0
    combineUpdates(collection, singleton) { people, e2 ->
      if (people.elementAtOrNull(0)?.name == "George") {
        x += 1
      }
      if (e2?.name == "Martha") {
        y += 1
      }
    }
    collection.store(Person("George"))
    assertWithMessage("Expected Collection to include George").that(x).isEqualTo(1)
    assertWithMessage("Expected Singleton to not Equal Martha").that(y).isEqualTo(0)
    singleton.store(Person("Martha"))
    assertWithMessage("Expected Collection to include George").that(x).isEqualTo(2)
    assertWithMessage("Expected Singleton to include Martha").that(y).isEqualTo(1)
  }

  @Test
  fun handleUtils_combineThreeUpdatesTest() = runBlockingTest {
    val handle1 = manager.createCollectionHandle(
      HandleMode.ReadWrite,
      READ_WRITE_HANDLE,
      Person,
      STORAGE_KEY_ONE
    ) as ReadWriteCollectionHandle<Person>

    val handle2 = manager.createSingletonHandle(
      HandleMode.ReadWrite,
      READ_WRITE_HANDLE,
      Person,
      STORAGE_KEY_TWO
    ) as ReadWriteSingletonHandle<Person>

    val handle3 = manager.createCollectionHandle(
      HandleMode.ReadWrite,
      READ_WRITE_HANDLE,
      Person,
      STORAGE_KEY_THREE
    ) as ReadWriteCollectionHandle<Person>

    var handle1Tracking = 0
    var handle2Tracking = 0
    var handle3Tracking = 0
    combineUpdates(handle1, handle2, handle3) { e1, e2, e3 ->
      if (e1.elementAtOrNull(0)?.name == "A") {
        handle1Tracking += 1
      }
      if (e2?.name == "B") {
        handle2Tracking += 1
      }
      if (e3.elementAtOrNull(0)?.name == "C") {
        handle3Tracking += 1
      }
    }
    handle1.store(Person("A"))
    assertWithMessage("Expected handle1 to include A").that(handle1Tracking).isEqualTo(1)
    assertWithMessage("Expected handle2 to not equal B").that(handle2Tracking).isEqualTo(0)
    assertWithMessage("Expected handle3 to not include C").that(handle3Tracking).isEqualTo(0)
    handle2.store(Person("B"))
    assertWithMessage("Expected handle1 to include A").that(handle1Tracking).isEqualTo(2)
    assertWithMessage("Expected handle2 to equal B").that(handle2Tracking).isEqualTo(1)
    assertWithMessage("Expected handle3 to not include C").that(handle3Tracking).isEqualTo(0)
    handle3.store(Person("C"))
    assertWithMessage("Expected handle1 to include A").that(handle1Tracking).isEqualTo(3)
    assertWithMessage("Expected handle2 to equal B").that(handle2Tracking).isEqualTo(2)
    assertWithMessage("Expected handle3 to include C").that(handle3Tracking).isEqualTo(1)
  }

  @Test
  fun handleUtils_combineFourUpdatesTest() = runBlockingTest {
    val handle1 = manager.createCollectionHandle(
      HandleMode.ReadWrite,
      READ_WRITE_HANDLE,
      Person,
      STORAGE_KEY_ONE
    ) as ReadWriteCollectionHandle<Person>

    val handle2 = manager.createSingletonHandle(
      HandleMode.ReadWrite,
      READ_WRITE_HANDLE,
      Person,
      STORAGE_KEY_TWO
    ) as ReadWriteSingletonHandle<Person>

    val handle3 = manager.createCollectionHandle(
      HandleMode.ReadWrite,
      READ_WRITE_HANDLE,
      Person,
      STORAGE_KEY_THREE
    ) as ReadWriteCollectionHandle<Person>

    val handle4 = manager.createSingletonHandle(
      HandleMode.ReadWrite,
      READ_WRITE_HANDLE,
      Person,
      STORAGE_KEY_FOUR
    ) as ReadWriteSingletonHandle<Person>

    var handle1Tracking = 0
    var handle2Tracking = 0
    var handle3Tracking = 0
    var handle4Tracking = 0

    combineUpdates(handle1, handle2, handle3, handle4) { e1, e2, e3, e4 ->
      if (e1.elementAtOrNull(0)?.name == "A") {
        handle1Tracking += 1
      }
      if (e2?.name == "B") {
        handle2Tracking += 1
      }
      if (e3.elementAtOrNull(0)?.name == "C") {
        handle3Tracking += 1
      }
      if (e4?.name == "D") {
        handle4Tracking += 1
      }
    }
    handle1.store(Person("A"))
    assertWithMessage("Expected handle1 to include A").that(handle1Tracking).isEqualTo(1)
    assertWithMessage("Expected handle2 to not equal B").that(handle2Tracking).isEqualTo(0)
    assertWithMessage("Expected handle3 to not include C").that(handle3Tracking).isEqualTo(0)
    assertWithMessage("Expected handle4 to not equal D").that(handle4Tracking).isEqualTo(0)

    handle2.store(Person("B"))
    assertWithMessage("Expected handle1 to include A").that(handle1Tracking).isEqualTo(2)
    assertWithMessage("Expected handle2 to equal B").that(handle2Tracking).isEqualTo(1)
    assertWithMessage("Expected handle3 to not include C").that(handle3Tracking).isEqualTo(0)
    assertWithMessage("Expected handle4 to not equal D").that(handle4Tracking).isEqualTo(0)

    handle3.store(Person("C"))
    assertWithMessage("Expected handle1 to include A").that(handle1Tracking).isEqualTo(3)
    assertWithMessage("Expected handle2 to equal B").that(handle2Tracking).isEqualTo(2)
    assertWithMessage("Expected handle3 to include C").that(handle3Tracking).isEqualTo(1)
    assertWithMessage("Expected handle4 to not equal D").that(handle4Tracking).isEqualTo(0)

    handle4.store(Person("D"))
    assertWithMessage("Expected handle1 to include A").that(handle1Tracking).isEqualTo(4)
    assertWithMessage("Expected handle2 to equal B").that(handle2Tracking).isEqualTo(3)
    assertWithMessage("Expected handle3 to include C").that(handle3Tracking).isEqualTo(2)
    assertWithMessage("Expected handle4 to equal D").that(handle4Tracking).isEqualTo(1)
  }

  @Suppress("UNUSED_PARAMETER")
  @Test
  fun handleUtils_combineTenUpdatesTest() = runBlockingTest {
    val handle1 = manager.createCollectionHandle(
      HandleMode.ReadWrite,
      READ_WRITE_HANDLE,
      Person,
      STORAGE_KEY_ONE
    ) as ReadWriteCollectionHandle<Person>

    val handle2 = manager.createSingletonHandle(
      HandleMode.ReadWrite,
      READ_WRITE_HANDLE,
      Person,
      STORAGE_KEY_TWO
    ) as ReadWriteSingletonHandle<Person>

    val handle3 = manager.createCollectionHandle(
      HandleMode.ReadWrite,
      READ_WRITE_HANDLE,
      Person,
      STORAGE_KEY_THREE
    ) as ReadWriteCollectionHandle<Person>

    val handle4 = manager.createSingletonHandle(
      HandleMode.ReadWrite,
      READ_WRITE_HANDLE,
      Person,
      STORAGE_KEY_FOUR
    ) as ReadWriteSingletonHandle<Person>

    val handle5 = manager.createCollectionHandle(
      HandleMode.ReadWrite,
      READ_WRITE_HANDLE,
      Person,
      STORAGE_KEY_FIVE
    ) as ReadWriteCollectionHandle<Person>

    val handle6 = manager.createSingletonHandle(
      HandleMode.ReadWrite,
      READ_WRITE_HANDLE,
      Person,
      STORAGE_KEY_SIX
    ) as ReadWriteSingletonHandle<Person>

    val handle7 = manager.createCollectionHandle(
      HandleMode.ReadWrite,
      READ_WRITE_HANDLE,
      Person,
      STORAGE_KEY_SEVEN
    ) as ReadWriteCollectionHandle<Person>

    val handle8 = manager.createSingletonHandle(
      HandleMode.ReadWrite,
      READ_WRITE_HANDLE,
      Person,
      STORAGE_KEY_EIGHT
    ) as ReadWriteSingletonHandle<Person>

    val handle9 = manager.createCollectionHandle(
      HandleMode.ReadWrite,
      READ_WRITE_HANDLE,
      Person,
      STORAGE_KEY_NINE
    ) as ReadWriteCollectionHandle<Person>

    val handle10 = manager.createSingletonHandle(
      HandleMode.ReadWrite,
      READ_WRITE_HANDLE,
      Person,
      STORAGE_KEY_TEN
    ) as ReadWriteSingletonHandle<Person>

    var tracking5 = 0
    var tracking6 = 0
    var tracking7 = 0
    var tracking8 = 0
    var tracking9 = 0
    var tracking10 = 0

    combineUpdates(
      handle1,
      handle2,
      handle3,
      handle4,
      handle5
    ) { e1, e2, e3, e4, e5 ->
      tracking5 += 1
    }

    combineUpdates(
      handle1,
      handle2,
      handle3,
      handle4,
      handle5,
      handle6
    ) { e1, e2, e3, e4, e5, e6 ->
      tracking6 += 1
    }

    combineUpdates(
      handle1,
      handle2,
      handle3,
      handle4,
      handle5,
      handle6,
      handle7
    ) { e1, e2, e3, e4, e5, e6, e7 ->
      tracking7 += 1
    }

    combineUpdates(
      handle1,
      handle2,
      handle3,
      handle4,
      handle5,
      handle6,
      handle7,
      handle8
    ) { e1, e2, e3, e4, e5, e6, e7, e8 ->
      tracking8 += 1
    }

    combineUpdates(
      handle1,
      handle2,
      handle3,
      handle4,
      handle5,
      handle6,
      handle7,
      handle8,
      handle9
    ) { e1, e2, e3, e4, e5, e6, e7, e8, e9 ->
      tracking9 += 1
    }

    combineUpdates(
      handle1,
      handle2,
      handle3,
      handle4,
      handle5,
      handle6,
      handle7,
      handle8,
      handle9,
      handle10
    ) { e1, e2, e3, e4, e5, e6, e7, e8, e9, e10 ->
      tracking10 += 1
    }
    
    handle1.store(Person("A"))
    handle2.store(Person("B"))
    handle3.store(Person("C"))
    handle4.store(Person("D"))
    handle5.store(Person("E"))
    handle6.store(Person("F"))
    handle7.store(Person("G"))
    handle8.store(Person("H"))
    handle9.store(Person("I"))
    handle10.store(Person("J"))
    
    assertWithMessage("Expected 5 combineUpdates to be called.").that(tracking5).isEqualTo(5)
    assertWithMessage("Expected 6 combineUpdates to be called.").that(tracking6).isEqualTo(6)
    assertWithMessage("Expected 7 combineUpdates to be called.").that(tracking7).isEqualTo(7)
    assertWithMessage("Expected 8 combineUpdates to be called.").that(tracking8).isEqualTo(8)
    assertWithMessage("Expected 9 combineUpdates to be called.").that(tracking9).isEqualTo(9)
    assertWithMessage("Expected 10 combineUpdates to be called.").that(tracking10).isEqualTo(10)
  }

  private companion object {
    private const val READ_WRITE_HANDLE = "readWriteHandle"

    private val STORAGE_KEY_ONE = ReferenceModeStorageKey(
      backingKey = RamDiskStorageKey("backing"),
      storageKey = RamDiskStorageKey("entity")
    )

    private val STORAGE_KEY_TWO = ReferenceModeStorageKey(
      backingKey = RamDiskStorageKey("backing2"),
      storageKey = RamDiskStorageKey("entity2")
    )

    private val STORAGE_KEY_THREE = ReferenceModeStorageKey(
      backingKey = RamDiskStorageKey("backing3"),
      storageKey = RamDiskStorageKey("entity3")
    )

    private val STORAGE_KEY_FOUR = ReferenceModeStorageKey(
      backingKey = RamDiskStorageKey("backing4"),
      storageKey = RamDiskStorageKey("entity4")
    )

    private val STORAGE_KEY_FIVE = ReferenceModeStorageKey(
      backingKey = RamDiskStorageKey("backing5"),
      storageKey = RamDiskStorageKey("entity5")
    )

    private val STORAGE_KEY_SIX = ReferenceModeStorageKey(
      backingKey = RamDiskStorageKey("backing6"),
      storageKey = RamDiskStorageKey("entity6")
    )

    private val STORAGE_KEY_SEVEN = ReferenceModeStorageKey(
      backingKey = RamDiskStorageKey("backing7"),
      storageKey = RamDiskStorageKey("entity7")
    )

    private val STORAGE_KEY_EIGHT = ReferenceModeStorageKey(
      backingKey = RamDiskStorageKey("backing8"),
      storageKey = RamDiskStorageKey("entity8")
    )

    private val STORAGE_KEY_NINE = ReferenceModeStorageKey(
      backingKey = RamDiskStorageKey("backing9"),
      storageKey = RamDiskStorageKey("entity9")
    )

    private val STORAGE_KEY_TEN = ReferenceModeStorageKey(
      backingKey = RamDiskStorageKey("backing10"),
      storageKey = RamDiskStorageKey("entity10")
    )
  }
}
