package arcs.core.entity

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.crdt.CrdtSet.Operation
import arcs.core.crdt.VersionMap
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SingletonType
import arcs.core.data.expression.Expression
import arcs.core.data.expression.asExpr
import arcs.core.data.expression.eq
import arcs.core.data.expression.query
import arcs.core.data.expression.text
import arcs.core.data.util.toReferencable
import arcs.core.entity.testutil.DummyEntity
import arcs.core.entity.testutil.mockCollectionStorageProxy
import arcs.core.entity.testutil.mockStorageAdapter
import arcs.core.storage.StorageProxy.CallbackIdentifier
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.type.Type
import arcs.flags.BuildFlagDisabledError
import arcs.flags.BuildFlags
import arcs.flags.testing.BuildFlagsRule
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
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@OptIn(ExperimentalCoroutinesApi::class)
@Suppress("DeferredResultUnused", "UnsafeCoroutineCrossing")
@RunWith(JUnit4::class)
class CollectionHandleTest {
  @get:Rule
  val buildFlagsRule = BuildFlagsRule.create()

  @Suppress("UNCHECKED_CAST")
  private fun <R : Referencable> createHandle(
    handleName: String = "defaultHandle",
    particleName: String = "defaultParticle",
    type: Type = CollectionType(EntityType(DummyEntity.SCHEMA)),
    spec: EntityBaseSpec = EntityBaseSpec(DummyEntity.SCHEMA),
    proxy: CollectionProxy<R> = mockCollectionStorageProxy() as CollectionProxy<R>,
    storageAdapter: StorageAdapter<DummyEntity, R> =
      mockStorageAdapter() as StorageAdapter<DummyEntity, R>
  ): CollectionHandle<DummyEntity, R> {
    val config = CollectionHandle.Config(
      handleName,
      HandleSpec("handle", HandleMode.ReadWriteQuery, type, setOf(spec)),
      proxy,
      storageAdapter,
      mock<EntityDereferencerFactory>(),
      particleName
    )
    return CollectionHandle(config)
  }

  private fun dummySchemaWithQuery(queryExpression: Expression<Boolean>) = Schema(
    names = DummyEntity.SCHEMA.names,
    fields = DummyEntity.SCHEMA.fields,
    hash = DummyEntity.SCHEMA.hash,
    queryExpression = queryExpression
  )

  @Test
  fun init_wrongContainerType_throwsException() {
    assertFailsWith<IllegalStateException> {
      createHandle<RawEntity>(type = SingletonType(EntityType(DummyEntity.SCHEMA)))
    }
  }

  @Test
  fun size_handleClosed_throwsException() {
    val handle = createHandle<RawEntity>()
    handle.close()

    assertFailsWith<IllegalStateException> { handle.size() }
  }

  @Test
  fun size_empty_returnsZero() {
    val proxy = mockCollectionStorageProxy()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(emptySet())
    val handle = createHandle(proxy = proxy)

    assertThat(handle.size()).isEqualTo(0)
  }

  @Test
  fun size_oneElement_returnsOne() {
    val proxy = mockCollectionStorageProxy()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(setOf(RAW_ENTITY1))
    val handle = createHandle(proxy = proxy)

    assertThat(handle.size()).isEqualTo(1)
  }

  @Test
  fun size_nElements_returnsN() {
    val proxy = mockCollectionStorageProxy()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(
      setOf(RAW_ENTITY1, RAW_ENTITY2, RAW_ENTITY3, RAW_ENTITY4)
    )
    val handle = createHandle(proxy = proxy)

    assertThat(handle.size()).isEqualTo(4)
  }

  @Test
  fun size_hasExpiredModels_notCounted() {
    val proxy = mockCollectionStorageProxy()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(setOf(RAW_ENTITY1, RAW_ENTITY2, RAW_ENTITY3))
    val storageAdapter = mockStorageAdapter()
    whenever(storageAdapter.isExpired(RAW_ENTITY1)).thenReturn(true)
    val handle = createHandle(proxy = proxy, storageAdapter = storageAdapter)

    assertThat(handle.size()).isEqualTo(2)
  }

  @Test
  fun isEmpty_handleClosed_throwsException() {
    val handle = createHandle<RawEntity>()
    handle.close()

    assertFailsWith<IllegalStateException> { handle.isEmpty() }
  }

  @Test
  fun isEmpty_noModels_returnsTrue() {
    val proxy = mockCollectionStorageProxy()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(emptySet())
    val handle = createHandle(proxy = proxy)

    assertThat(handle.isEmpty()).isTrue()
  }

  @Test
  fun isEmpty_allModelsExpired_returnsTrue() {
    val proxy = mockCollectionStorageProxy()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(setOf(RAW_ENTITY1, RAW_ENTITY2))
    val storageAdapter = mockStorageAdapter()
    whenever(storageAdapter.isExpired(any())).thenReturn(true)
    val handle = createHandle(proxy = proxy, storageAdapter = storageAdapter)

    assertThat(handle.isEmpty()).isTrue()
  }

  @Test
  fun isEmpty_hasValidAndExpiredModels_returnsFalse() {
    val proxy = mockCollectionStorageProxy()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(setOf(RAW_ENTITY1, RAW_ENTITY2))
    val storageAdapter = mockStorageAdapter()
    whenever(storageAdapter.isExpired(RAW_ENTITY2)).thenReturn(true)
    val handle = createHandle(proxy = proxy, storageAdapter = storageAdapter)

    assertThat(handle.isEmpty()).isFalse()
  }

  @Test
  fun fetchAll_closed_throwsException() {
    val handle = createHandle<RawEntity>()
    handle.close()

    assertFailsWith<IllegalStateException> { handle.fetchAll() }
  }

  @Test
  fun fetchAll_noModels_returnsEmpty() {
    val proxy = mockCollectionStorageProxy()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(emptySet())
    val handle = createHandle(proxy = proxy)

    assertThat(handle.fetchAll()).isEmpty()
  }

  @Test
  fun fetchAll_oneModel_returnsOneEntity() {
    val proxy = mockCollectionStorageProxy()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(setOf(RAW_ENTITY1))
    val handle = createHandle(proxy = proxy)

    assertThat(handle.fetchAll()).isEqualTo(setOf(DummyEntity(RAW_ENTITY1.id)))
  }

  @Test
  fun fetchAll_nModels_returnsNEntities() {
    val proxy = mockCollectionStorageProxy()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(setOf(RAW_ENTITY1, RAW_ENTITY2, RAW_ENTITY3))
    val handle = createHandle(proxy = proxy)

    assertThat(handle.fetchAll()).isEqualTo(
      setOf(DummyEntity(RAW_ENTITY1.id), DummyEntity(RAW_ENTITY2.id), DummyEntity(RAW_ENTITY3.id))
    )
  }

  @Test
  fun fetchAll_validAndExpiredModels_returnsValidEntities() {
    val proxy = mockCollectionStorageProxy()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(setOf(RAW_ENTITY1, RAW_ENTITY2, RAW_ENTITY3))
    val storageAdapter = mockStorageAdapter()
    whenever(storageAdapter.isExpired(RAW_ENTITY2)).thenReturn(true)
    val handle = createHandle(proxy = proxy, storageAdapter = storageAdapter)

    assertThat(handle.fetchAll()).isEqualTo(
      setOf(DummyEntity(RAW_ENTITY1.id), DummyEntity(RAW_ENTITY3.id))
    )
  }

  @Test
  fun fetchById_closed_throwsException() {
    val handle = createHandle<RawEntity>()
    handle.close()

    assertFailsWith<IllegalStateException> { handle.fetchById("1") }
  }

  @Test
  fun fetchById_empty_returnsNull() {
    val proxy = mockCollectionStorageProxy()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(emptySet())
    val handle = createHandle(proxy = proxy)

    assertThat(handle.fetchById("noSuchId")).isNull()
  }

  @Test
  fun fetchById_noSuchId_returnsNull() {
    val proxy = mockCollectionStorageProxy()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(setOf(RAW_ENTITY1, RAW_ENTITY2))
    val handle = createHandle(proxy = proxy)

    assertThat(handle.fetchById("other-id")).isNull()
  }

  @Test
  fun fetchById_entityWithIdExpired_returnsNull() {
    val proxy = mockCollectionStorageProxy()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(
      setOf(RAW_ENTITY1, RAW_ENTITY2, RAW_ENTITY3)
    )
    val storageAdapter = mockStorageAdapter()
    whenever(storageAdapter.isExpired(RAW_ENTITY2)).thenReturn(true)
    val handle = createHandle(proxy = proxy, storageAdapter = storageAdapter)

    assertThat(handle.fetchById(RAW_ENTITY2.id)).isNull()
  }

  @Test
  fun fetchById_idExists_returnsEntity() {
    val proxy = mockCollectionStorageProxy()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(setOf(RAW_ENTITY1, RAW_ENTITY2, RAW_ENTITY3))
    val handle = createHandle(proxy = proxy)

    assertThat(handle.fetchById(RAW_ENTITY1.id)).isEqualTo(DummyEntity(RAW_ENTITY1.id))
  }

  @Test
  fun fetchById_idExistsOtherExpired_returnsEntity() {
    val proxy = mockCollectionStorageProxy()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(setOf(RAW_ENTITY1, RAW_ENTITY2))
    val storageAdapter = mockStorageAdapter()
    whenever(storageAdapter.isExpired(RAW_ENTITY1)).thenReturn(true)
    val handle = createHandle(proxy = proxy, storageAdapter = storageAdapter)

    assertThat(handle.fetchById(RAW_ENTITY2.id)).isEqualTo(DummyEntity(RAW_ENTITY2.id))
  }

  @Test
  fun fetchById_multipleEntitiesWithId_returnsFirst() {
    val proxy = mockCollectionStorageProxy()
    val rawEntity1WithField = RawEntity(RAW_ENTITY1.id, mapOf("text" to "hello".toReferencable()))
    whenever(proxy.getParticleViewUnsafe()).thenReturn(
      setOf(RAW_ENTITY2, RAW_ENTITY1, RAW_ENTITY3, rawEntity1WithField)
    )
    val handle = createHandle(proxy = proxy)

    assertThat(handle.fetchById(RAW_ENTITY1.id)).isEqualTo(DummyEntity(RAW_ENTITY1.id))
  }

  @Test
  fun query_closed_throwsException() {
    val handle = createHandle<RawEntity>()
    handle.close()

    assertFailsWith<IllegalStateException> { handle.query("test") }
  }

  private data class DummyReference(override val id: ReferenceId) : Referencable

  @Test
  fun query_notRawEntity_throwsException() {
    val proxy: CollectionProxy<DummyReference> = mock {
      on { getParticleViewUnsafe() }.then { setOf(DummyReference("1")) }
    }

    val handle = createHandle(proxy = proxy)

    val e = assertFailsWith<IllegalStateException> { handle.query("test") }
    assertThat(e).hasMessageThat().isEqualTo("Queries only work with Entity-typed Handles.")
  }

  @Test
  fun query_emptyModels_returnsEmpty() {
    val proxy = mockCollectionStorageProxy()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(emptySet())
    val handle = createHandle(proxy = proxy)

    handle.query("test").isEmpty()
  }

  @Test
  fun query_noQueryInSpec_returnsAllEntities() {
    val proxy = mockCollectionStorageProxy()
    val rawEntity1 = RAW_ENTITY1
    val rawEntity2 = RAW_ENTITY2
    whenever(proxy.getParticleViewUnsafe()).thenReturn(setOf(rawEntity1, rawEntity2))
    val handle = createHandle(proxy = proxy)

    assertThat(handle.query("test")).isEqualTo(
      setOf(DummyEntity(rawEntity1.id), DummyEntity(rawEntity2.id))
    )
  }

  @Test
  fun query_emptyColleciton_returnsEmpty() {
    val proxy = mockCollectionStorageProxy()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(emptySet())
    val handle = createHandle(proxy = proxy)

    assertThat(handle.query("test")).isEmpty()
  }

  @Test
  fun query_expressionIsFalse_returnsEmpty() {
    val proxy = mockCollectionStorageProxy()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(setOf(RAW_ENTITY1, RAW_ENTITY2))
    val handle = createHandle<RawEntity>(
      spec = EntityBaseSpec(dummySchemaWithQuery(false.asExpr())),
      proxy = proxy
    )

    assertThat(handle.query("test")).isEmpty()
  }

  @Test
  fun query_returnsResults() {
    val proxy = mockCollectionStorageProxy()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(
      setOf(
        RawEntity("1", mapOf("text" to "hello".toReferencable())),
        RawEntity("2", mapOf("text" to "world".toReferencable())),
        RawEntity("3", mapOf("text" to "world".toReferencable(), "num" to 42.toReferencable()))
      )
    )
    val handle = createHandle<RawEntity>(
      spec = EntityBaseSpec(dummySchemaWithQuery(text("text") eq query("queryArgument"))),
      proxy = proxy
    )

    assertThat(handle.query("test")).isEmpty()
    assertThat(handle.query("hello")).containsExactly(DummyEntity("1"))
    assertThat(handle.query("world")).containsExactly(DummyEntity("2"), DummyEntity("3"))
  }

  @Test
  fun removeByQuery_disabledByFlag_throwsException() {
    val handle = createHandle<RawEntity>()
    handle.close()

    assertFailsWith<BuildFlagDisabledError> { handle.removeByQuery("test") }
  }

  @Test
  fun removeByQuery_closed_throwsException() {
    BuildFlags.REMOVE_BY_QUERY_HANDLE = true
    val handle = createHandle<RawEntity>()
    handle.close()

    assertFailsWith<IllegalStateException> { handle.removeByQuery("test") }
  }

  @Test
  fun removeByQuery_noCorrespondingEntities_applyEmptyOps() {
    BuildFlags.REMOVE_BY_QUERY_HANDLE = true
    val proxy = mockCollectionStorageProxy()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(
      setOf(
        RawEntity("1", mapOf("text" to "foo".toReferencable())),
        RawEntity("2", mapOf("text" to "bar".toReferencable()))
      )
    )
    val handle = createHandle<RawEntity>(
      spec = EntityBaseSpec(dummySchemaWithQuery(text("text") eq query("queryArgument"))),
      proxy = proxy
    )

    handle.removeByQuery("qux")

    verify(proxy).applyOps(emptyList())
  }

  @Test
  fun removeByQuery_success_storageProxyApplyOps() {
    BuildFlags.REMOVE_BY_QUERY_HANDLE = true
    val proxy = mockCollectionStorageProxy()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(
      setOf(
        RawEntity("1", mapOf("text" to "foo".toReferencable())),
        RawEntity("2", mapOf("text" to "bar".toReferencable())),
        RawEntity("3", mapOf("text" to "bar".toReferencable(), "num" to 42.toReferencable())),
        RawEntity("4", mapOf("text" to "qux".toReferencable()))
      )
    )
    val handle = createHandle<RawEntity>(
      handleName = HANDLE_NAME,
      spec = EntityBaseSpec(dummySchemaWithQuery(text("text") eq query("queryArgument"))),
      proxy = proxy
    )

    handle.removeByQuery("bar")

    verify(proxy).applyOps(
      eq(
        listOf(
          Operation.Remove(HANDLE_NAME, VersionMap(), "2"),
          Operation.Remove(HANDLE_NAME, VersionMap(), "3")
        )
      )
    )
  }

  @Test
  fun store_closed_throwsException() {
    val handle = createHandle<RawEntity>()
    handle.close()

    assertFailsWith<IllegalStateException> { handle.store(DummyEntity("1")) }
  }

  @Test
  fun store_proxyApplyOp() = runBlockingTest {
    val proxy = mockCollectionStorageProxy()
    val handle = createHandle(handleName = HANDLE_NAME, proxy = proxy)
    val id = "1"
    val entity = DummyEntity(id)

    handle.store(entity).join()

    val op = Operation.Add(HANDLE_NAME, VersionMap(mapOf(HANDLE_NAME to 1)), RawEntity(id))
    verify(proxy).applyOps(eq(listOf(op)))
  }

  @Test
  fun store_sameEntityTwice_proxyApplyOp() = runBlockingTest {
    val proxy = mockCollectionStorageProxy()
    val handle = createHandle(handleName = HANDLE_NAME, proxy = proxy)
    val entity = DummyEntity("1")

    handle.store(entity).join()
    handle.store(entity).join()

    val rawEntity = RawEntity(entity.entityId!!)
    verify(proxy).applyOps(
      eq(listOf(Operation.Add(HANDLE_NAME, VersionMap().also { it[HANDLE_NAME] = 1 }, rawEntity)))
    )
    verify(proxy).applyOps(
      eq(listOf(Operation.Add(HANDLE_NAME, VersionMap().also { it[HANDLE_NAME] = 2 }, rawEntity)))
    )
  }

  @Test
  fun store_differentEntities_proxyApplyOp() = runBlockingTest {
    val proxy = mockCollectionStorageProxy()
    val handle = createHandle(handleName = HANDLE_NAME, proxy = proxy)
    val id1 = "1"
    val id2 = "2"

    handle.store(DummyEntity(id1)).join()
    handle.store(DummyEntity(id2)).join()

    val op1 = Operation.Add(HANDLE_NAME, VersionMap().also { it[HANDLE_NAME] = 1 }, RawEntity(id1))
    verify(proxy).applyOps(eq(listOf(op1)))
    val op2 = Operation.Add(HANDLE_NAME, VersionMap().also { it[HANDLE_NAME] = 2 }, RawEntity(id2))
    verify(proxy).applyOps(eq(listOf(op2)))
  }

  @Test
  fun storeAll_closed_throwsException() {
    val handle = createHandle<RawEntity>()
    handle.close()

    assertFailsWith<IllegalStateException> { handle.storeAll(emptyList()) }
  }

  @Test
  fun storeAll_proxyApplyOp() = runBlockingTest {
    val proxy = mockCollectionStorageProxy()
    val handle = createHandle(handleName = HANDLE_NAME, proxy = proxy)
    val ids = listOf("1", "2", "3", "4")

    handle.storeAll(ids.map { DummyEntity(it) }).join()

    val ops = ids.mapIndexed { index, id ->
      Operation.Add(HANDLE_NAME, VersionMap().also { it[HANDLE_NAME] = index + 1 }, RawEntity(id))
    }
    verify(proxy).applyOps(eq(ops))
  }

  @Test
  fun clear_closed_throwsException() {
    val handle = createHandle<RawEntity>()
    handle.close()

    assertFailsWith<IllegalStateException> { handle.clear() }
  }

  @Test
  fun clear_emptyHandle_proxyApplyOp() {
    val proxy = mockCollectionStorageProxy()
    val handle = createHandle(handleName = HANDLE_NAME, proxy = proxy)

    handle.clear()

    verify(proxy).applyOp(eq(Operation.Clear(HANDLE_NAME, VersionMap())))
  }

  @Test
  fun clear_nonemptyHandle_proxyApplyOp() = runBlockingTest {
    val proxy = mockCollectionStorageProxy()
    val handle = createHandle(handleName = HANDLE_NAME, proxy = proxy)
    handle.store(DummyEntity("1")).join()

    handle.clear()

    verify(proxy).applyOp(eq(Operation.Clear(HANDLE_NAME, VersionMap(HANDLE_NAME to 1))))
  }

  @Test
  fun remove_closed_throwsException() {
    val handle = createHandle<RawEntity>()
    handle.close()

    assertFailsWith<IllegalStateException> { handle.clear() }
  }

  @Test
  fun remove_entityWithNoId_throwsException() {
    val handle = createHandle<RawEntity>()
    val e = assertFailsWith<IllegalStateException> {
      handle.remove(DummyEntity(entityId = null))
    }
    assertThat(e).hasMessageThat().isEqualTo("Cannot remove an item without ID.")
  }

  @Test
  fun remove_success_storageProxyApplyOp() {
    val proxy = mockCollectionStorageProxy()
    val storageAdapter = mockStorageAdapter()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(setOf(RAW_ENTITY1))
    val entity = DummyEntity(RAW_ENTITY1.id)
    whenever(storageAdapter.getId(entity)).thenReturn(RAW_ENTITY1.id)
    val handle = createHandle(
      handleName = HANDLE_NAME,
      proxy = proxy,
      storageAdapter = storageAdapter
    )

    handle.remove(DummyEntity(RAW_ENTITY1.id))

    verify(proxy).applyOp(eq(Operation.Remove(HANDLE_NAME, VersionMap(), RAW_ENTITY1.id)))
  }

  @Test
  fun removeById_closed_throwsException() {
    val handle = createHandle<RawEntity>()
    handle.close()

    assertFailsWith<IllegalStateException> { handle.removeById("myId") }
  }

  @Test
  fun removeById_success_storageProxyApplyOp() {
    val proxy = mockCollectionStorageProxy()
    val handle = createHandle(handleName = HANDLE_NAME, proxy = proxy)

    handle.removeById("myId")

    verify(proxy).applyOp(eq(Operation.Remove(HANDLE_NAME, VersionMap(), "myId")))
  }

  @Test
  fun onUpdate() {
    val proxy = mockCollectionStorageProxy()
    val handle = createHandle(handleName = HANDLE_NAME, particleName = PARTICLE_NAME, proxy = proxy)
    handle.onUpdate({})

    verify(proxy).addOnUpdate(eq(CallbackIdentifier(HANDLE_NAME, PARTICLE_NAME)), any())
  }

  @Test
  fun onUpdate_onlyAdded() {
    val proxy = mockCollectionStorageProxy()
    val handle = createHandle(proxy = proxy)
    val unchangedId = "unchanged-id"
    val newId = "new-id"
    val captor = argumentCaptor<(Set<RawEntity>, Set<RawEntity>) -> Unit>()
    whenever(proxy.addOnUpdate(any(), captor.capture())).then {
      captor.firstValue(
        setOf(RawEntity(unchangedId)),
        setOf(RawEntity(unchangedId), RawEntity(newId))
      )
    }

    var collectionDelta: CollectionDelta<DummyEntity>? = null
    handle.onUpdate({ delta -> collectionDelta = delta })

    assertThat(collectionDelta!!.removed).isEmpty()
    assertThat(collectionDelta!!.added).containsExactly(DummyEntity(newId))
  }

  @Test
  fun onUpdate_onlyRemoved() {
    val proxy = mockCollectionStorageProxy()
    val handle = createHandle(proxy = proxy)
    val unchangedId = "unchanged-id"
    val oldId = "old-id"
    val captor = argumentCaptor<(Set<RawEntity>, Set<RawEntity>) -> Unit>()
    whenever(proxy.addOnUpdate(any(), captor.capture())).then {
      captor.firstValue(
        setOf(RawEntity(unchangedId), RawEntity(oldId)),
        setOf(RawEntity(unchangedId))
      )
    }

    var collectionDelta: CollectionDelta<DummyEntity>? = null
    handle.onUpdate({ delta -> collectionDelta = delta })

    assertThat(collectionDelta!!.removed).containsExactly(DummyEntity(oldId))
    assertThat(collectionDelta!!.added).isEmpty()
  }

  @Test
  fun onUpdate_addedAndRemoved() {
    val proxy = mockCollectionStorageProxy()
    val handle = createHandle(proxy = proxy)
    val unchangedId = "unchanged-id"
    val oldId = "old-id"
    val newId = "new-id"
    val captor = argumentCaptor<(Set<RawEntity>, Set<RawEntity>) -> Unit>()
    whenever(proxy.addOnUpdate(any(), captor.capture())).then {
      captor.firstValue(
        setOf(RawEntity(unchangedId), RawEntity(oldId)),
        setOf(RawEntity(unchangedId), RawEntity(newId))
      )
    }

    var collectionDelta: CollectionDelta<DummyEntity>? = null
    handle.onUpdate({ delta -> collectionDelta = delta })

    assertThat(collectionDelta!!.removed).containsExactly(DummyEntity(oldId))
    assertThat(collectionDelta!!.added).containsExactly(DummyEntity(newId))
  }

  @Test
  fun onDesync() {
    val proxy = mockCollectionStorageProxy()
    val handle = createHandle(handleName = HANDLE_NAME, particleName = PARTICLE_NAME, proxy = proxy)
    val action: () -> Unit = {}

    handle.onDesync(action)

    verify(proxy).addOnDesync(eq(CallbackIdentifier(HANDLE_NAME, PARTICLE_NAME)), eq(action))
  }

  @Test
  fun onResync() {
    val proxy = mockCollectionStorageProxy()
    val handle = createHandle(handleName = HANDLE_NAME, particleName = PARTICLE_NAME, proxy = proxy)
    val action: () -> Unit = {}

    handle.onResync(action)

    verify(proxy).addOnResync(eq(CallbackIdentifier(HANDLE_NAME, PARTICLE_NAME)), eq(action))
  }

  @Test
  fun createReference_entityIdNull_throwsException() = runBlockingTest {
    val handle = createHandle<RawEntity>()

    val e = assertFailsWith<IllegalArgumentException> {
      handle.createReference(DummyEntity(entityId = null))
    }

    assertThat(e).hasMessageThat().isEqualTo("Entity must have an ID before it can be referenced.")
  }

  @Test
  fun createReference_entityNotStored_throwsException() = runBlockingTest {
    val proxy = mockCollectionStorageProxy()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(setOf(RAW_ENTITY1, RAW_ENTITY2))
    val handle = createHandle(proxy = proxy)

    val e = assertFailsWith<IllegalArgumentException> { handle.createReference(DummyEntity("25")) }

    assertThat(e).hasMessageThat().isEqualTo("Entity is not stored in the Collection.")
  }

  @Test
  fun createReference_entityExpired_throwsException() = runBlockingTest {
    val proxy = mockCollectionStorageProxy()
    whenever(proxy.getParticleViewUnsafe()).thenReturn(setOf(RAW_ENTITY1, RAW_ENTITY2))
    val storageAdapter = mockStorageAdapter()
    whenever(storageAdapter.isExpired(RAW_ENTITY1)).thenReturn(true)
    val handle = createHandle(proxy = proxy, storageAdapter = storageAdapter)

    val e = assertFailsWith<IllegalArgumentException> {
      handle.createReference(DummyEntity(RAW_ENTITY1.id))
    }

    assertThat(e).hasMessageThat().isEqualTo("Entity is not stored in the Collection.")
  }

  @Test
  fun createReference_notReferenceModeStorageProxy_throws() = runBlockingTest {
    val proxy = mockCollectionStorageProxy()
    val id = "1"
    whenever(proxy.getParticleViewUnsafe()).thenReturn(setOf(RawEntity(id), RAW_ENTITY2))
    val handle = createHandle(proxy = proxy)

    val e = assertFailsWith<IllegalArgumentException> { handle.createReference(DummyEntity(id)) }

    assertThat(e).hasMessageThat().isEqualTo(
      "ReferenceModeStorageKey required in order to create references."
    )
  }

  @Test
  fun createReference_success_correctEntity() = runBlockingTest {
    val proxy = mockCollectionStorageProxy()
    val id = "1"
    whenever(proxy.getParticleViewUnsafe()).thenReturn(setOf(RawEntity(id), RAW_ENTITY2))
    whenever(proxy.storageKey).thenReturn(
      ReferenceModeStorageKey(RamDiskStorageKey("x"), RamDiskStorageKey("y"))
    )

    val handle = createHandle(proxy = proxy)

    val reference = handle.createReference(DummyEntity(id))
    assertThat(reference.entityId).isEqualTo(id)
  }

  companion object {
    private const val HANDLE_NAME = "myHandle"
    private const val PARTICLE_NAME = "myParticle"
    private val RAW_ENTITY1 = RawEntity("1")
    private val RAW_ENTITY2 = RawEntity("2")
    private val RAW_ENTITY3 = RawEntity("3")
    private val RAW_ENTITY4 = RawEntity("4")
  }
}
