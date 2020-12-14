package arcs.core.allocator

import arcs.core.common.toArcId
import arcs.core.data.Capability
import arcs.core.data.HandleMode
import arcs.core.data.Plan
import arcs.core.data.Schema
import arcs.core.entity.CollectionDelta
import arcs.core.entity.Entity
import arcs.core.entity.EntityBase
import arcs.core.entity.EntitySpec
import arcs.core.entity.Handle
import arcs.core.entity.HandleSpec
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.Reference
import arcs.core.host.HandleManager
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageProxy
import arcs.core.util.Log
import arcs.core.util.Scheduler
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.GlobalScope.coroutineContext
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestCoroutineDispatcher
import kotlinx.coroutines.test.TestCoroutineScope
import kotlinx.coroutines.test.runBlockingTest
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
  private lateinit var fakeHandleManager: FakeHandleManager
  private lateinit var fakeHandle: FakeHandle
  private lateinit var entityList: MutableList<EntityBase>

  private lateinit var map: CollectionHandlePartitionMap

  @Before
  fun setup() {
    testScope = TestCoroutineScope(testDispatcher)
    testScope.launch {
      fakeHandleManager = FakeHandleManager()
      fakeHandle = FakeHandle()
      map = CollectionHandlePartitionMap(fakeHandleManager)
      entityList = mutableListOf()
    }
  }

  @Test
  fun set_then_read() = testScope.runBlockingTest {
    val arcId = "testArcId".toArcId()

    val particleName1 = "testParticle1"
    val particle1 = Plan.Particle(
      particleName = particleName1,
      location = "",
      handles = emptyMap()
    )
    val particleName2 = "testParticle2"
    val particle2 = particle1.copy(particleName = particleName2)
    val particleName3 = "testParticle3"
    val particle3 = particle1.copy(particleName = particleName3)

    val arcHost1 = "testArcHost1"
    val arcHost2 = "testArcHost2"
    val partition1 = Plan.Partition(
      arcId = arcId.toString(),
      arcHost = arcHost1,
      particles = listOf(particle1)
    )
    val partition2 = partition1.copy(
      arcHost = arcHost2,
      particles = listOf(particle2, particle3)
    )

    assertThat(entityList.size).isEqualTo(0)
    map.set(listOf(partition1, partition2))
    assertThat(entityList.size).isEqualTo(2)
    val entity1 = entityList[0]
    assertThat(entity1.getSingletonValue("arc")).isEqualTo(arcId.toString())
    assertThat(entity1.getSingletonValue("host")).isEqualTo(arcHost1)
    assertThat(entity1.getCollectionValue("particles")).containsExactly(particleName1)
    val entity2 = entityList[1]
    assertThat(entity2.getSingletonValue("arc")).isEqualTo(arcId.toString())
    assertThat(entity2.getSingletonValue("host")).isEqualTo(arcHost2)
    assertThat(entity2.getCollectionValue("particles"))
      .containsExactly(particleName2, particleName3)

    val partitionList = map.readPartitions(arcId)
    assertThat(partitionList.size).isEqualTo(2)
    assertThat(partitionList).containsExactly(
      Plan.Partition(
        arcId = arcId.toString(),
        arcHost = arcHost1,
        listOf(
          Plan.Particle(
            particleName = particleName1,
            location = "",
            handles = mapOf()
          )
        )
      ),
      Plan.Partition(
        arcId = arcId.toString(),
        arcHost = arcHost2,
        listOf(
          Plan.Particle(
            particleName = particleName2,
            location = "",
            handles = mapOf()
          ),
          Plan.Particle(
            particleName = particleName3,
            location = "",
            handles = mapOf()
          )
        )
      )
    )
  }

  @Test
  fun set_then_clear() = testScope.runBlockingTest {
    val arcId = "testArcId".toArcId()
    val particleName = "testParticle"
    val particle = Plan.Particle(
      particleName = particleName,
      location = "",
      handles = emptyMap()
    )

    val arcHost = "testArcHost"
    val partition = Plan.Partition(
      arcId = arcId.toString(),
      arcHost = arcHost,
      particles = listOf(particle)
    )

    assertThat(entityList.size).isEqualTo(0)
    map.set(listOf(partition))
    assertThat(entityList.size).isEqualTo(1)

    var partitionList = map.readAndClearPartitions(arcId)
    assertThat(partitionList.size).isEqualTo(1)
    assertThat(partitionList).containsExactly(
      Plan.Partition(
        arcId = arcId.toString(),
        arcHost = arcHost,
        listOf(
          Plan.Particle(
            particleName = particleName,
            location = "",
            handles = mapOf()
          )
        )
      )
    )

    partitionList = map.readAndClearPartitions(arcId)
    assertThat(partitionList.size).isEqualTo(0)
  }

  inner class FakeHandle : ReadWriteCollectionHandle<EntityBase> {
    override val dispatcher: CoroutineDispatcher
      get() = testDispatcher
    override val name: String
      get() = TODO("Not yet implemented")
    override val mode: HandleMode
      get() = TODO("Not yet implemented")

    override fun onReady(action: () -> Unit) {
      action.invoke()
    }

    override fun close() {
      TODO("Not yet implemented")
    }

    override fun registerForStorageEvents(notify: (StorageProxy.StorageEvent) -> Unit) {
      TODO("Not yet implemented")
    }

    override fun unregisterForStorageEvents() {
      TODO("Not yet implemented")
    }

    override fun maybeInitiateSync() {
      TODO("Not yet implemented")
    }

    override fun getProxy(): StorageProxy<*, *, *> {
      TODO("Not yet implemented")
    }

    override suspend fun <E : Entity> createForeignReference(
      spec: EntitySpec<E>,
      id: String
    ): Reference<E>? {
      TODO("Not yet implemented")
    }

    override fun onUpdate(action: (CollectionDelta<EntityBase>) -> Unit) {
      TODO("Not yet implemented")
    }

    override fun onDesync(action: () -> Unit) {
      TODO("Not yet implemented")
    }

    override fun onResync(action: () -> Unit) {
      TODO("Not yet implemented")
    }

    override suspend fun <E : Entity> createReference(entity: E): Reference<E> {
      TODO("Not yet implemented")
    }

    override fun size(): Int {
      TODO("Not yet implemented")
    }

    override fun isEmpty(): Boolean {
      TODO("Not yet implemented")
    }

    override fun fetchAll(): Set<EntityBase> {
      return entityList.toSet()
    }

    override fun fetchById(entityId: String): EntityBase? {
      TODO("Not yet implemented")
    }

    override fun store(element: EntityBase): Job {
      return testScope.launch {
        entityList.add(element)
      }
    }

    override fun storeAll(elements: Collection<EntityBase>): Job {
      TODO("Not yet implemented")
    }

    override fun clear(): Job {
      TODO("Not yet implemented")
    }

    override fun remove(element: EntityBase): Job {
      return testScope.launch {
        entityList.remove(element)
      }
    }

    override fun removeById(id: String): Job {
      TODO("Not yet implemented")
    }
  }

  inner class FakeHandleManager : HandleManager {

    override suspend fun createHandle(
      spec: HandleSpec,
      storageKey: StorageKey,
      ttl: Capability.Ttl,
      particleId: String,
      immediateSync: Boolean,
      storeSchema: Schema?
    ): Handle {
      return fakeHandle
    }

    override fun scheduler(): Scheduler {
      return Scheduler(coroutineContext)
    }

    override suspend fun close() {
      TODO("Not yet implemented")
    }

    override suspend fun allStorageProxies(): List<StorageProxy<*, *, *>> {
      return emptyList()
    }
  }
}
