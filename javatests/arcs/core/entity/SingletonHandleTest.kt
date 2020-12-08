package arcs.core.entity

import arcs.core.crdt.CrdtSingleton.Operation
import arcs.core.crdt.VersionMap
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
<<<<<<< HEAD
import arcs.core.data.RawEntity
import arcs.core.data.SingletonType
import arcs.core.entity.testutil.DummyEntity
import arcs.core.entity.testutil.mockSingletonStorageProxy
import arcs.core.entity.testutil.mockStorageAdapter
=======
import arcs.core.data.SingletonType
import arcs.core.entity.testutil.StorableReferencableEntity
>>>>>>> Tests for BaseHandle.kt
import arcs.core.storage.StorageProxy.CallbackIdentifier
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.type.Type
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.any
import com.nhaarman.mockitokotlin2.argumentCaptor
import com.nhaarman.mockitokotlin2.eq
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.verify
import com.nhaarman.mockitokotlin2.whenever
import kotlin.test.assertFailsWith
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@OptIn(ExperimentalCoroutinesApi::class)
@Suppress("DeferredResultUnused", "UnsafeCoroutineCrossing")
@RunWith(JUnit4::class)
class SingletonHandleTest {
<<<<<<< HEAD

  private fun createHandle(
    handleName: String = "defaultHandle",
    particleName: String = "defaultParticle",
    type: Type = SingletonType(EntityType(DummyEntity.SCHEMA)),
    proxy: SingletonProxy<RawEntity> = mockSingletonStorageProxy(),
    storageAdapter: StorageAdapter<DummyEntity, RawEntity> = mockStorageAdapter()
  ): SingletonHandle<DummyEntity, RawEntity> {
=======
  private lateinit var proxy: SingletonProxy<StorableReferencableEntity>
  private lateinit var storageAdapter:
    StorageAdapter<StorableReferencableEntity, StorableReferencableEntity>

  private fun createHandle(
    type: Type = SingletonType(EntityType(StorableReferencableEntity.SCHEMA))
  ): SingletonHandle<StorableReferencableEntity, StorableReferencableEntity> {
    val proxyVersionMap = VersionMap()
    proxy = mock {
      on { getVersionMap() }.then { proxyVersionMap }
      on { applyOp(any()) }.then { CompletableDeferred(true) }
      on { applyOps(any()) }.then { CompletableDeferred(true) }
      on { prepareForSync() }.then { Unit }
      on { addOnUpdate(any(), any()) }.then { Unit }
      on { addOnResync(any(), any()) }.then { Unit }
      on { addOnDesync(any(), any()) }.then { Unit }
    }
    storageAdapter = mock {
      on { referencableToStorable(any()) }.then { it.arguments[0] as StorableReferencableEntity }
      on { storableToReferencable(any()) }.then { it.arguments[0] as StorableReferencableEntity }
    }
    val dereferencerFactory: EntityDereferencerFactory = mock {
      // Maybe add mock endpoints here, if needed.
    }

>>>>>>> Tests for BaseHandle.kt
    val config = SingletonHandle.Config(
      handleName,
      HandleSpec(
        "handle",
        HandleMode.ReadWriteQuery,
        type,
<<<<<<< HEAD
        setOf(EntityBaseSpec(DummyEntity.SCHEMA))
=======
        setOf(EntityBaseSpec(StorableReferencableEntity.SCHEMA))
>>>>>>> Tests for BaseHandle.kt
      ),
      proxy,
      storageAdapter,
      mock<EntityDereferencerFactory>(),
      particleName
    )

    return SingletonHandle(config)
  }

  @Test
  fun init_wrongContainerType_throwsException() {
    assertFailsWith<IllegalStateException> {
<<<<<<< HEAD
      createHandle(type = CollectionType(EntityType(DummyEntity.SCHEMA)))
=======
      createHandle(type = CollectionType(EntityType(StorableReferencableEntity.SCHEMA)))
>>>>>>> Tests for BaseHandle.kt
    }
  }

  @Test
  fun onUpdate_proxyAddOnUpdateCalled() {
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(handleName = HANDLE_NAME, particleName = PARTICLE_NAME, proxy = proxy)
    handle.onUpdate({})

    verify(proxy).addOnUpdate(eq(CallbackIdentifier(HANDLE_NAME, PARTICLE_NAME)), any())
  }

  @Test
  fun onUpdate_callbackInput_singletonDelta() {
<<<<<<< HEAD
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(proxy = proxy)
    val oldEntity = RawEntity("old")
    val newEntity = RawEntity("new")
    val captor = argumentCaptor<(RawEntity?, RawEntity?) -> Unit>()
=======
    val handle = createHandle()
    val oldEntity = StorableReferencableEntity("1", "old")
    val newEntity = StorableReferencableEntity("2", "new")
    val captor =
      argumentCaptor<(StorableReferencableEntity?, StorableReferencableEntity?) -> Unit>()
>>>>>>> Tests for BaseHandle.kt
    whenever(proxy.addOnUpdate(any(), captor.capture())).then {
      captor.firstValue(oldEntity, newEntity)
    }

<<<<<<< HEAD
    var singletonDelta: SingletonDelta<DummyEntity>? = null
=======
    var singletonDelta: SingletonDelta<StorableReferencableEntity>? = null
>>>>>>> Tests for BaseHandle.kt
    handle.onUpdate({ delta -> singletonDelta = delta })

    assertThat(singletonDelta!!.old!!.entityId).isEqualTo(oldEntity.id)
    assertThat(singletonDelta!!.new!!.entityId).isEqualTo(newEntity.id)
  }

  @Test
  fun onUpdate_valuesAreAdapted() {
<<<<<<< HEAD
    val proxy = mockSingletonStorageProxy()
    val storageAdapter = mockStorageAdapter()
    val handle = createHandle(proxy = proxy, storageAdapter = storageAdapter)
    val oldEntity = RawEntity("old")
    val newEntity = RawEntity("new")
    val captor = argumentCaptor<(RawEntity?, RawEntity?) -> Unit>()
=======
    val handle = createHandle()
    val oldEntity = StorableReferencableEntity("1", "old")
    val newEntity = StorableReferencableEntity("2", "new")
    val captor =
      argumentCaptor<(StorableReferencableEntity?, StorableReferencableEntity?) -> Unit>()
>>>>>>> Tests for BaseHandle.kt
    whenever(proxy.addOnUpdate(any(), captor.capture())).then {
      captor.firstValue(oldEntity, newEntity)
    }

    handle.onUpdate({})

    verify(storageAdapter).referencableToStorable(oldEntity)
    verify(storageAdapter).referencableToStorable(newEntity)
  }

  @Test
  fun onDesync_callStorageProxyAddOnDesync() {
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(handleName = HANDLE_NAME, particleName = PARTICLE_NAME, proxy = proxy)
    val action: () -> Unit = {}

    handle.onDesync(action)

    verify(proxy).addOnDesync(eq(CallbackIdentifier(HANDLE_NAME, PARTICLE_NAME)), eq(action))
  }

  @Test
  fun onResync_callStorageProxyAddOnResync() {
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(handleName = HANDLE_NAME, particleName = PARTICLE_NAME, proxy = proxy)
    val action: () -> Unit = {}

    handle.onResync(action)

    verify(proxy).addOnResync(eq(CallbackIdentifier(HANDLE_NAME, PARTICLE_NAME)), eq(action))
  }

  @Test
  fun createReference_noEntityId_throws() = runBlockingTest {
<<<<<<< HEAD
    val entity = DummyEntity()
=======
    val entity = StorableReferencableEntity("1")
>>>>>>> Tests for BaseHandle.kt
    val handle = createHandle()

    val e = assertFailsWith<IllegalArgumentException> { handle.createReference(entity) }

    assertThat(e).hasMessageThat().isEqualTo("Entity must have an ID before it can be referenced.")
  }

  @Test
  fun createReference_notStored_throws() = runBlockingTest {
<<<<<<< HEAD
    val entity = DummyEntity("fake-id")
=======
    val entity = StorableReferencableEntity("1", "fake-id")
>>>>>>> Tests for BaseHandle.kt
    val handle = createHandle()

    val e = assertFailsWith<IllegalArgumentException> { handle.createReference(entity) }

    assertThat(e).hasMessageThat().isEqualTo("Cannot createReference on Reference handles.")
  }

  @Test
  fun createReference_wrongId_throws() = runBlockingTest {
<<<<<<< HEAD
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(proxy = proxy)
    whenever(proxy.getParticleViewUnsafe()).thenReturn(RawEntity("other-id"))

    val e = assertFailsWith<IllegalArgumentException> {
      handle.createReference(DummyEntity("fake-id"))
=======
    val handle = createHandle()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(StorableReferencableEntity("1", "other-id"))

    val e = assertFailsWith<IllegalArgumentException> {
      handle.createReference(StorableReferencableEntity("1", "fake-id"))
>>>>>>> Tests for BaseHandle.kt
    }
    assertThat(e).hasMessageThat().isEqualTo("Cannot createReference for unmatching entity id.")
  }

  @Test
  fun createReference_notReferenceModeStorageProxy_throws() = runBlockingTest {
<<<<<<< HEAD
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(proxy = proxy)
    whenever(proxy.getParticleViewUnsafe()).thenReturn(RawEntity("fake-id"))

    val e = assertFailsWith<IllegalArgumentException> {
      handle.createReference(DummyEntity("fake-id"))
=======
    val handle = createHandle()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(StorableReferencableEntity("1", "fake-id"))

    val e = assertFailsWith<IllegalArgumentException> {
      handle.createReference(StorableReferencableEntity("2", "fake-id"))
>>>>>>> Tests for BaseHandle.kt
    }
    assertThat(e).hasMessageThat().isEqualTo(
      "ReferenceModeStorageKey required in order to create references."
    )
  }

  @Test
  fun createReference_success() = runBlockingTest {
<<<<<<< HEAD
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(proxy = proxy)
    whenever(proxy.getParticleViewUnsafe()).thenReturn(RawEntity("fake-id"))
=======
    val handle = createHandle()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(StorableReferencableEntity("1", "fake-id"))
>>>>>>> Tests for BaseHandle.kt
    whenever(proxy.storageKey).thenReturn(
      ReferenceModeStorageKey(RamDiskStorageKey("x"), RamDiskStorageKey("y"))
    )

<<<<<<< HEAD
    val entity = DummyEntity("fake-id")
=======
    val entity = StorableReferencableEntity("2", "fake-id")
>>>>>>> Tests for BaseHandle.kt

    val reference = handle.createReference(entity)
    assertThat(reference.entityId).isEqualTo(entity.entityId)
  }

  @Test
  fun fetch_emptyHandle_null() {
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(proxy = proxy)

    assertThat(handle.fetch()).isNull()

    verify(proxy).getParticleViewUnsafe()
  }

  @Test
  fun fetch_initValues_success() {
<<<<<<< HEAD
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(proxy = proxy)
    whenever(proxy.getParticleViewUnsafe()).thenReturn(RawEntity("1"))
=======
    val entity = StorableReferencableEntity("1", "id")
    val handle = createHandle()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(entity)
>>>>>>> Tests for BaseHandle.kt

    val entity = handle.fetch()
    verify(proxy).getParticleViewUnsafe()
    assertThat(entity!!.entityId).isEqualTo("1")
  }

  @Test
  fun fetch_valueViaStorageAdapter_adapted() {
<<<<<<< HEAD
    val proxy = mockSingletonStorageProxy()
    val storageAdapter = mockStorageAdapter()
    val handle = createHandle(proxy = proxy, storageAdapter = storageAdapter)
    val entity = RawEntity("1")
=======
    val entity = StorableReferencableEntity("1", "id")
    val handle = createHandle()
>>>>>>> Tests for BaseHandle.kt
    whenever(proxy.getParticleViewUnsafe()).thenReturn(entity)

    handle.fetch()
    verify(storageAdapter).referencableToStorable(entity)
  }

  @Test
  fun fetch_closedChannel_throwsError() {
    val handle = createHandle()

    handle.close()

    assertFailsWith<IllegalStateException> { handle.fetch() }
  }

  @Test
  fun fetch_expiredEntities_filteredOut() {
<<<<<<< HEAD
    val proxy = mockSingletonStorageProxy()
    val storageAdapter = mockStorageAdapter()
    val handle = createHandle(proxy = proxy, storageAdapter = storageAdapter)
    whenever(proxy.getParticleViewUnsafe()).thenReturn(RawEntity("1"))
=======
    val handle = createHandle()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(StorableReferencableEntity("1", "id"))
>>>>>>> Tests for BaseHandle.kt
    whenever(storageAdapter.isExpired(any())).thenReturn(true)

    assertThat(handle.fetch()).isNull()

    verify(proxy).getParticleViewUnsafe()
  }

  @Test
  fun store_validEntity_success() = runBlockingTest {
<<<<<<< HEAD
    val proxy = mockSingletonStorageProxy()
    val entity = DummyEntity("1")
    val handle = createHandle(handleName = HANDLE_NAME, proxy = proxy)
=======
    val entity = StorableReferencableEntity("1")
    val handle = createHandle()
>>>>>>> Tests for BaseHandle.kt

    handle.store(entity).join()

    verify(proxy).applyOp(
      eq(Operation.Update(HANDLE_NAME, VersionMap(HANDLE_NAME to 1), RawEntity("1")))
    )
  }

  @Test
  fun store_channelClosed_throwsError() {
    val handle = createHandle()
    handle.close()

<<<<<<< HEAD
    assertFailsWith<IllegalStateException> { handle.store(DummyEntity("1")) }
=======
    assertFailsWith<IllegalStateException> { handle.store(StorableReferencableEntity("1")) }
>>>>>>> Tests for BaseHandle.kt
  }

  @Test
  fun store_incrementVersionMap() = runBlockingTest {
<<<<<<< HEAD
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(handleName = HANDLE_NAME, proxy = proxy)
    val entity1 = DummyEntity("1")
=======
    val entity1 = StorableReferencableEntity("1")
    val handle = createHandle()
>>>>>>> Tests for BaseHandle.kt
    handle.store(entity1).join()
    verify(proxy).applyOp(
      eq(Operation.Update(HANDLE_NAME, VersionMap(HANDLE_NAME to 1), RawEntity(entity1.entityId!!)))
    )

<<<<<<< HEAD
    val entity2 = DummyEntity("2")
=======
    val entity2 = StorableReferencableEntity("2")
>>>>>>> Tests for BaseHandle.kt
    handle.store(entity2).join()

    verify(proxy).applyOp(
      eq(Operation.Update(HANDLE_NAME, VersionMap(HANDLE_NAME to 2), RawEntity(entity2.entityId!!)))
    )
  }

  @Test
  fun clear_handleWithValue_success() {
<<<<<<< HEAD
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(handleName = HANDLE_NAME, proxy = proxy)
    val entity = DummyEntity("1")
=======
    val entity = StorableReferencableEntity("1")
    val handle = createHandle()
>>>>>>> Tests for BaseHandle.kt
    handle.store(entity)
    val versionMap = VersionMap(HANDLE_NAME to 1)

    handle.clear()

    verify(proxy).applyOp(
      eq(Operation.Update(HANDLE_NAME, versionMap, RawEntity(entity.entityId!!)))
    )
    verify(proxy).applyOp(eq(Operation.Clear(HANDLE_NAME, versionMap)))
  }

  @Test
  fun clear_emptyHandle_success() {
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(handleName = HANDLE_NAME, proxy = proxy)

    handle.clear()

    verify(proxy).applyOp(eq(Operation.Clear(HANDLE_NAME, VersionMap())))
  }

  @Test
  fun clear_channelClosed_throwsError() {
    val handle = createHandle()
    handle.close()

    assertFailsWith<IllegalStateException> { handle.clear() }
  }

  companion object {
    private const val HANDLE_NAME = "myHandle"
    private const val PARTICLE_NAME = "myParticle"
  }
}
