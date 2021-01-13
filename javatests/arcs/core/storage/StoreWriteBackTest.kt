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

package arcs.core.storage

import arcs.core.common.ReferenceId
import arcs.core.crdt.VersionMap
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.storage.database.DatabaseClient
import arcs.core.storage.database.DatabaseData
import arcs.core.storage.driver.DatabaseDriverProvider
import arcs.core.storage.keys.DatabaseStorageKey.Persistent
import arcs.core.storage.referencemode.RefModeStoreOp
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.collectionTestStore
import arcs.core.util.testutil.LogRule
import arcs.jvm.storage.database.testutil.FakeDatabaseManager
import com.google.common.truth.Truth.assertThat
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.Executors
import kotlin.random.Random
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.cancel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class StoreWriteBackTest {
  @get:Rule
  val logRule = LogRule()

  private var hash = "123456abcdef"
  private var testKey = ReferenceModeStorageKey(
    Persistent("entities", hash),
    Persistent("set", hash)
  )
  private var schema = Schema(
    setOf(SchemaName("person")),
    SchemaFields(
      singletons = mapOf("name" to FieldType.Text, "age" to FieldType.Number),
      collections = emptyMap()
    ),
    hash
  )
  private lateinit var databaseFactory: FakeDatabaseManager
  private lateinit var random: Random
  private lateinit var writeBack: StoreWriteBack

  private val executor = Executors.newCachedThreadPool {
    Thread(it).apply { name = "WriteBack #$id" }
  }
  private val writeBackScope = CoroutineScope(
    executor.asCoroutineDispatcher() + SupervisorJob()
  )
  @Before
  fun setUp() {
    databaseFactory = FakeDatabaseManager()
    DatabaseDriverProvider.configure(databaseFactory) { schema }
    random = Random(System.currentTimeMillis())

    writeBack = StoreWriteBack(
      "testing",
      Channel.Factory.UNLIMITED,
      forceEnable = true,
      scope = writeBackScope
    )
  }

  @After
  fun tearDown() {
    writeBackScope.cancel()
    executor.shutdown()
  }

  @Test
  fun stressTest_internalDelay() = runBlocking {
    val sum = atomic(0)

    TEST_RANGE.forEach { k ->
      writeBack.asyncFlush {
        random.nextDelay()
        sum.update { it + k }
        random.nextDelay()
      }
    }

    writeBack.awaitIdle()

    assertThat(sum.value).isEqualTo(TEST_RANGE.sum())
  }

  @Test
  fun stressTest_externalDelay() = runBlocking {
    val sum = atomic(0)

    val jobs = mutableListOf<Job>()
    TEST_RANGE.forEach { k ->
      jobs.add(
        launch {
          random.nextDelay()
          writeBack.asyncFlush {
            sum.update { it + k }
          }
        }
      )
    }

    jobs.joinAll()
    writeBack.awaitIdle()

    assertThat(sum.value).isEqualTo(TEST_RANGE.sum())
  }

  @Test
  fun stressTest_internalExternalDelays() = runBlocking {
    val sum = atomic(0)

    val jobs = mutableListOf<Job>()
    TEST_RANGE.forEach { k ->
      jobs.add(
        launch {
          random.nextDelay()
          writeBack.asyncFlush {
            random.nextDelay()
            sum.update { it + k }
            random.nextDelay()
          }
        }
      )
    }

    jobs.joinAll()
    writeBack.awaitIdle()

    assertThat(sum.value).isEqualTo(TEST_RANGE.sum())
  }

  @Test
  fun orderTest_internalDelay() = runBlocking {
    val output = CopyOnWriteArrayList<Int>()

    TEST_RANGE.forEach {
      writeBack.asyncFlush {
        random.nextDelay()
        output.add(it)
        random.nextDelay()
      }
    }

    writeBack.awaitIdle()

    assertThat(output).isEqualTo(TEST_RANGE.toList())
  }

  @Test
  fun oneJobThrows_othersComplete() = runBlocking {
    val sum = atomic(0)
    TEST_RANGE.forEach { k ->
      writeBack.asyncFlush {
        if (k == 50) { throw Exception() }
        sum.update { it + k }
      }
    }
    writeBack.awaitIdle()

    assertThat(sum.value).isEqualTo(TEST_RANGE.sum() - 50)
  }

  @Test
  fun dataVersionInOrder() = runBlocking {
    val versions = arrayListOf<Int>()
    databaseFactory.addClients(
      object : DatabaseClient {
        override val storageKey = testKey.storageKey
        override suspend fun onDatabaseUpdate(
          data: DatabaseData,
          version: Int,
          originatingClientId: Int?
        ) = synchronized(versions) {
          versions.add(version)
          Unit
        }

        override suspend fun onDatabaseDelete(originatingClientId: Int?) = Unit
      }
    )

    val refModeStore = ReferenceModeStore.collectionTestStore(testKey, schema, scope = this)
    for (i in 1..NUM_OF_WRITES) {
      refModeStore.onProxyMessage(
        ProxyMessage.Operations(
          listOf(
            RefModeStoreOp.SetAdd(
              "me",
              VersionMap("me" to i),
              createEmptyPersonEntity("e$i")
            )
          ),
          id = 1
        )
      )
    }

    assertThat(versions.toList()).isEqualTo((1..NUM_OF_WRITES).toList())
  }

  @Test
  fun passThroughEnabled_completesTasksInOrder() = runBlocking {
    // Enable pass-trough with forceEnable = false and scope = null.
    val writeBack = StoreWriteBack(
      "testing",
      Channel.Factory.UNLIMITED,
      forceEnable = false,
      scope = null
    )
    val output = CopyOnWriteArrayList<Int>()
    TEST_RANGE.forEach {
      writeBack.asyncFlush {
        random.nextDelay()
        output.add(it)
        random.nextDelay()
      }
    }
    writeBack.awaitIdle()

    assertThat(output).isEqualTo(TEST_RANGE.toList())
  }

  @Test
  fun canStillSubmitJobsAfterCancelingScope() = runBlocking<Unit> {
    val output = CopyOnWriteArrayList<Int>()
    writeBack.asyncFlush { output.add(1) }
    writeBack.awaitIdle()
    writeBackScope.cancel()
    // Wait for the cancel to take effect before adding another task, or the test becomes flaky.
    delay(2000)

    writeBack.asyncFlush { output.add(3) }
    writeBack.awaitIdle()

    assertThat(output).containsExactly(1, 3)
  }

  @Test
  fun idlenessFlowTrueAfterCompletion() = runBlocking {
    val sum = atomic(0)
    TEST_RANGE.forEach { k ->
      writeBack.asyncFlush {
        sum.update { it + k }
      }
    }
    writeBack.awaitIdle()

    assertThat(writeBack.idlenessFlow.first()).isTrue()
  }

  private fun createEmptyPersonEntity(id: ReferenceId): RawEntity = RawEntity(
    id = id,
    singletons = mapOf(
      "name" to null,
      "age" to null
    )
  )

  companion object {
    private const val NUM_OF_WRITES = 25
    private val TEST_RANGE = 1..100

    private suspend fun Random.nextDelay() =
      delay(nextLong(5, 25))
  }
}
