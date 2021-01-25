package arcs.core.entity

import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.RawEntity
import arcs.core.data.SingletonType
import arcs.core.entity.testutil.DummyEntity
import arcs.core.entity.testutil.mockSingletonStorageProxy
import arcs.core.entity.testutil.mockStorageAdapter
import arcs.core.storage.Dereferencer
import arcs.core.storage.Reference as StorageReference
import arcs.core.storage.StorageProxy.CallbackIdentifier
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.type.Type
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.any
import com.nhaarman.mockitokotlin2.eq
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.never
import com.nhaarman.mockitokotlin2.verify
import com.nhaarman.mockitokotlin2.whenever
import kotlin.test.assertFailsWith
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

private class TestBaseHandle(
  config: BaseHandleConfig
) : BaseHandle<DummyEntity>(config) {
  fun callCheckPreconditions() = checkPreconditions {}
}

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(JUnit4::class)
class BaseHandleTest {
  private fun createHandle(
    handleName: String = "defaultHandle",
    particleName: String = "defaultParticle",
    type: Type = SingletonType(EntityType(DummyEntity.SCHEMA)),
    handleMode: HandleMode = HandleMode.ReadWriteQuery,
    proxy: SingletonProxy<RawEntity> = mockSingletonStorageProxy(),
    storageAdapter: StorageAdapter<DummyEntity, RawEntity> = mockStorageAdapter(),
    dereferencerFactory: EntityDereferencerFactory = mock<EntityDereferencerFactory>()
  ): TestBaseHandle {
    val config = SingletonHandle.Config(
      handleName,
      HandleSpec(
        "handle",
        handleMode,
        type,
        setOf(EntityBaseSpec(DummyEntity.SCHEMA))
      ),
      proxy,
      storageAdapter,
      dereferencerFactory,
      particleName
    )
    return TestBaseHandle(config)
  }

  private fun EntityDereferencerFactory.mockDereferencer(entity: RawEntity?) {
    whenever(injectDereferencers(any(), any())).then { invocation ->
      assertThat(invocation.arguments[1]).isInstanceOf(StorageReference::class.java)
      if (invocation.arguments[1] is StorageReference) {
        (invocation.arguments[1] as StorageReference).dereferencer =
          object : Dereferencer<RawEntity> {
            override suspend fun dereference(reference: StorageReference) = entity
          }
      }
    }
  }

  @Test
  fun init_readSpec_storageProxyPrepareForSync() {
    val proxy = mockSingletonStorageProxy()
    createHandle(handleMode = HandleMode.Read, proxy = proxy)
    verify(proxy).prepareForSync()
  }

  @Test
  fun init_readWriteSpec_storageProxyPrepareForSync() {
    val proxy = mockSingletonStorageProxy()
    createHandle(handleMode = HandleMode.ReadWrite, proxy = proxy)
    verify(proxy).prepareForSync()
  }

  @Test
  fun init_writeOnlySpec_storageProxyDoesNotPrepareForSync() {
    val proxy = mockSingletonStorageProxy()
    createHandle(handleMode = HandleMode.Write, proxy = proxy)
    verify(proxy, never()).prepareForSync()
  }

  @Test
  fun registerForStorageEvents_callStorageProxyRegisterForStorageEvents() {
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(handleName = HANDLE_NAME, particleName = PARTICLE_NAME, proxy = proxy)

    handle.registerForStorageEvents({})

    verify(proxy)
      .registerForStorageEvents(eq(CallbackIdentifier(HANDLE_NAME, PARTICLE_NAME)), any())
  }

  @Test
  fun maybeInitiateSync_callStorageProxyMaybeInitiateSync() {
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(proxy = proxy)

    handle.maybeInitiateSync()

    verify(proxy).maybeInitiateSync()
  }

  @Test
  fun getProxy() {
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(proxy = proxy)

    assertThat(handle.getProxy()).isEqualTo(proxy)
  }

  @Test
  fun dispatcher_returnsStorageProxyDispatcher() {
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(proxy = proxy)
    val dispatcher: CoroutineDispatcher = mock {}
    whenever(proxy.dispatcher).thenReturn(dispatcher)

    assertThat(handle.dispatcher).isEqualTo(dispatcher)
  }

  @Test
  fun onReady() {
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(handleName = HANDLE_NAME, particleName = PARTICLE_NAME, proxy = proxy)

    handle.onReady({})

    verify(proxy).addOnReady(eq(CallbackIdentifier(HANDLE_NAME, PARTICLE_NAME)), any())
  }

  @Test
  fun checkPreconditions_closed() {
    val handle = createHandle(handleName = HANDLE_NAME)
    handle.close()

    val e = assertFailsWith<IllegalStateException> { handle.callCheckPreconditions() }

    assertThat(e).hasMessageThat().isEqualTo("Handle $HANDLE_NAME is closed")
  }

  @Test
  fun checkPreconditions_notClosed() {
    val handle = createHandle()

    handle.callCheckPreconditions()
  }

  @Test
  fun unregisterForStorageEvents() {
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(handleName = HANDLE_NAME, particleName = PARTICLE_NAME, proxy = proxy)

    handle.unregisterForStorageEvents()

    verify(proxy).removeCallbacksForName(eq(CallbackIdentifier(HANDLE_NAME, PARTICLE_NAME)))
  }

  @Test
  fun close() {
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(handleName = HANDLE_NAME, particleName = PARTICLE_NAME, proxy = proxy)

    handle.close()

    val e = assertFailsWith<IllegalStateException> { handle.callCheckPreconditions() }
    assertThat(e).hasMessageThat().isEqualTo("Handle $HANDLE_NAME is closed")

    // ensure callbacks are unregistered.
    verify(proxy).removeCallbacksForName(eq(CallbackIdentifier(HANDLE_NAME, PARTICLE_NAME)))
  }

  @Test
  fun createReferenceInternal_notRefereceModeKey_fails() {
    val handle = createHandle()

    val e = assertFailsWith<IllegalArgumentException> {
      handle.createReferenceInternal(DummyEntity("fake-id"))
    }

    assertThat(e).hasMessageThat().isEqualTo(
      "ReferenceModeStorageKey required in order to create references."
    )
  }

  @Test
  fun createReferenceInternal_succeess() {
    val proxy = mockSingletonStorageProxy()
    val handle = createHandle(proxy = proxy)
    whenever(proxy.storageKey).thenReturn(
      ReferenceModeStorageKey(RamDiskStorageKey("x"), RamDiskStorageKey("y"))
    )
    val entity = DummyEntity("fake-id")

    val reference = handle.createReferenceInternal(entity)
    assertThat(reference.entityId).isEqualTo(entity.entityId)
  }

  @Test
  fun createForeignReference_noDereferencer_throws() = runBlockingTest {
    val handle = createHandle()
    val e = assertFailsWith<IllegalArgumentException> {
      handle.createForeignReference(DummyEntity, "1")
    }
    assertThat(e).hasMessageThat().isEqualTo("No dereferencer installed on Reference object")
  }

  @Test
  fun createForeignReference_nullDereference_returnsNull() = runBlockingTest {
    val dereferencerFactory = mock<EntityDereferencerFactory>()
    dereferencerFactory.mockDereferencer(null)
    val handle = createHandle(dereferencerFactory = dereferencerFactory)

    assertThat(handle.createForeignReference(DummyEntity, "1")).isNull()
  }

  @Test
  fun createForeignReference_dereferenceEntity() = runBlockingTest {
    val dereferencerFactory = mock<EntityDereferencerFactory>()
    dereferencerFactory.mockDereferencer(RawEntity("entity1"))
    val handle = createHandle(dereferencerFactory = dereferencerFactory)

    val reference = handle.createForeignReference(DummyEntity, "the-entity-id")!!

    assertThat(reference.entityId).isEqualTo("the-entity-id")
  }

  companion object {
    private const val HANDLE_NAME = "myHandle"
    private const val PARTICLE_NAME = "myParticle"
  }
}
