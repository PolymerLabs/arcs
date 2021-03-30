package arcs.core.entity

import arcs.core.crdt.CrdtSingleton.Operation
import arcs.core.crdt.VersionMap
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.RawEntity
import arcs.core.data.SingletonType
import arcs.core.entity.testutil.DummyEntity
import arcs.core.entity.testutil.DummyEntitySlice
import arcs.core.entity.testutil.mockSingletonStorageProxy
import arcs.core.entity.testutil.mockStorageAdapter
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

  private fun createHandle(
    handleName: String = "defaultHandle",
    particleName: String = "defaultParticle",
    type: Type = SingletonType(EntityType(DummyEntity.SCHEMA)),
    proxy: SingletonProxy<RawEntity> = mockSingletonStorageProxy(),
    storageAdapter: StorageAdapter<DummyEntity, DummyEntitySlice, RawEntity> = mockStorageAdapter()
  ): SingletonHandle<DummyEntity, DummyEntitySlice, RawEntity> {
    val config = SingletonHandle.Config(
      handleName,
      HandleSpec(
        "handle",
        HandleMode.ReadWriteQuery,
        type,
        setOf(EntityBaseSpec(DummyEntity.SCHEMA))
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
      createHandle(type = CollectionType(EntityType(DummyEntity.SCHEMA)))
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
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(proxy = proxy)
    val oldEntity = RawEntity("old")
    val newEntity = RawEntity("new")
    val captor = argumentCaptor<(RawEntity?, RawEntity?) -> Unit>()
    whenever(proxy.addOnUpdate(any(), captor.capture())).then {
      captor.firstValue(oldEntity, newEntity)
    }

    var singletonDelta: SingletonDelta<DummyEntity>? = null
    handle.onUpdate({ delta -> singletonDelta = delta })

    assertThat(singletonDelta!!.old!!.entityId).isEqualTo(oldEntity.id)
    assertThat(singletonDelta!!.new!!.entityId).isEqualTo(newEntity.id)
  }

  @Test
  fun onUpdate_valuesAreAdapted() {
    val proxy = mockSingletonStorageProxy()
    val storageAdapter = mockStorageAdapter()
    val handle = createHandle(proxy = proxy, storageAdapter = storageAdapter)
    val oldEntity = RawEntity("old")
    val newEntity = RawEntity("new")
    val captor = argumentCaptor<(RawEntity?, RawEntity?) -> Unit>()
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
    val entity = DummyEntity()
    val handle = createHandle()

    val e = assertFailsWith<IllegalArgumentException> { handle.createReference(entity) }

    assertThat(e).hasMessageThat().isEqualTo("Entity must have an ID before it can be referenced.")
  }

  @Test
  fun createReference_notStored_throws() = runBlockingTest {
    val entity = DummyEntity("fake-id")
    val handle = createHandle()

    val e = assertFailsWith<IllegalArgumentException> { handle.createReference(entity) }

    assertThat(e).hasMessageThat().isEqualTo("Cannot createReference on Reference handles.")
  }

  @Test
  fun createReference_wrongId_throws() = runBlockingTest {
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(proxy = proxy)
    whenever(proxy.getParticleViewUnsafe()).thenReturn(RawEntity("other-id"))

    val e = assertFailsWith<IllegalArgumentException> {
      handle.createReference(DummyEntity("fake-id"))
    }
    assertThat(e).hasMessageThat().isEqualTo("Cannot createReference for unmatching entity id.")
  }

  @Test
  fun createReference_notReferenceModeStorageProxy_throws() = runBlockingTest {
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(proxy = proxy)
    whenever(proxy.getParticleViewUnsafe()).thenReturn(RawEntity("fake-id"))

    val e = assertFailsWith<IllegalArgumentException> {
      handle.createReference(DummyEntity("fake-id"))
    }
    assertThat(e).hasMessageThat().isEqualTo(
      "ReferenceModeStorageKey required in order to create references."
    )
  }

  @Test
  fun createReference_success() = runBlockingTest {
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(proxy = proxy)
    whenever(proxy.getParticleViewUnsafe()).thenReturn(RawEntity("fake-id"))
    whenever(proxy.storageKey).thenReturn(
      ReferenceModeStorageKey(RamDiskStorageKey("x"), RamDiskStorageKey("y"))
    )

    val entity = DummyEntity("fake-id")

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
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(proxy = proxy)
    whenever(proxy.getParticleViewUnsafe()).thenReturn(RawEntity("1"))

    val entity = handle.fetch()
    verify(proxy).getParticleViewUnsafe()
    assertThat(entity!!.entityId).isEqualTo("1")
  }

  @Test
  fun fetch_valueViaStorageAdapter_adapted() {
    val proxy = mockSingletonStorageProxy()
    val storageAdapter = mockStorageAdapter()
    val handle = createHandle(proxy = proxy, storageAdapter = storageAdapter)
    val entity = RawEntity("1")
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
    val proxy = mockSingletonStorageProxy()
    val storageAdapter = mockStorageAdapter()
    val handle = createHandle(proxy = proxy, storageAdapter = storageAdapter)
    whenever(proxy.getParticleViewUnsafe()).thenReturn(RawEntity("1"))
    whenever(storageAdapter.isExpired(any())).thenReturn(true)

    assertThat(handle.fetch()).isNull()

    verify(proxy).getParticleViewUnsafe()
  }

  @Test
  fun store_validEntity_success() = runBlockingTest {
    val proxy = mockSingletonStorageProxy()
    val entity = DummyEntity("1")
    val handle = createHandle(handleName = HANDLE_NAME, proxy = proxy)

    handle.store(entity).join()

    verify(proxy).applyOp(
      eq(Operation.Update(HANDLE_NAME, VersionMap(HANDLE_NAME to 1), RawEntity("1")))
    )
  }

  @Test
  fun store_channelClosed_throwsError() {
    val handle = createHandle()
    handle.close()

    assertFailsWith<IllegalStateException> { handle.store(DummyEntity("1")) }
  }

  @Test
  fun store_incrementVersionMap() = runBlockingTest {
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(handleName = HANDLE_NAME, proxy = proxy)
    val entity1 = DummyEntity("1")
    handle.store(entity1).join()
    verify(proxy).applyOp(
      eq(Operation.Update(HANDLE_NAME, VersionMap(HANDLE_NAME to 1), RawEntity(entity1.entityId!!)))
    )

    val entity2 = DummyEntity("2")
    handle.store(entity2).join()

    verify(proxy).applyOp(
      eq(Operation.Update(HANDLE_NAME, VersionMap(HANDLE_NAME to 2), RawEntity(entity2.entityId!!)))
    )
  }

  @Test
  fun clear_handleWithValue_success() {
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(handleName = HANDLE_NAME, proxy = proxy)
    val entity = DummyEntity("1")
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
