package arcs.android.host

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.SingletonType
import arcs.core.entity.CollectionDelta
import arcs.core.entity.ForeignReferenceCheckerImpl
import arcs.core.entity.Handle
import arcs.core.entity.HandleSpec
import arcs.core.entity.ReadCollectionHandle
import arcs.core.entity.ReadSingletonHandle
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.ReadWriteQueryCollectionHandle
import arcs.core.entity.ReadWriteSingletonHandle
import arcs.core.entity.SingletonDelta
import arcs.core.entity.WriteCollectionHandle
import arcs.core.entity.WriteSingletonHandle
import arcs.core.entity.awaitReady
import arcs.core.host.HandleManagerImpl
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.testutil.handles.dispatchFetch
import arcs.core.testutil.handles.dispatchFetchAll
import arcs.core.testutil.handles.dispatchQuery
import arcs.core.testutil.handles.dispatchStore
import arcs.core.util.testutil.LogRule
import arcs.jvm.util.testutil.FakeTime
import arcs.sdk.android.storage.AndroidStorageServiceEndpointManager
import arcs.sdk.android.storage.service.testutil.TestBindHelper
import com.google.common.truth.Truth.assertThat
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine
import kotlin.test.assertFailsWith
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

// Generated from ./javatests/arcs/android/host/test.arcs
private typealias Person = AbstractTestParticle.TestParticleInternal1
private typealias PersonWithQuery = AbstractTestParticle.TestParticleInternal2

fun Person.withQuery(): PersonWithQuery {
  // TODO(cypher1): Remove this when implicit casting to super types is supported by code gen.
  return PersonWithQuery(name = this.name, age = this.age, is_cool = this.is_cool)
}

@Suppress("EXPERIMENTAL_API_USAGE", "UNCHECKED_CAST")
@RunWith(AndroidJUnit4::class)
class AndroidHandleManagerImplTest {
  @get:Rule
  val log = LogRule()

  private lateinit var app: Application

  val entity1 = Person("Jason", 21.0, false)
  val entity2 = Person("Jason", 22.0, true)
  private lateinit var handleHolder: AbstractTestParticle.Handles
  private lateinit var handleManagerImpl: HandleManagerImpl

  private val singletonKey = ReferenceModeStorageKey(
    backingKey = RamDiskStorageKey("single-back"), storageKey = RamDiskStorageKey("single-ent")
  )

  private val collectionKey = ReferenceModeStorageKey(
    backingKey = RamDiskStorageKey("collection-back"),
    storageKey = RamDiskStorageKey("collection-ent")
  )

  private val schedulerProvider = SimpleSchedulerProvider(Dispatchers.Default)

  @Before
  fun setUp() = runBlockingTest {
    RamDisk.clear()
    DriverAndKeyConfigurator.configure(null)
    app = ApplicationProvider.getApplicationContext()

    // Initialize WorkManager for instrumentation tests.
    WorkManagerTestInitHelper.initializeTestWorkManager(app)

    handleHolder = AbstractTestParticle.Handles()

    val endpointManager = AndroidStorageServiceEndpointManager(
      CoroutineScope(Dispatchers.Default),
      TestBindHelper(app)
    )

    handleManagerImpl = HandleManagerImpl(
      arcId = "testArc",
      hostId = "testHost",
      time = FakeTime(),
      scheduler = schedulerProvider("testArc"),
      storageEndpointManager = endpointManager,
      foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
    )
  }

  private fun expectHandleException(handleName: String, block: () -> Unit) {
    val e = assertFailsWith<NoSuchElementException>(block = block)
    assertThat(e).hasMessageThat().isEqualTo(
      "Handle $handleName has not been initialized in TestParticle yet."
    )
  }

  @Test
  fun handle_uninitializedThrowsException() = runBlocking {
    expectHandleException("writeHandle") {
      handleHolder.writeHandle
    }

    expectHandleException("readHandle") {
      handleHolder.readHandle
    }

    expectHandleException("readWriteHandle") {
      handleHolder.readWriteHandle
    }

    expectHandleException("readCollectionHandle") {
      handleHolder.readCollectionHandle
    }

    expectHandleException("writeCollectionHandle") {
      handleHolder.writeCollectionHandle
    }

    expectHandleException("queryCollectionHandle") {
      handleHolder.queryCollectionHandle
    }

    expectHandleException("readWriteCollectionHandle") {
      handleHolder.readWriteCollectionHandle
    }

    expectHandleException("readQueryCollectionHandle") {
      handleHolder.readQueryCollectionHandle
    }

    expectHandleException("writeQueryCollectionHandle") {
      handleHolder.writeQueryCollectionHandle
    }

    expectHandleException("readWriteQueryCollectionHandle") {
      handleHolder.readWriteQueryCollectionHandle
    }
  }

  @Test
  fun singletonHandle_writeInOnSyncNoDesync() = runBlocking {
    val writeHandle = createSingletonHandle(
      handleManagerImpl,
      "writeHandle",
      HandleMode.Write
    )

    // Wait for sync
    val deferred = CompletableDeferred<Unit>()
    writeHandle.onReady {
      deferred.complete(Unit)
    }
    deferred.await()

    handleHolder.writeHandle.dispatchStore(entity1)
    handleHolder.writeHandle.dispatchStore(entity2)
  }

  @Test
  fun singletonHandle_writeFollowedByReadWithOnUpdate() = runBlocking {
    val writeHandle = createSingletonHandle(
      handleManagerImpl,
      "writeHandle",
      HandleMode.Write
    )

    assertThat(writeHandle).isInstanceOf(WriteSingletonHandle::class.java)
    handleHolder.writeHandle.dispatchStore(entity1)

    val readHandle = createSingletonHandle(
      handleManagerImpl,
      "readHandle",
      HandleMode.Read
    )

    assertThat(readHandle).isInstanceOf(ReadSingletonHandle::class.java)

    assertThat(handleHolder.readHandle.dispatchFetch()).isEqualTo(entity1)

    val readWriteHandle = createSingletonHandle(
      handleManagerImpl,
      "readWriteHandle",
      HandleMode.ReadWrite
    )
    assertThat(readWriteHandle).isInstanceOf(ReadWriteSingletonHandle::class.java)

    assertThat(handleHolder.readWriteHandle.dispatchFetch()).isEqualTo(entity1)

    val updatedEntity: SingletonDelta<Person> = suspendCoroutine { continuation ->
      // Verify callbacks work
      launch {
        handleHolder.readWriteHandle.onUpdate {
          continuation.resume(it)
        }
        handleHolder.writeHandle.dispatchStore(entity2)
      }
    }

    assertThat(updatedEntity).isEqualTo(SingletonDelta(old = entity1, new = entity2))
  }

  @Test
  fun collectionHandle_writeFollowedByReadWithOnUpdate() = runBlocking<Unit> {
    val writeCollectionHandle = createCollectionHandle(
      handleManagerImpl,
      "writeCollectionHandle",
      HandleMode.Write
    )

    assertThat(writeCollectionHandle).isInstanceOf(WriteCollectionHandle::class.java)

    handleHolder.writeCollectionHandle.dispatchStore(entity1)
    handleHolder.writeCollectionHandle.dispatchStore(entity2)

    val readCollectionHandle = createCollectionHandle(
      handleManagerImpl,
      "readCollectionHandle",
      HandleMode.Read
    )

    assertThat(readCollectionHandle).isInstanceOf(ReadCollectionHandle::class.java)

    assertThat(handleHolder.readCollectionHandle.dispatchFetchAll())
      .containsExactly(entity1, entity2)

    val readWriteCollectionHandle = createCollectionHandle(
      handleManagerImpl,
      "readWriteCollectionHandle",
      HandleMode.ReadWrite
    )

    assertThat(readWriteCollectionHandle).isInstanceOf(ReadWriteCollectionHandle::class.java)

    assertThat(handleHolder.readWriteCollectionHandle.dispatchFetchAll())
      .containsExactly(entity1, entity2)

    val entity3 = entity2.copy(name = "Ray")

    val updatedEntities: CollectionDelta<Person> = suspendCoroutine { continuation ->
      // Verify callbacks work
      launch {
        handleHolder.readWriteCollectionHandle.onUpdate {
          continuation.resume(it)
        }
        handleHolder.writeCollectionHandle.dispatchStore(entity3)
      }
    }
    assertThat(updatedEntities).isEqualTo(CollectionDelta(added = setOf(entity3)))
  }

  @Test
  fun collectionHandle_writeFollowedByQuery() = runBlocking<Unit> {
    val readWriteQueryCollectionHandle = createCollectionHandle(
      handleManagerImpl,
      "readWriteQueryCollectionHandle",
      HandleMode.ReadWriteQuery
    ) as ReadWriteQueryCollectionHandle<PersonWithQuery, Double>

    assertThat(readWriteQueryCollectionHandle)
      .isInstanceOf(ReadWriteQueryCollectionHandle::class.java)

    readWriteQueryCollectionHandle.dispatchStore(entity1.withQuery(), entity2.withQuery())

    assertThat(readWriteQueryCollectionHandle.dispatchQuery(21.5).map { it.toString() })
      .containsExactly(entity2.withQuery().toString())

    assertThat(readWriteQueryCollectionHandle.dispatchQuery(0.0).map { it.toString() })
      .containsExactly(
        entity1.withQuery().toString(),
        entity2.withQuery().toString()
      )

    assertThat(readWriteQueryCollectionHandle.dispatchQuery(30.0)).isEmpty()

    assertThat(readWriteQueryCollectionHandle.dispatchFetchAll().map { it.toString() })
      .containsExactly(
        entity1.withQuery().toString(),
        entity2.withQuery().toString()
      )
  }

  @Test
  fun handle_nameIsGloballyUnique() = runBlocking {
    val shandle1 = createSingletonHandle(
      handleManagerImpl,
      "writeHandle",
      HandleMode.Write
    )

    val chandle1 = createCollectionHandle(
      handleManagerImpl,
      "writeCollectionHandle",
      HandleMode.Write
    )

    handleHolder.reset()

    val shandle2 = createSingletonHandle(
      handleManagerImpl,
      "writeHandle",
      HandleMode.Write
    )

    val chandle2 = createCollectionHandle(
      handleManagerImpl,
      "writeCollectionHandle",
      HandleMode.Write
    )

    assertThat(shandle1.name).isNotEqualTo(shandle2.name)
    assertThat(chandle1.name).isNotEqualTo(chandle2.name)
  }

  private suspend fun createSingletonHandle(
    handleManagerImpl: HandleManagerImpl,
    handleName: String,
    handleMode: HandleMode
  ): Handle {
    val entitySpec = handleHolder.getEntitySpecs(handleName).single()
    return handleManagerImpl.createHandle(
      HandleSpec(
        handleName,
        handleMode,
        SingletonType(EntityType(entitySpec.SCHEMA)),
        entitySpec
      ),
      singletonKey
    ).awaitReady().also {
      handleHolder.setHandle(handleName, it)
    }
  }

  private suspend fun createCollectionHandle(
    handleManagerImpl: HandleManagerImpl,
    handleName: String,
    handleMode: HandleMode
  ): Handle {
    val entitySpec = handleHolder.getEntitySpecs(handleName).single()
    return handleManagerImpl.createHandle(
      HandleSpec(
        handleName,
        handleMode,
        CollectionType(EntityType(entitySpec.SCHEMA)),
        entitySpec
      ),
      collectionKey
    ).awaitReady().also {
      handleHolder.setHandle(handleName, it)
    }
  }
}
