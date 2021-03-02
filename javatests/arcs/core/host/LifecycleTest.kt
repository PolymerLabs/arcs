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

import arcs.core.allocator.Allocator
import arcs.core.entity.ForeignReferenceCheckerImpl
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.core.testutil.assertVariableOrdering
import arcs.core.testutil.group
import arcs.core.testutil.handles.dispatchClear
import arcs.core.testutil.handles.dispatchRemove
import arcs.core.testutil.handles.dispatchStore
import arcs.core.testutil.runTest
import arcs.core.testutil.sequence
import arcs.core.util.Scheduler
import arcs.core.util.TaggedTimeoutException
import arcs.core.util.testutil.LogRule
import arcs.jvm.host.ExplicitHostRegistry
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlin.coroutines.EmptyCoroutineContext
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.TestCoroutineScope
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

// TODO: test desync/resync

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class LifecycleTest {
  @get:Rule
  val log = LogRule()

  private lateinit var schedulerProvider: SchedulerProvider
  private lateinit var scheduler: Scheduler
  private lateinit var testHost: TestingHost
  private lateinit var hostRegistry: HostRegistry
  private lateinit var handleManagerFactory: HandleManagerFactory
  private lateinit var handleManagerImpl: HandleManagerImpl
  private lateinit var allocator: Allocator

  private val testScope = TestCoroutineScope()

  @Before
  fun setUp() = runBlocking {
    RamDisk.clear()
    DriverAndKeyConfigurator.configure(null)
    schedulerProvider = SimpleSchedulerProvider(EmptyCoroutineContext)
    scheduler = schedulerProvider("test")
    handleManagerFactory = HandleManagerFactory(
      schedulerProvider,
      testStorageEndpointManager(),
      platformTime = FakeTime()
    )
    testHost = TestingHost(
      handleManagerFactory,
      ::SingleReadHandleParticle.toRegistration(),
      ::SingleWriteHandleParticle.toRegistration(),
      ::MultiHandleParticle.toRegistration(),
      ::PausingParticle.toRegistration(),
      ::ReadWriteAccessParticle.toRegistration(),
      ::PipelineProducerParticle.toRegistration(),
      ::PipelineTransportParticle.toRegistration(),
      ::PipelineConsumerParticle.toRegistration(),
      ::UpdateDeltasParticle.toRegistration(),
      ::FailingReadParticle.toRegistration(),
      ::FailingWriteParticle.toRegistration(),
      ::StartupTimeoutParticle.toRegistration()
    )
    hostRegistry = ExplicitHostRegistry().also { it.registerHost(testHost) }
    handleManagerImpl = HandleManagerImpl(
      time = FakeTime(),
      scheduler = scheduler,
      storageEndpointManager = testStorageEndpointManager(),
      foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
    )
    allocator = Allocator.create(hostRegistry, handleManagerImpl, testScope)
    testHost.setup()
  }

  @After
  fun tearDown() = runBlocking {
    try {
      scheduler.waitForIdle()
      handleManagerImpl.close()
    } finally {
      schedulerProvider.cancelAll()
    }
  }

  // Tests the lifecycle of a particle reading from a read-only handle.
  // The particle just records lifecycle method calls in the `events` field.
  //
  //  particle SingleReadHandleParticle in '.SingleReadHandleParticle'
  //    data: reads Data {num: Number}
  //
  //  recipe SingleReadHandleTest
  //    SingleReadHandleParticle
  //      data: reads h1
  @Test
  fun singleReadHandle() = runTest {
    val name = "SingleReadHandleParticle"
    val arc = allocator.startArcForPlan(SingleReadHandleTestPlan).waitForStart()
    val particle: SingleReadHandleParticle = testHost.getParticle(arc.id, name)
    val data = testHost.singletonForTest<SingleReadHandleParticle_Data>(arc.id, name, "data")

    data.dispatchStore(SingleReadHandleParticle_Data(5.0))
    arc.stop()
    arc.waitForStop()

    assertThat(particle.events).isEqualTo(
      listOf(
        "onFirstStart",
        "onStart",
        "data.onReady:null",
        "onReady:null",
        "data.onUpdate:5.0",
        "onUpdate:5.0",
        "onShutdown"
      )
    )
  }

  // Tests the lifecycle of a particle writing to a write-only handle.
  // The particle just records lifecycle method calls in the `events` field.
  //
  //  particle SingleWriteHandleParticle in '.SingleWriteHandleParticle'
  //    data: writes Data {num: Number}
  //
  //  recipe SingleWriteHandleTest
  //    SingleWriteHandleParticle
  //      data: writes h1
  @Test
  fun singleWriteHandle() = runTest {
    val name = "SingleWriteHandleParticle"
    val arc = allocator.startArcForPlan(SingleWriteHandleTestPlan).waitForStart()
    val particle: SingleWriteHandleParticle = testHost.getParticle(arc.id, name)
    val data = testHost.singletonForTest<SingleWriteHandleParticle_Data>(arc.id, name, "data")

    data.dispatchStore(SingleWriteHandleParticle_Data(12.0))
    arc.stop()
    arc.waitForStop()

    assertThat(particle.events)
      .isEqualTo(listOf("onFirstStart", "onStart", "onReady", "onShutdown"))
  }

  // Tests the lifecycle of a particle with multiple handles with various read/write modes.
  // The particle just records lifecycle method calls in the `events` field.
  //
  //  particle MultiHandleParticle in '.MultiHandleParticle'
  //    data: reads Data {num: Number}
  //    list: reads writes [List {txt: Text}]
  //    result: writes [Result {idx: Number}]
  //    config: reads Config {flg: Boolean}
  //
  //  recipe MultiHandleTest
  //    MultiHandleParticle
  //      data: reads h1
  //      list: reads writes h2
  //      result: writes h3
  //      config: reads h4
  @Test
  fun multiHandle() = runTest {
    val name = "MultiHandleParticle"
    val arc = allocator.startArcForPlan(MultiHandleTestPlan).waitForStart()
    val particle: MultiHandleParticle = testHost.getParticle(arc.id, name)
    val data = testHost.singletonForTest<MultiHandleParticle_Data>(arc.id, name, "data")
    val list = testHost.collectionForTest<MultiHandleParticle_List>(arc.id, name, "list")
    val result = testHost.collectionForTest<MultiHandleParticle_Result>(arc.id, name, "result")
    val config = testHost.singletonForTest<MultiHandleParticle_Config>(arc.id, name, "config")

    data.dispatchStore(MultiHandleParticle_Data(3.2))
    list.dispatchStore(MultiHandleParticle_List("hi"))
    // Write-only handle ops do not trigger any lifecycle APIs.
    result.dispatchStore(MultiHandleParticle_Result(19.0))
    config.dispatchStore(MultiHandleParticle_Config(true))
    arc.stop()
    arc.waitForStop()

    assertVariableOrdering(
      particle.events,
      sequence(
        sequence("onFirstStart", "onStart"),
        // Handle onReady events are not guaranteed to be in any specific order.
        group("data.onReady:null", "list.onReady:[]", "config.onReady:null"),
        sequence(
          "onReady:null:[]:null",
          "data.onUpdate:3.2",
          "onUpdate:3.2:[]:null",
          "list.onUpdate:[hi]",
          "onUpdate:3.2:[hi]:null",
          "config.onUpdate:true",
          "onUpdate:3.2:[hi]:true",
          "onShutdown"
        )
      )
    )
  }

  // Tests lifecycle sequence (and local data persistence) after pausing an arc.
  // The particle just records lifecycle method calls in the `events` field.
  //
  //  particle PausingParticle in '.PausingParticle'
  //    data: reads Data {num: Number}
  //    list: reads [List {txt: Text}]
  //
  //  recipe PausingTest
  //    PausingParticle
  //      data: reads h1
  //      list: reads h2
  @Test
  fun pausing() = runTest {
    val name = "PausingParticle"
    val arc = allocator.startArcForPlan(PausingTestPlan).waitForStart()

    // Test handles use the same storage proxies as the real handles which will be closed
    // when the arc is paused, so we need to re-create them after unpausing.
    // TODO: allow test handles to persist across arc shutdown?
    val makeHandles = suspend {
      Pair(
        testHost.singletonForTest<PausingParticle_Data>(arc.id, name, "data"),
        testHost.collectionForTest<PausingParticle_List>(arc.id, name, "list")
      )
    }
    val (data1, list1) = makeHandles()
    data1.dispatchStore(PausingParticle_Data(1.1))
    list1.dispatchStore(PausingParticle_List("first"))

    testHost.pause()
    assertThat(arc.arcState).isEqualTo(ArcState.Stopped)
    testHost.unpause()

    val particle: PausingParticle = testHost.getParticle(arc.id, name)
    val (data2, list2) = makeHandles()
    data2.dispatchStore(PausingParticle_Data(2.2))
    list2.dispatchStore(PausingParticle_List("second"))
    arc.stop()
    arc.waitForStop()

    assertVariableOrdering(
      particle.events,
      sequence(
        // No onFirstStart.
        sequence("onStart"),
        // Values stored in the previous session should still be present.
        group("data.onReady:1.1", "list.onReady:[first]"),
        sequence(
          "onReady:1.1:[first]",
          "data.onUpdate:2.2",
          "onUpdate:2.2:[first]",
          "list.onUpdate:[first, second]",
          "onUpdate:2.2:[first, second]",
          "onShutdown"
        )
      )
    )
  }

  // Tests that read and write ops succeed or fail appropriately.
  // The particle checks all read/write APIs at all stages of the lifecycle.
  //
  //  particle ReadWriteAccessParticle in '.ReadWriteAccessParticle'
  //    sngRead: reads Value {txt: Text}
  //    sngWrite: writes Value {txt: Text}
  //    sngReadWrite: reads writes Value {txt: Text}
  //    colRead: reads [Value {txt: Text}]
  //    colWrite: writes [Value {txt: Text}]
  //    colReadWrite: reads writes [Value {txt: Text}]
  //    sngPersist: reads writes Value {txt: Text}
  //    colPersist: reads writes [Value {txt: Text}]
  //
  //  recipe ReadWriteAccessTest
  //    ReadWriteAccessParticle
  //      sngRead: reads h1
  //      sngWrite: writes h1
  //      sngReadWrite: reads writes h1
  //      colRead: reads h2
  //      colWrite: writes h2
  //      colReadWrite: reads writes h2
  //      sngPersist: reads writes h3
  //      colPersist: reads writes h4
  @Test
  fun readWriteAccess() = runTest {
    val name = "ReadWriteAccessParticle"
    val arc = allocator.startArcForPlan(ReadWriteAccessTestPlan).waitForStart()
    val particle: ReadWriteAccessParticle = testHost.getParticle(arc.id, name)
    assertThat(particle.errors).isEmpty()
  }

  // Tests that the lifecycle methods sequence correctly across a 3-particle pipeline.
  //
  //  particle PipelineProducerParticle in '.PipelineProducerParticle'
  //    sngWrite: writes Value {txt: Text}
  //    colWrite: writes [Value {txt: Text}]
  //
  //  particle PipelineTransportParticle in '.PipelineTransportParticle'
  //    sngRead: reads Value {txt: Text}
  //    sngWrite: writes Value {txt: Text}
  //    colRead: reads [Value {txt: Text}]
  //    colWrite: writes [Value {txt: Text}]
  //
  //  particle PipelineConsumerParticle in '.PipelineConsumerParticle'
  //    sngRead: reads Value {txt: Text}
  //    colRead: reads [Value {txt: Text}]
  //
  //  recipe PipelineTest
  //    PipelineProducerParticle
  //      sngWrite: writes s1
  //      colWrite: writes c1
  //    PipelineTransportParticle
  //      sngRead: reads s1
  //      sngWrite: writes s2
  //      colRead: reads c1
  //      colWrite: writes c2
  //    PipelineConsumerParticle
  //      sngRead: reads s2
  //      colRead: reads c2
  @Test
  fun pipeline() = runTest {
    val name = "PipelineConsumerParticle"
    val arc = allocator.startArcForPlan(PipelineTestPlan).waitForStart()
    val particle: PipelineConsumerParticle = testHost.getParticle(arc.id, name)
    arc.stop()
    arc.waitForStop()
    assertThat(particle.values).containsExactly("sng_mod", "[col_mod]")
  }

  // Tests that the onUpdate method receives deltas for the handle data.
  // The particle reports received values for the handle data in the `events` field.
  //
  //  particle UpdateDeltasParticle in '.UpdateDeltasParticle'
  //    sng: reads Data {num: Int}
  //    col: reads [Data {num: Int}]
  //
  //  recipe UpdateDeltasTest
  //    UpdateDeltasParticle
  //      sng: reads h1
  //      col: reads h2
  @Test
  fun updateDeltas() = runTest {
    val name = "UpdateDeltasParticle"
    val arc = allocator.startArcForPlan(UpdateDeltasTestPlan).waitForStart()
    val particle: UpdateDeltasParticle = testHost.getParticle(arc.id, name)
    val sng = testHost.singletonForTest<UpdateDeltasParticle_Sng>(arc.id, name, "sng")
    val col = testHost.collectionForTest<UpdateDeltasParticle_Col>(arc.id, name, "col")

    sng.dispatchStore(UpdateDeltasParticle_Sng(1))
    val two = UpdateDeltasParticle_Sng(2)
    sng.dispatchStore(two)
    sng.dispatchStore(two)
    sng.dispatchClear()
    sng.dispatchClear()

    val four = UpdateDeltasParticle_Col(4)
    val five = UpdateDeltasParticle_Col(5)
    col.dispatchStore(UpdateDeltasParticle_Col(3), four, five)
    col.dispatchRemove(four)
    col.dispatchStore(UpdateDeltasParticle_Col(6), five)
    col.dispatchClear()

    arc.stop()
    arc.waitForStop()

    assertThat(particle.events).isEqualTo(
      listOf(
        "sng:null:1",
        "sng:1:2",
        "sng:2:null",
        "col:[3]:[]",
        "col:[4]:[]",
        "col:[5]:[]",
        "col:[]:[4]",
        "col:[6]:[]",
        "col:[]:[3, 5, 6]"
      )
    )
  }

  // Tests handling of exceptions thrown by lifecycle methods. The `FailingTestControl.failIn`
  // static field triggers an exception in a single method of one of the two particles.
  //
  //  particle FailingReadParticle in '.FailingReadParticle'
  //    data: reads {}
  //
  //  particle FailingWriteParticle in '.FailingWriteParticle'
  //    data: writes {}
  //
  //  recipe FailingTest
  //    FailingReadParticle
  //      data: reads h1
  //    FailingWriteParticle
  //      data: writes h2
  @Test
  fun failing_startupMethods_readParticle() = runTest {
    listOf("read.onFirstStart", "read.onStart", "read.onReady", "data.onReady").forEach { method ->
      FailingTestControl.failIn = method

      val arc = allocator.startArcForPlan(FailingTestPlan)
      val deferred = CompletableDeferred<ArcState>()
      arc.onError { deferred.complete(arc.arcState) }

      val state = deferred.await()
      assertThat(state).isEqualTo(ArcState.Error)
      assertThat(state.cause).hasMessageThat().isEqualTo("read particle failed in $method")
    }
  }

  @Test
  fun failing_startupMethods_writeParticle() = runTest {
    listOf("write.onFirstStart", "write.onStart", "write.onReady").forEach { method ->
      FailingTestControl.failIn = method

      val arc = allocator.startArcForPlan(FailingTestPlan)
      val deferred = CompletableDeferred<ArcState>()
      arc.onError { deferred.complete(arc.arcState) }

      val state = deferred.await()
      assertThat(state).isEqualTo(ArcState.Error)
      assertThat(state.cause).hasMessageThat().isEqualTo("write particle failed in $method")
    }
  }

  @Test
  fun failing_onUpdateMethods_readParticle() = runTest {
    listOf("read.onUpdate", "data.onUpdate").forEach { method ->
      FailingTestControl.failIn = method

      val arc = allocator.startArcForPlan(FailingTestPlan).waitForStart()
      val deferred = CompletableDeferred<ArcState>()
      arc.onError { deferred.complete(arc.arcState) }

      val name = "FailingReadParticle"
      val data = testHost.singletonForTest<FailingReadParticle_Data>(arc.id, name, "data")
      data.dispatchStore(FailingReadParticle_Data())

      val state = deferred.await()
      assertThat(state).isEqualTo(ArcState.Error)
      assertThat(state.cause).hasMessageThat().isEqualTo("read particle failed in $method")
    }
  }

  // Tests the error handling when a particle's stores fail to sync in time.
  // To simulate store sync failure, the particle's onReady method never returns.
  //
  //  particle StartupTimeoutParticle in '.StartupTimeoutParticle'
  //    data: reads {}
  //
  //  recipe StartupTimeoutTest
  //    StartupTimeoutParticle
  //      data: reads h1
  @Test
  fun startupTimeout() = runTest {
    // StartupTimeoutParticle never returns from onReady; set a short timeout to trip quickly.
    testHost.particleStartupTimeoutMs = 100

    val arc = allocator.startArcForPlan(StartupTimeoutTestPlan)
    val deferred = CompletableDeferred<ArcState>()
    arc.onError { deferred.complete(arc.arcState) }

    val state = deferred.await()
    assertThat(state).isEqualTo(ArcState.Error)
    assertThat(state.cause).isInstanceOf(TaggedTimeoutException::class.java)
    assertThat(state.cause).hasMessageThat().isEqualTo(
      "Timed out after 100 ms: waiting for all particles to be ready"
    )
  }
}
