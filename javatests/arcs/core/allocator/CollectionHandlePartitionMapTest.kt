package arcs.core.allocator

import arcs.core.common.ArcId
import arcs.core.data.Plan
import arcs.core.entity.ForeignReferenceCheckerImpl
import arcs.core.host.HandleManager
import arcs.core.host.HandleManagerImpl
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.core.util.Log
import arcs.core.util.testutil.LogRule
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.GlobalScope.coroutineContext
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestCoroutineDispatcher
import kotlinx.coroutines.test.TestCoroutineScope
import kotlinx.coroutines.test.runBlockingTest
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
@Suppress("UnsafeCoroutineCrossing")
class CollectionHandlePartitionMapTest {
  @get:Rule
  val log = LogRule(Log.Level.Warning)

  private val testDispatcher = TestCoroutineDispatcher()
  private lateinit var testScope: TestCoroutineScope
  private lateinit var handleManager: HandleManager

  private lateinit var map: CollectionHandlePartitionMap

  @Before
  fun setUp() {
    testScope = TestCoroutineScope(testDispatcher)
    testScope.launch {
      handleManager = HandleManagerImpl(
        arcId = "testArc",
        hostId = "",
        time = FakeTime(),
        scheduler = SimpleSchedulerProvider(coroutineContext).invoke("test"),
        storageEndpointManager = testStorageEndpointManager(),
        foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
      )

      map = CollectionHandlePartitionMap(handleManager)
    }
  }

  @After
  fun tearDown() {
    testScope.launch {
      handleManager.close()
    }
  }

  fun createPartition(arcId: ArcId, arcHost: String, particleNames: List<String>): Plan.Partition {
    return Plan.Partition(
      arcId = arcId.toString(),
      arcHost = arcHost,
      particles = particleNames.map { Plan.Particle(it, location = "", handles = emptyMap()) }
    )
  }

  @Test
  fun readPartitions_emptyList_returnsEmpty() = testScope.runBlockingTest {
    assertThat(map.readPartitions(ArcId.newForTest("arcId"))).isEmpty()
    assertThat(map.readPartitions(ArcId.newForTest("arcId"))).isEmpty()
  }

  @Test
  fun readAndClearPartitions_emptyList_returnsEmpty() = testScope.runBlockingTest {
    assertThat(map.readAndClearPartitions(ArcId.newForTest("arcId"))).isEmpty()
    assertThat(map.readAndClearPartitions(ArcId.newForTest("arcId"))).isEmpty()
  }

  @Test
  fun set_setToEmptyList_throws() = testScope.runBlockingTest {
    assertFailsWith<NoSuchElementException> { map.set(listOf()) }
  }

  @Test
  fun set_differetArcIdsInPartition_throws() = testScope.runBlockingTest {
    val arcId = ArcId.newForTest("arcId")
    val otherArcId = ArcId.newForTest("otherArcId")
    val partition1 = createPartition(arcId, "arcHost1", listOf("particle1"))
    val partition2 = createPartition(otherArcId, "arcHost2", listOf("particle2", "particle3"))

    val e = assertFailsWith<IllegalStateException> {
      map.set(listOf(partition1, partition2))
    }
    assertThat(e).hasMessageThat().isEqualTo("All partitions must have the same Arc ID.")
  }

  @Test
  fun set_followedByRead_returnsPartitions() = testScope.runBlockingTest {
    val arcId = ArcId.newForTest("arcId")
    val partition1 = createPartition(arcId, "arcHost1", listOf("particle1"))
    val partition2 = createPartition(arcId, "arcHost2", listOf("particle2", "particle3"))
    map.set(listOf(partition1, partition2))

    assertThat(map.readPartitions(arcId)).containsExactly(partition1, partition2)
    assertThat(map.readPartitions(arcId)).containsExactly(partition1, partition2)
  }

  @Test
  fun set_followedByReadAndClear_returnsPartitionsThenEmpty() = testScope.runBlockingTest {
    val arcId = ArcId.newForTest("arcId")
    val partition1 = createPartition(arcId, "arcHost1", listOf("particle1"))
    val partition2 = createPartition(arcId, "arcHost2", listOf("particle2", "particle3"))
    map.set(listOf(partition1, partition2))

    assertThat(map.readPartitions(arcId)).containsExactly(partition1, partition2)
    assertThat(map.readAndClearPartitions(arcId)).containsExactly(partition1, partition2)

    assertThat(map.readPartitions(arcId)).isEmpty()
    assertThat(map.readAndClearPartitions(arcId)).isEmpty()
  }

  @Test
  fun set_overrideSamePartitions_readsCorrectValue() = testScope.runBlockingTest {
    val arcId = ArcId.newForTest("arcId")
    val partition1 = createPartition(arcId, "arcHost1", listOf("particle1"))
    val partition2 = createPartition(arcId, "arcHost2", listOf("particle2", "particle3"))

    map.set(listOf(partition1, partition2))
    map.set(listOf(partition1, partition2))

    assertThat(map.readPartitions(arcId)).containsExactly(partition1, partition2)
  }

  @Test
  fun set_overridesOtherPartitions_readsNewValue() = testScope.runBlockingTest {
    val arcId = ArcId.newForTest("arcId")
    val partition1 = createPartition(arcId, "arcHost1", listOf("particle1"))
    val partition2 = createPartition(arcId, "arcHost2", listOf("particle2", "particle3"))
    map.set(listOf(partition1, partition2))

    val partition3 = createPartition(arcId, "arcHost2", listOf("particle3"))
    val e = assertFailsWith<IllegalStateException> { map.set(listOf(partition3, partition1)) }
    assertThat(e).hasMessageThat().isEqualTo(
      "Unexpected plan partitions not matching existing ones."
    )
  }

  @Test
  fun set_overridesSubsetPartitions_readsNewValue() = testScope.runBlockingTest {
    val arcId = ArcId.newForTest("arcId")
    val partition1 = createPartition(arcId, "arcHost1", listOf("particle1"))
    map.set(listOf(partition1))

    val partition2 = createPartition(arcId, "arcHost2", listOf("particle2"))

    val e = assertFailsWith<IllegalStateException> {
      map.set(listOf(partition1, partition2))
    }
    assertThat(e).hasMessageThat().isEqualTo(
      "Unexpected plan partitions not matching existing ones."
    )
  }

  @Test
  fun set_overridesEmptyList_throws() = testScope.runBlockingTest {
    val arcId = ArcId.newForTest("arcId")
    map.set(
      listOf(
        createPartition(arcId, "arcHost1", listOf("particle1")),
        createPartition(arcId, "arcHost2", listOf("particle2", "particle3"))
      )
    )

    assertFailsWith<NoSuchElementException> { map.set(listOf()) }
  }

  @Test
  fun set_readDifferentArcId_returnsEmpty() = testScope.runBlockingTest {
    val arcId = ArcId.newForTest("arcId")
    map.set(listOf(createPartition(arcId, "arcHost1", listOf("particle1"))))
    val otherArcId = ArcId.newForTest("otherArcId")

    assertThat(map.readPartitions(otherArcId)).isEmpty()
  }

  @Test
  fun set_readAndClearOtherArcId_returnsCorrectPartitins() = testScope.runBlockingTest {
    val arcId = ArcId.newForTest("arcId")
    val partition0 = createPartition(arcId, "arcHost1", listOf("particle0"))
    val partition1 = createPartition(arcId, "arcHost1", listOf("particle11", "particle12"))
    map.set(listOf(partition0, partition1))
    map.readAndClearPartitions(ArcId.newForTest("otherArcId"))

    assertThat(map.readPartitions(arcId)).containsExactly(partition0, partition1)
  }

  @Test
  fun set_twoArcIds_readsCorrectPartitions() = testScope.runBlockingTest {
    val arcId1 = ArcId.newForTest("arcId1")
    val partition1_0 = createPartition(arcId1, "arcHost1", listOf("particle1_0"))
    val partition1_1 = createPartition(arcId1, "arcHost1", listOf("particle1_1", "particle1_2"))
    val arcId2 = ArcId.newForTest("arcId2")
    val partition2 = createPartition(arcId2, "arcHost2", listOf("particle2", "particle3"))
    map.set(listOf(partition1_0, partition1_1))
    map.set(listOf(partition2))

    assertThat(map.readPartitions(arcId1)).containsExactly(partition1_0, partition1_1)
    assertThat(map.readPartitions(arcId2)).containsExactly(partition2)
  }

  @Test
  fun set_twoArcIdsClearOne_readsCorrectPartitions() = testScope.runBlockingTest {
    val arcId1 = ArcId.newForTest("arcId1")
    val partition1_0 = createPartition(arcId1, "arcHost1", listOf("particle1_0"))
    val partition1_1 = createPartition(arcId1, "arcHost1", listOf("particle1_1", "particle1_2"))
    val arcId2 = ArcId.newForTest("arcId2")
    val partition2 = createPartition(arcId2, "arcHost2", listOf("particle2", "particle3"))
    map.set(listOf(partition1_0, partition1_1))
    map.set(listOf(partition2))

    map.readAndClearPartitions(arcId2)

    assertThat(map.readPartitions(arcId1)).containsExactly(partition1_0, partition1_1)
    assertThat(map.readPartitions(arcId2)).isEmpty()
  }
}
