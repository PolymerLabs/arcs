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
import arcs.core.storage.handle.HandleManager
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.jvm.util.testutil.TimeImpl
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

private typealias Person = ReadSDKPerson_Person

@RunWith(JUnit4::class)
@UseExperimental(ExperimentalCoroutinesApi::class)
@Suppress("UNCHECKED_CAST")
class HandleUtilsTest {
  private lateinit var manager: EntityHandleManager
  private val idGenerator = Id.Generator.newForTest("session")

  @Before
  fun setUp() {
    RamDiskDriverProvider()
    ReferenceModeStorageKey.registerParser()
    manager = EntityHandleManager(HandleManager(TimeImpl()))
  }

  @After
  fun tearDown() {
    RamDisk.clear()
  }


  @Test
  fun handleUtils_combineUpdatesTest() = runBlockingTest {
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
    combineUpdates(collection, singleton) { people, e2 ->
      if (people.elementAtOrNull(0)?.name == "George") {
        x += 1
      }
      if (e2?.name == "Martha") {
        x += 3
      }
    }
    collection.store(Person("George"))
    assertThat(x).isEqualTo(1)
    singleton.store(Person("Martha"))
    assertThat(x).isEqualTo(5)
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
  }
}
