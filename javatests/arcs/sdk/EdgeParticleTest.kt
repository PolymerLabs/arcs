package arcs.sdk

import arcs.core.data.HandleMode
import arcs.core.entity.CollectionDelta
import arcs.core.entity.ReadableHandle
import arcs.core.entity.SingletonDelta
import arcs.core.storage.StorageProxy.StorageEvent
import arcs.core.testutil.runTest
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.async
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.junit.Before
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import org.junit.Test

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

@Suppress("UnsafeCoroutineCrossing")
class FakeSingletonHandle :
  FakeHandle<EntityBase?, SingletonDelta<EntityBase>>(),
  ReadWriteSingletonHandle<EntityBase, Entity> {

  var stored: EntityBase? = null

  override fun fetch() = stored

  override fun store(element: Entity) = wrap { stored = element as EntityBase }

  override fun clear() = wrap { stored = null }
}

@Suppress("UnsafeCoroutineCrossing")
class FakeCollectionHandle :
  FakeHandle<Set<EntityBase>, CollectionDelta<EntityBase>>(),
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
@Suppress("UnsafeCoroutineCrossing")
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
    handles.sw.store(EdgeParticleInternal1("abc"))
    assertThat(handles.sr.fetch()).isEqualTo(EdgeParticleInternal1("abc"))

    handles.sw.clear()
    assertThat(handles.sr.fetch()).isNull()

    // Check all three on sb.
    handles.sb.store(EdgeParticleInternal1("abc"))
    assertThat(handles.sb.fetch()).isEqualTo(EdgeParticleInternal1("abc"))

    handles.sb.clear()
    assertThat(handles.sb.fetch()).isNull()
  }

  @Test
  fun singleton_fetchBeforeAndAfterReady() = runTest {
    // Seed the handle data.
    backingSingleton.store(EdgeParticleInternal1("def"))

    // Read ops should suspend until onReady.
    val srFetch = async { handles.sr.fetch() }.also { assertThat(it.isCompleted).isFalse() }
    val sbFetch = async { handles.sb.fetch() }.also { assertThat(it.isCompleted).isFalse() }

    particle.onReady()

    val expected = EdgeParticleInternal1("def")
    assertThat(srFetch.await()).isEqualTo(expected)
    assertThat(sbFetch.await()).isEqualTo(expected)

    // Read ops after onReady should be completed immediately.
    assertThat(handles.sr.fetch()).isEqualTo(expected)
    assertThat(handles.sb.fetch()).isEqualTo(expected)
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
  fun collection_verifyHandleInterfaces_readOnlyAndWriteOnly() = runTest {
    val e1 = EdgeParticleInternal1("e1", entityId = "id1")
    val e2 = EdgeParticleInternal1("e2", entityId = "id2")
    val e3 = EdgeParticleInternal1("e3", entityId = "id3")
    particle.onReady()

    handles.cw.store(e1)
    handles.cw.storeAll(listOf(e2, e3))

    assertThat(handles.cr.size()).isEqualTo(3)
    assertThat(handles.cr.isEmpty()).isFalse()
    assertThat(handles.cr.fetchAll()).containsExactly(e1, e2, e3)
    assertThat(handles.cr.fetchById("id2")).isEqualTo(e2)

    handles.cw.remove(e1)
    assertThat(handles.cr.fetchAll()).containsExactly(e2, e3)

    handles.cw.removeById("id3")
    assertThat(handles.cr.fetchAll()).containsExactly(e2)

    handles.cw.clear()
    assertThat(handles.cr.size()).isEqualTo(0)
    assertThat(handles.cr.isEmpty()).isTrue()
    assertThat(handles.cr.fetchAll()).isEmpty()
  }

  @Test
  fun collection_verifyHandleInterfaces_readAndWrite() = runTest {
    val e1 = EdgeParticleInternal1("e1", entityId = "id1")
    val e2 = EdgeParticleInternal1("e2", entityId = "id2")
    val e3 = EdgeParticleInternal1("e3", entityId = "id3")
    particle.onReady()

    handles.cb.store(e1)
    handles.cb.storeAll(listOf(e2, e3))

    assertThat(handles.cb.size()).isEqualTo(3)
    assertThat(handles.cb.isEmpty()).isFalse()
    assertThat(handles.cb.fetchAll()).containsExactly(e1, e2, e3)
    assertThat(handles.cb.fetchById("id2")).isEqualTo(e2)

    handles.cb.remove(e1)
    assertThat(handles.cb.fetchAll()).containsExactly(e2, e3)

    handles.cb.removeById("id3")
    assertThat(handles.cb.fetchAll()).containsExactly(e2)

    handles.cb.clear()
    assertThat(handles.cb.size()).isEqualTo(0)
    assertThat(handles.cb.isEmpty()).isTrue()
    assertThat(handles.cb.fetchAll()).isEmpty()
  }

  @Test
  fun collection_readBeforeAndAfterReady() = runTest {
    val e1 = EdgeParticleInternal1("e1", entityId = "id1")

    // Seed the handle data.
    backingCollection.store(e1)

    // Read ops should suspend until onReady.
    val crSize = async { handles.cr.size() }.also { assertThat(it.isCompleted).isFalse() }
    val cbSize = async { handles.cb.size() }.also { assertThat(it.isCompleted).isFalse() }
    val crIsEmpty = async { handles.cr.isEmpty() }.also { assertThat(it.isCompleted).isFalse() }
    val cbIsEmpty = async { handles.cb.isEmpty() }.also { assertThat(it.isCompleted).isFalse() }
    val crFetchAll = async { handles.cr.fetchAll() }.also { assertThat(it.isCompleted).isFalse() }
    val cbFetchAll = async { handles.cb.fetchAll() }.also { assertThat(it.isCompleted).isFalse() }
    val crFetchById = async { handles.cr.fetchById("id1") }.also {
      assertThat(it.isCompleted).isFalse()
    }
    val cbFetchById = async { handles.cb.fetchById("id1") }.also {
      assertThat(it.isCompleted).isFalse()
    }

    particle.onReady()

    assertThat(crSize.await()).isEqualTo(1)
    assertThat(cbSize.await()).isEqualTo(1)
    assertThat(crIsEmpty.await()).isFalse()
    assertThat(cbIsEmpty.await()).isFalse()
    assertThat(crFetchAll.await()).containsExactly(e1)
    assertThat(cbFetchAll.await()).containsExactly(e1)
    assertThat(crFetchById.await()).isEqualTo(e1)
    assertThat(cbFetchById.await()).isEqualTo(e1)

    // Reads after onReady should be completed immediately.
    assertThat(handles.cr.size()).isEqualTo(1)
    assertThat(handles.cb.isEmpty()).isFalse()
    assertThat(handles.cr.fetchAll()).containsExactly(e1)
    assertThat(handles.cb.fetchById("id1")).isEqualTo(e1)
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
}
