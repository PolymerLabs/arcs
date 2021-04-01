package arcs.sdk

import arcs.core.testutil.runTest
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.CompletableDeferred
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import arcs.core.data.HandleMode
import arcs.core.entity.CollectionDelta
import arcs.core.entity.SingletonDelta
import arcs.core.entity.ReadableHandle
import arcs.core.storage.StorageProxy.StorageEvent

abstract class FakeHandle<V, U> : ReadableHandle<V, U> {
  override val name = "fakeHandle"
  override val mode = HandleMode.ReadWrite
  override val dispatcher = Dispatchers.Default

  // Handle interface
  override fun onReady(action: () -> Unit) = Unit
  override fun close() = Unit
  override fun registerForStorageEvents(notify: (StorageEvent) -> Unit) = Unit
  override fun unregisterForStorageEvents() = Unit
  override fun maybeInitiateSync() = Unit
  override fun getProxy() = throw Exception("unimplemented")
  override suspend fun <E : Entity> createForeignReference(spec: EntitySpec<E>, id: String) =
    throw Exception("unimplemented")

  // ReadableHandle interface
  override fun onUpdate(action: (U) -> Unit) = Unit
  override fun onDesync(action: () -> Unit) = Unit
  override fun onResync(action: () -> Unit) = Unit
  override suspend fun <E : Entity> createReference(entity: E) = throw Exception("unimplemented")

  // Execute a specific action and return an immediately-completed Job.
  protected fun wrap(block: () -> Unit) = CompletableDeferred(Unit).also { block() }
}

class FakeSingletonHandle : FakeHandle<EntityBase?, SingletonDelta<EntityBase>>(),
  ReadWriteSingletonHandle<EntityBase, Entity> {

  var stored: EntityBase? = null

  override fun fetch() = stored

  override fun store(element: Entity) = wrap { stored = element as EntityBase }

  override fun clear() = wrap { stored = null }
}

class FakeCollectionHandle : FakeHandle<Set<EntityBase>, CollectionDelta<EntityBase>>(),
  ReadWriteCollectionHandle<EntityBase, Entity> {

  val stored = mutableMapOf<String, EntityBase>()

  override fun size() = stored.size

  override fun isEmpty() = stored.isEmpty()

  override fun fetchAll() = stored.values.toSet()

  override fun fetchById(entityId: String) = stored.get(entityId)

  override fun store(element: Entity) = wrap {
    stored.set(requireNotNull(element.entityId), element as EntityBase)
  }

  override fun storeAll(elements: Collection<Entity>) = wrap {
    elements.forEach { stored.set(requireNotNull(it.entityId), it as EntityBase) }
  }

  override fun clear() = wrap { stored.clear() }

  override fun remove(element: Entity) = removeById(requireNotNull(element.entityId))

  override fun removeById(id: String) = wrap { stored.remove(id) }
}

typealias EdgeParticleInternal1 = EdgeParticle.EdgeParticleInternal1

/** Tests for code-generated edge particles. */
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(JUnit4::class)
class EdgeParticleTest {
  lateinit var particle: EdgeParticle
  lateinit var handles: EdgeParticle.Handles
  lateinit var backingSingleton: FakeSingletonHandle
  lateinit var backingCollection: FakeCollectionHandle

  @Before
  fun setUp() {
    particle = EdgeParticle()
    handles = particle.handles
    backingSingleton = FakeSingletonHandle().also {
      handles.setHandle("sr", it)
      handles.setHandle("sw", it)
      handles.setHandle("sb", it)
    }
    backingCollection = FakeCollectionHandle().also {
      handles.setHandle("cr", it)
      handles.setHandle("cw", it)
      handles.setHandle("cb", it)
    }
  }

  @Test
  fun singleton_verifyHandleInterfaces() = runTest {
    particle.onReady()

    // Check fetch on sr and store/clear on sw.
    handles.sw.store(EdgeParticleInternal1("abc")).join()
    assertThat(handles.sr.fetch().await()).isEqualTo(EdgeParticleInternal1("abc"))

    handles.sw.clear().join()
    assertThat(handles.sr.fetch().await()).isNull()

    // Check all three on sb.
    handles.sb.store(EdgeParticleInternal1("abc")).join()
    assertThat(handles.sb.fetch().await()).isEqualTo(EdgeParticleInternal1("abc"))

    handles.sb.clear().join()
    assertThat(handles.sb.fetch().await()).isNull()
  }

  @Test
  fun singleton_fetchBeforeAndAfterReady() = runTest {
    // Seed the handle data.
    backingSingleton.store(EdgeParticleInternal1("def"))

    // Reads before onReady should be queued to complete after onReady.
    val queuedFetches = listOf(
      handles.sr.fetch().also { assertThat(it.isCompleted).isFalse() },
      handles.sr.fetch().also { assertThat(it.isCompleted).isFalse() },
      handles.sb.fetch().also { assertThat(it.isCompleted).isFalse() }
    )

    particle.onReady()

    queuedFetches.forEach {
      assertThat(it.isCompleted).isTrue()
      assertThat(it.await()).isEqualTo(EdgeParticleInternal1("def"))
    }

    // Reads after onReady should be completed immediately.
    listOf(handles.sr.fetch(), handles.sb.fetch()).forEach {
      assertThat(it.isCompleted).isTrue()
      assertThat(it.await()).isEqualTo(EdgeParticleInternal1("def"))
    }
  }

  @Test
  fun singleton_storeBeforeReady() = runTest {
    handles.sw.store(EdgeParticleInternal1("ghi"))
    particle.onReady()
    assertThat(backingSingleton.fetch()).isEqualTo(EdgeParticleInternal1("ghi"))
  }

  @Test
  fun singleton_clearBeforeReady() = runTest {
    backingSingleton.store(EdgeParticleInternal1("jkl"))
    handles.sw.clear()
    particle.onReady()
    assertThat(backingSingleton.fetch()).isNull()
  }

  @Test
  fun singleton_deferredReadsReturnValueAsSetAtOnReady() = runTest {
    backingSingleton.store(EdgeParticleInternal1("ignored1"))

    val queuedFetch = handles.sb.fetch()
    assertThat(queuedFetch.isCompleted).isFalse()

    backingSingleton.store(EdgeParticleInternal1("mno"))

    // Queued operations should be fulfilled with the state of the handle as of now.
    particle.onReady()

    backingSingleton.store(EdgeParticleInternal1("ignored2"))

    queuedFetch.let {
      assertThat(it.isCompleted).isTrue()
      assertThat(it.await()).isEqualTo(EdgeParticleInternal1("mno"))
    }
  }

  @Test
  fun collection_verifyHandleInterfaces_readOnlyAndWriteOnly() = runTest {
    val e1 = EdgeParticleInternal1("e1", entityId = "id1")
    val e2 = EdgeParticleInternal1("e2", entityId = "id2")
    val e3 = EdgeParticleInternal1("e3", entityId = "id3")
    particle.onReady()

    handles.cw.store(e1)
    handles.cw.storeAll(listOf(e2, e3))

    assertThat(handles.cr.size().await()).isEqualTo(3)
    assertThat(handles.cr.isEmpty().await()).isFalse()
    assertThat(handles.cr.fetchAll().await()).containsExactly(e1, e2, e3)
    assertThat(handles.cr.fetchById("id2").await()).isEqualTo(e2)

    handles.cw.remove(e1)
    assertThat(handles.cr.fetchAll().await()).containsExactly(e2, e3)

    handles.cw.removeById("id3")
    assertThat(handles.cr.fetchAll().await()).containsExactly(e2)

    handles.cw.clear()
    assertThat(handles.cr.size().await()).isEqualTo(0)
    assertThat(handles.cr.isEmpty().await()).isTrue()
    assertThat(handles.cr.fetchAll().await()).isEmpty()
  }

  @Test
  fun collection_verifyHandleInterfaces_readAndWrite() = runTest {
    val e1 = EdgeParticleInternal1("e1", entityId = "id1")
    val e2 = EdgeParticleInternal1("e2", entityId = "id2")
    val e3 = EdgeParticleInternal1("e3", entityId = "id3")
    particle.onReady()

    handles.cb.store(e1)
    handles.cb.storeAll(listOf(e2, e3))

    assertThat(handles.cb.size().await()).isEqualTo(3)
    assertThat(handles.cb.isEmpty().await()).isFalse()
    assertThat(handles.cb.fetchAll().await()).containsExactly(e1, e2, e3)
    assertThat(handles.cb.fetchById("id2").await()).isEqualTo(e2)

    handles.cb.remove(e1)
    assertThat(handles.cb.fetchAll().await()).containsExactly(e2, e3)

    handles.cb.removeById("id3")
    assertThat(handles.cb.fetchAll().await()).containsExactly(e2)

    handles.cb.clear()
    assertThat(handles.cb.size().await()).isEqualTo(0)
    assertThat(handles.cb.isEmpty().await()).isTrue()
    assertThat(handles.cb.fetchAll().await()).isEmpty()
  }

  @Test
  fun collection_readBeforeAndAfterReady() = runTest {
    val e1 = EdgeParticleInternal1("e1", entityId = "id1")

    // Seed the handle data.
    backingCollection.store(e1)

    // Reads before onReady should be queued to complete after onReady.
    val queuedSize = listOf(handles.cr.size(), handles.cb.size())
    val queuedIsEmpty = listOf(handles.cr.isEmpty(), handles.cb.isEmpty())
    val queuedFetchAll = listOf(handles.cr.fetchAll(), handles.cb.fetchAll())
    val queuedFetchById = listOf(handles.cr.fetchById("id1"), handles.cb.fetchById("id1"))

    val allQueued = listOf(queuedSize, queuedIsEmpty, queuedFetchAll, queuedFetchById).flatten()
    allQueued.forEach { assertThat(it.isCompleted).isFalse() }

    particle.onReady()

    allQueued.forEach { assertThat(it.isCompleted).isTrue() }

    queuedSize.forEach { assertThat(it.await()).isEqualTo(1) }
    queuedIsEmpty.forEach { assertThat(it.await()).isFalse() }
    queuedFetchAll.forEach { assertThat(it.await()).containsExactly(e1) }
    queuedFetchById.forEach { assertThat(it.await()).isEqualTo(e1) }

    // Reads after onReady should be completed immediately.
    handles.cr.size().let {
      assertThat(it.isCompleted).isTrue()
      assertThat(it.await()).isEqualTo(1)
    }
    handles.cb.isEmpty().let {
      assertThat(it.isCompleted).isTrue()
      assertThat(it.await()).isFalse()
    }
    handles.cr.fetchAll().let {
      assertThat(it.isCompleted).isTrue()
      assertThat(it.await()).containsExactly(e1)
    }
    handles.cb.fetchById("id1").let {
      assertThat(it.isCompleted).isTrue()
      assertThat(it.await()).isEqualTo(e1)
    }
  }

  @Test
  fun collection_storeBeforeReady() = runTest {
    val e1 = EdgeParticleInternal1("e1", entityId = "id1")
    val e2 = EdgeParticleInternal1("e2", entityId = "id2")
    handles.cw.store(e1)
    handles.cb.storeAll(listOf(e2))
    particle.onReady()
    assertThat(backingCollection.fetchAll()).containsExactly(e1, e2)
  }

  @Test
  fun collection_clearBeforeReady() = runTest {
    backingCollection.store(EdgeParticleInternal1("e1", entityId = "id1"))
    handles.cw.clear()
    particle.onReady()
    assertThat(backingCollection.fetchAll()).isEmpty()
  }

  @Test
  fun collection_removeBeforeReady() = runTest {
    val e1 = EdgeParticleInternal1("e1", entityId = "id1")
    val e2 = EdgeParticleInternal1("e2", entityId = "id2")
    val e3 = EdgeParticleInternal1("e3", entityId = "id3")
    backingCollection.storeAll(listOf(e1, e2, e3))
    handles.cw.remove(e1)
    handles.cb.removeById("id2")
    particle.onReady()
    assertThat(backingCollection.fetchAll()).containsExactly(e3)
  }

  @Test
  fun collection_deferredReadsReturnValueAsSetAtOnReady() = runTest {
    val e1 = EdgeParticleInternal1("e1", entityId = "id1")
    val e2 = EdgeParticleInternal1("e2", entityId = "id2")

    backingCollection.store(e1)

    val queuedSize = handles.cb.size()
    val queuedIsEmpty = handles.cr.isEmpty()
    val queuedFetchAll = handles.cb.fetchAll()
    val queuedFetchById = handles.cr.fetchById("id2") // Note e2 is not stored yet!

    val allQueued = listOf(queuedSize, queuedIsEmpty, queuedFetchAll, queuedFetchById)
    allQueued.forEach { assertThat(it.isCompleted).isFalse() }

    backingCollection.store(e2)

    // Queued operations should be fulfilled with the state of the handle as of now.
    particle.onReady()

    backingCollection.clear()

    allQueued.forEach { assertThat(it.isCompleted).isTrue() }
    assertThat(queuedSize.await()).isEqualTo(2)
    assertThat(queuedIsEmpty.await()).isFalse()
    assertThat(queuedFetchAll.await()).containsExactly(e1, e2)
    assertThat(queuedFetchById.await()).isEqualTo(e2)
  }
}
