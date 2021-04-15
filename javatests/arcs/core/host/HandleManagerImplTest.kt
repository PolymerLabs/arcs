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

package arcs.core.host

import arcs.core.common.toId
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.ReferenceType
import arcs.core.data.SingletonType
import arcs.core.entity.EntitySpec
import arcs.core.entity.ForeignReferenceCheckerImpl
import arcs.core.entity.Handle
import arcs.core.entity.HandleSpec
import arcs.core.entity.ReadCollectionHandle
import arcs.core.entity.ReadSingletonHandle
import arcs.core.entity.ReadWriteQueryCollectionHandle
import arcs.core.entity.ReadWriteSingletonHandle
import arcs.core.entity.WriteCollectionHandle
import arcs.core.entity.WriteSingletonHandle
import arcs.core.host.AbstractReadPerson.Person
import arcs.core.host.AbstractReadPerson.PersonSlice
import arcs.core.storage.StorageKey
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.core.testutil.handles.dispatchClear
import arcs.core.testutil.handles.dispatchClose
import arcs.core.testutil.handles.dispatchFetch
import arcs.core.testutil.handles.dispatchFetchAll
import arcs.core.testutil.handles.dispatchIsEmpty
import arcs.core.testutil.handles.dispatchQuery
import arcs.core.testutil.handles.dispatchRemove
import arcs.core.testutil.handles.dispatchSize
import arcs.core.testutil.handles.dispatchStore
import arcs.core.testutil.runTest
import arcs.core.type.Type
import arcs.core.util.Scheduler
import arcs.core.util.testutil.LogRule
import arcs.flags.BuildFlags
import arcs.flags.testing.BuildFlagsRule
import arcs.flags.testing.ParameterizedBuildFlags
import arcs.jvm.util.testutil.FakeTime
import arcs.sdk.ReadWriteCollectionHandle
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.TruthJUnit.assume
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.test.assertFailsWith
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized

@OptIn(ExperimentalCoroutinesApi::class)
@Suppress("UNCHECKED_CAST")
@RunWith(Parameterized::class)
class HandleManagerImplTest(private val parameters: ParameterizedBuildFlags) {

  @get:Rule val rule = BuildFlagsRule.parameterized(parameters)

  @get:Rule
  val log = LogRule()

  private lateinit var managerImpl: HandleManagerImpl
  private lateinit var schedulerProvider: SimpleSchedulerProvider
  private lateinit var scheduler: Scheduler

  @Before
  fun setUp() = runBlocking {
    RamDisk.clear()
    DriverAndKeyConfigurator.configure(null)
    schedulerProvider = SimpleSchedulerProvider(EmptyCoroutineContext)
    scheduler = schedulerProvider("tests")
    managerImpl = HandleManagerImpl(
      "testArc",
      "",
      FakeTime(),
      scheduler = scheduler,
      storageEndpointManager = testStorageEndpointManager(),
      foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
    )
  }

  @After
  fun tearDown() = runBlocking {
    managerImpl.close()
    schedulerProvider.cancelAll()
  }

  @Test
  fun singletonHandle_readOnlyCantWrite() = runTest {
    val readOnlyHandle = managerImpl.createHandle(
      HandleSpec(
        READ_ONLY_HANDLE,
        HandleMode.Read,
        SINGLETON_TYPE,
        Person
      ),
      STORAGE_KEY
    )

    assertThat(readOnlyHandle).isInstanceOf(ReadSingletonHandle::class.java)
    assertThat(readOnlyHandle).isNotInstanceOf(WriteSingletonHandle::class.java)
    assertThat(readOnlyHandle).isNotInstanceOf(ReadWriteSingletonHandle::class.java)
  }

  @Test
  fun singletonHandle_writeOnlyCantRead() = runTest {
    val writeOnlyHandle = managerImpl.createHandle(
      HandleSpec(
        WRITE_ONLY_HANDLE,
        HandleMode.Write,
        SINGLETON_TYPE,
        Person
      ),
      STORAGE_KEY
    )
    assertThat(writeOnlyHandle).isInstanceOf(WriteSingletonHandle::class.java)
    assertThat(writeOnlyHandle).isNotInstanceOf(ReadSingletonHandle::class.java)
    assertThat(writeOnlyHandle).isNotInstanceOf(ReadWriteSingletonHandle::class.java)
  }

  @Test
  fun singletonHandle_doesNotSupportQuery() = runTest {
    assertIllegalArgumentException("Singleton Handles do not support mode Query") {
      createHandle(mode = HandleMode.Query, type = SINGLETON_TYPE)
    }
  }

  @Test
  fun singletonHandle_doesNotSupportReadQuery() = runTest {
    assertIllegalArgumentException("Singleton Handles do not support mode ReadQuery") {
      createHandle(mode = HandleMode.ReadQuery, type = SINGLETON_TYPE)
    }
  }

  @Test
  fun singletonHandle_doesNotSupportWriteQuery() = runTest {
    assertIllegalArgumentException("Singleton Handles do not support mode WriteQuery") {
      createHandle(mode = HandleMode.WriteQuery, type = SINGLETON_TYPE)
    }
  }

  @Test
  fun singletonHandle_doesNotSupportReadWriteQuery() = runTest {
    assertIllegalArgumentException("Singleton Handles do not support mode ReadWriteQuery") {
      createHandle(
        mode = HandleMode.ReadWriteQuery,
        type = SINGLETON_TYPE
      )
    }
  }

  @Test
  fun singleton_noOpsAfterClose() = runTest {
    val handle =
      createHandle(mode = HandleMode.ReadWrite) as ReadWriteSingletonHandle<Person, PersonSlice>

    handle.dispatchStore(Person("test"))
    handle.dispatchClose()

    assertFailsWith<IllegalStateException> { handle.dispatchStore(Person("x")) }
    assertFailsWith<IllegalStateException> { handle.dispatchClear() }
    assertFailsWith<IllegalStateException> { handle.dispatchFetch() }
  }

  @Test
  fun collectionHandle_readOnlyCantWrite() = runTest {
    val readOnlyHandle = managerImpl.createHandle(
      HandleSpec(
        READ_ONLY_HANDLE,
        HandleMode.Read,
        COLLECTION_TYPE,
        Person
      ),
      STORAGE_KEY
    )

    assertThat(readOnlyHandle).isInstanceOf(ReadCollectionHandle::class.java)
    assertThat(readOnlyHandle).isNotInstanceOf(WriteCollectionHandle::class.java)
    assertThat(readOnlyHandle).isNotInstanceOf(ReadWriteCollectionHandle::class.java)
  }

  @Test
  fun collectionHandle_writeOnlyCantRead() = runTest {
    val writeOnlyHandle = managerImpl.createHandle(
      HandleSpec(
        WRITE_ONLY_HANDLE,
        HandleMode.Write,
        COLLECTION_TYPE,
        Person
      ),
      STORAGE_KEY
    )

    assertThat(writeOnlyHandle).isInstanceOf(WriteCollectionHandle::class.java)
    assertThat(writeOnlyHandle).isNotInstanceOf(ReadCollectionHandle::class.java)
    assertThat(writeOnlyHandle).isNotInstanceOf(ReadWriteCollectionHandle::class.java)
  }

  @Test
  fun collection_noOpsAfterClose() = runTest {
    val handle = createHandle(
      mode = HandleMode.ReadWriteQuery,
      type = COLLECTION_TYPE
    ) as ReadWriteQueryCollectionHandle<Person, PersonSlice, Any>
    val testPerson = Person("test")
    val otherPerson = Person("other")

    handle.dispatchStore(testPerson)
    handle.dispatchClose()

    assertFailsWith<IllegalStateException> { handle.dispatchStore(otherPerson) }
    assertFailsWith<IllegalStateException> { handle.dispatchRemove(testPerson) }
    assertFailsWith<IllegalStateException> { handle.dispatchClear() }
    assertFailsWith<IllegalStateException> { handle.dispatchFetchAll() }
    assertFailsWith<IllegalStateException> { handle.dispatchSize() }
    assertFailsWith<IllegalStateException> { handle.dispatchIsEmpty() }
    assertFailsWith<IllegalStateException> { handle.dispatchQuery("other") }
  }

  @Test
  fun handleName_isGloballyUnique() = runTest {
    val singletonHandle1 = createHandle(type = SINGLETON_TYPE, storageKey = STORAGE_KEY)
    val collectionHandle1 = createHandle(type = COLLECTION_TYPE, storageKey = STORAGE_KEY_2)
    val singletonHandle2 = createHandle(type = SINGLETON_TYPE, storageKey = STORAGE_KEY)
    val collectionHandle2 = createHandle(type = COLLECTION_TYPE, storageKey = STORAGE_KEY_2)

    assertThat(singletonHandle1.name).isNotEqualTo(singletonHandle2.name)
    assertThat(collectionHandle1.name).isNotEqualTo(collectionHandle2.name)
    assertThat(singletonHandle1.name).isNotEqualTo(collectionHandle1.name)
    assertThat(singletonHandle2.name).isNotEqualTo(collectionHandle2.name)
  }

  @Test
  fun proxiesAreReusedForSameStorageKey() = runTest {
    createHandle()
    createHandle()

    assertThat(managerImpl.allStorageProxies()).hasSize(1)
  }

  @Test
  fun proxiesAreNotReusedForDifferentStorageKey() = runTest {
    createHandle(storageKey = STORAGE_KEY)
    createHandle(storageKey = STORAGE_KEY_2)

    assertThat(managerImpl.allStorageProxies()).hasSize(2)
  }

  @Test
  fun cannotReuseStorageKeyForDifferentTypes() = runTest {
    createHandle(type = COLLECTION_TYPE, storageKey = STORAGE_KEY)

    val exception = assertFailsWith<IllegalStateException> {
      createHandle(type = SINGLETON_TYPE, storageKey = STORAGE_KEY)
    }
    assertThat(exception).hasMessageThat().isEqualTo(
      "Storage key is already being used for a collection, it cannot be reused for a singleton."
    )
  }

  @Test
  fun referenceHandle_referenceModeStorageKey_throws() = runTest {
    assertIllegalArgumentException(
      "Reference-mode storage keys are not supported for reference-typed handles."
    ) {
      createHandle(type = CollectionType(ReferenceType(EntityType(Person.SCHEMA))))
    }
  }

  @Test
  fun referenceHandle_notReferenceModeStorageKey_succeeds() = runTest {
    val handle = createHandle(
      type = CollectionType(ReferenceType(EntityType(Person.SCHEMA))),
      storageKey = RamDiskStorageKey("refs")
    )
    assertThat(handle).isInstanceOf(ReadCollectionHandle::class.java)
  }

  @Test
  fun createHandle_handleName_withActor_flagFlipped() = runTest {
    assume().that(BuildFlags.STORAGE_STRING_REDUCTION).isTrue()

    val handle = managerImpl.createHandle(
      spec = HandleSpec(
        WRITE_ONLY_HANDLE,
        HandleMode.Write,
        SINGLETON_TYPE,
        Person
      ),
      storageKey = STORAGE_KEY,
      actor = "b"
    )
    assertThat(handle.name).isEqualTo("b")
  }

  @Test
  fun createHandle_handleName_withActor() = runTest {
    assume().that(BuildFlags.STORAGE_STRING_REDUCTION).isFalse()

    val handle = managerImpl.createHandle(
      spec = HandleSpec(
        WRITE_ONLY_HANDLE,
        HandleMode.Write,
        SINGLETON_TYPE,
        Person
      ),
      storageKey = STORAGE_KEY,
      actor = "b"
    )
    assertThat(handle.name.toId().idTree).contains(WRITE_ONLY_HANDLE + "1")
  }

  @Test
  fun createHandle_handleName_withoutActor() = runTest {
    val handle = managerImpl.createHandle(
      spec = HandleSpec(
        WRITE_ONLY_HANDLE,
        HandleMode.Write,
        SINGLETON_TYPE,
        Person
      ),
      storageKey = STORAGE_KEY
    )
    assertThat(handle.name.toId().idTree).contains(WRITE_ONLY_HANDLE + "1")
  }

  @Test
  fun createHandle_handleName_withPipeInActor_Fails() = runTest {
    assume().that(BuildFlags.STORAGE_STRING_REDUCTION).isTrue()

    val e = assertFailsWith<IllegalArgumentException> {
      managerImpl.createHandle(
        spec = HandleSpec(
          WRITE_ONLY_HANDLE,
          HandleMode.Write,
          SINGLETON_TYPE,
          Person
        ),
        storageKey = STORAGE_KEY,
        actor = "b|b"
      )
    }
    assertThat(e)
      .hasMessageThat()
      .isEqualTo("Handle name b|b contains illegal char in set [{, }, ;, |].")
  }

  @Test
  fun createHandle_handleName_withSemiColonInActor_Fails() = runTest {
    assume().that(BuildFlags.STORAGE_STRING_REDUCTION).isTrue()

    val e = assertFailsWith<IllegalArgumentException> {
      managerImpl.createHandle(
        spec = HandleSpec(
          WRITE_ONLY_HANDLE,
          HandleMode.Write,
          SINGLETON_TYPE,
          Person
        ),
        storageKey = STORAGE_KEY,
        actor = "b;b;"
      )
    }
    assertThat(e)
      .hasMessageThat()
      .isEqualTo("Handle name b;b; contains illegal char in set [{, }, ;, |].")
  }

  private suspend fun createHandle(
    name: String = READ_ONLY_HANDLE,
    mode: HandleMode = HandleMode.Read,
    type: Type = SINGLETON_TYPE,
    spec: EntitySpec<*> = Person,
    storageKey: StorageKey = STORAGE_KEY
  ): Handle {
    return managerImpl.createHandle(
      HandleSpec(
        name,
        mode,
        type,
        spec
      ),
      storageKey
    )
  }

  private suspend fun assertIllegalArgumentException(message: String, block: suspend () -> Unit) {
    val exception = assertFailsWith<IllegalArgumentException> { block() }
    assertThat(exception).hasMessageThat().isEqualTo(message)
  }

  private companion object {
    @get:JvmStatic
    @get:Parameterized.Parameters(name = "{0}")
    val PARAMETERS = ParameterizedBuildFlags.of("STORAGE_STRING_REDUCTION")

    private const val READ_ONLY_HANDLE = "readOnlyHandle"
    private const val WRITE_ONLY_HANDLE = "writeOnlyHandle"

    private val STORAGE_KEY = ReferenceModeStorageKey(
      backingKey = RamDiskStorageKey("backing"),
      storageKey = RamDiskStorageKey("entity")
    )
    private val STORAGE_KEY_2 = ReferenceModeStorageKey(
      backingKey = RamDiskStorageKey("backing2"),
      storageKey = RamDiskStorageKey("entity2")
    )

    private val SINGLETON_TYPE = SingletonType(EntityType(Person.SCHEMA))
    private val COLLECTION_TYPE = CollectionType(EntityType(Person.SCHEMA))
  }
}
