package arcs.android.entity

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.core.data.Capability.Ttl
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.entity.Entity
import arcs.core.entity.EntitySpec
import arcs.core.entity.ForeignReferenceChecker
import arcs.core.entity.ForeignReferenceCheckerImpl
import arcs.core.entity.HandleSpec
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.awaitReady
import arcs.core.host.EntityHandleManager
import arcs.core.storage.StorageEndpointManager
import arcs.core.storage.StorageKey
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.database.ForeignReferenceManager
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.testutil.handles.dispatchCreateReference
import arcs.core.testutil.handles.dispatchFetchAll
import arcs.core.testutil.handles.dispatchStore
import arcs.core.util.Scheduler
import arcs.jvm.util.testutil.FakeTime
import arcs.sdk.android.storage.AndroidStorageServiceEndpointManager
import arcs.sdk.android.storage.service.testutil.TestBindHelper
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@Suppress("EXPERIMENTAL_API_USAGE", "UNCHECKED_CAST")
@RunWith(AndroidJUnit4::class)
class HardReferenceTest {
  private val referencedEntitiesKey =
    ReferenceModeStorageKey(
      backingKey = DatabaseStorageKey.Persistent(
        "referencedEntities",
        TestReferencesParticle_Entity_Hard.SCHEMA.hash
      ),
      storageKey = DatabaseStorageKey.Persistent(
        "set-referencedEntities",
        TestReferencesParticle_Entity_Hard.SCHEMA.hash
      )
    )
  private val collectionKey =
    ReferenceModeStorageKey(
      backingKey = DatabaseStorageKey.Persistent(
        "entities",
        TestReferencesParticle_Entity.SCHEMA.hash
      ),
      storageKey = DatabaseStorageKey.Persistent(
        "set-ent",
        TestReferencesParticle_Entity.SCHEMA.hash
      )
    )
  private val app: Application = ApplicationProvider.getApplicationContext()
  private val dbManager = AndroidSqliteDatabaseManager(app)
  private val foreignReferenceManager = ForeignReferenceManager(dbManager)

  // Create a new storeManager and handleManager on each call, to avoid reading cached data.
  private val scope = CoroutineScope(Dispatchers.Default)
  private val storeManager: StorageEndpointManager
    get() = AndroidStorageServiceEndpointManager(
      scope,
      TestBindHelper(app)
    )
  private val foreignReferenceChecker: ForeignReferenceChecker =
    ForeignReferenceCheckerImpl(
      mapOf(
        TestReferencesParticle_Entity_Foreign.SCHEMA to { _ ->
          true
        }
      )
    )
  private val handleManager: EntityHandleManager
    get() = EntityHandleManager(
      arcId = "arcId",
      hostId = "hostId",
      time = FakeTime(),
      scheduler = Scheduler(scope),
      storageEndpointManager = storeManager,
      foreignReferenceChecker = foreignReferenceChecker
    )

  @Before
  fun setUp() {
    DriverAndKeyConfigurator.configure(dbManager)
    WorkManagerTestInitHelper.initializeTestWorkManager(app)
  }

  @After
  fun tearDown() {
    scope.cancel()
  }

  @Test
  fun hardReferenceWorkEndToEnd() = runBlocking<Unit> {
    val referencedEntityHandle = createCollectionHandle(
      referencedEntitiesKey,
      entitySpec = TestReferencesParticle_Entity_Hard
    )
    val child = TestReferencesParticle_Entity_Hard(5)
    referencedEntityHandle.dispatchStore(child)
    val childRef = referencedEntityHandle.dispatchCreateReference(child)
    val entity = TestReferencesParticle_Entity(hard = childRef)

    assertThat(entity.hard!!.isHardReference).isTrue()

    entityHandle().dispatchStore(entity)
    val entityOut = entityHandle().dispatchFetchAll().single()

    assertThat(entityOut).isEqualTo(entity)

    val referenceOut = entityOut.hard!!

    assertThat(referenceOut).isEqualTo(childRef)
    assertThat(referenceOut.isHardReference).isTrue()
    assertThat(referenceOut.dereference()).isEqualTo(child)
  }

  @Test
  fun foreignReferenceWorkEndToEnd() = runBlocking<Unit> {
    val writeHandle = entityHandle()
    val id = "id"
    val reference =
      writeHandle.createForeignReference(TestReferencesParticle_Entity_Foreign, id)

    assertThat(reference?.dereference()).isNotNull()

    val entity = TestReferencesParticle_Entity(foreign = reference)
    writeHandle.dispatchStore(entity)
    val entityOut = entityHandle().dispatchFetchAll().single()

    assertThat(entityOut).isEqualTo(entity)

    val referenceOut = entityOut.foreign!!

    assertThat(referenceOut.entityId).isEqualTo(id)
    assertThat(referenceOut.dereference()).isNotNull()
  }

  @Test
  fun hardForeignReferenceWorkEndToEnd() = runBlocking<Unit> {
    val writeHandle = entityHandle()
    val id = "id"
    val reference = writeHandle.createForeignReference(TestReferencesParticle_Entity_Foreign, id)
    assertThat(reference?.dereference()).isNotNull()

    val entity = TestReferencesParticle_Entity(hardForeign = reference)
    writeHandle.dispatchStore(entity)

    val readHandle = entityHandle()

    assertThat(readHandle.dispatchFetchAll()).containsExactly(entity)
    val entityOut = readHandle.dispatchFetchAll().single()
    assertThat(entityOut.hardForeign!!.dereference()).isNotNull()

    // Because this is a foreign and hard reference, we can use the foreignReferenceManager to
    // delete all entities that contain it.
    foreignReferenceManager.triggerDatabaseDeletion(
      TestReferencesParticle_Entity_Foreign.SCHEMA,
      "id"
    )
    assertThat(entityHandle().dispatchFetchAll()).isEmpty()
  }

  @Test
  fun hardForeignReferenceReconcile() = runBlocking<Unit> {
    val writeHandle = entityHandle()
    val reference1 =
      writeHandle.createForeignReference(TestReferencesParticle_Entity_Foreign, "id1")
    val entity1 = TestReferencesParticle_Entity(hardForeign = reference1)
    val reference2 =
      writeHandle.createForeignReference(TestReferencesParticle_Entity_Foreign, "id2")
    val entity2 = TestReferencesParticle_Entity(hardForeign = reference2)
    writeHandle.dispatchStore(entity1)
    writeHandle.dispatchStore(entity2)

    val readHandle = entityHandle()

    assertThat(readHandle.dispatchFetchAll()).containsExactly(entity1, entity2)

    foreignReferenceManager.reconcile(TestReferencesParticle_Entity_Foreign.SCHEMA, setOf("id2"))
    val readHandle2 = entityHandle()

    assertThat(readHandle2.dispatchFetchAll()).containsExactly(entity2)
  }

  @Test
  fun hardForeignReferenceInlineEntities() = runBlocking<Unit> {
    val writeHandle = entityHandle()
    val id = "id"
    val reference = writeHandle.createForeignReference(TestReferencesParticle_Entity_Foreign, id)
    val inner = TestReferencesParticle_Entity_Inner(ref = reference)
    val entity = TestReferencesParticle_Entity(inner_ = inner)
    writeHandle.dispatchStore(entity)

    assertThat(entity.inner_.ref?.isHardReference).isTrue()
    assertThat(entity.inner_.ref?.dereference()).isNotNull()
    assertThat(entityHandle().dispatchFetchAll()).containsExactly(entity)

    foreignReferenceManager.triggerDatabaseDeletion(
      TestReferencesParticle_Entity_Foreign.SCHEMA,
      id
    )

    assertThat(entityHandle().dispatchFetchAll()).isEmpty()
  }

  @Test
  fun hardForeignReferenceNestedInlineEntities() = runBlocking<Unit> {
    val writeHandle = entityHandle()
    val id = "id"
    val reference = writeHandle.createForeignReference(TestReferencesParticle_Entity_Foreign, id)
    val inner = TestReferencesParticle_Entity_Inner(ref = reference)
    val nested = TestReferencesParticle_Entity_Nested(inner_ = inner)
    val entity = TestReferencesParticle_Entity(nested = nested)
    writeHandle.dispatchStore(entity)

    assertThat(entity.nested.inner_.ref?.isHardReference).isTrue()
    assertThat(entity.nested.inner_.ref?.dereference()).isNotNull()
    assertThat(entityHandle().dispatchFetchAll()).containsExactly(entity)

    foreignReferenceManager.triggerDatabaseDeletion(
      TestReferencesParticle_Entity_Foreign.SCHEMA,
      id
    )

    assertThat(entityHandle().dispatchFetchAll()).isEmpty()
  }

  @Test
  fun hardForeignReferenceInlineCollection() = runBlocking<Unit> {
    val writeHandle = entityHandle()
    val id = "id"
    val reference = writeHandle.createForeignReference(TestReferencesParticle_Entity_Foreign, id)
    val inner = TestReferencesParticle_Entity_Inner(ref = reference)
    val entity = TestReferencesParticle_Entity(inners = setOf(inner))
    writeHandle.dispatchStore(entity)

    assertThat(entity.inners.single().ref?.isHardReference).isTrue()
    assertThat(entity.inners.single().ref?.dereference()).isNotNull()
    assertThat(entityHandle().dispatchFetchAll()).containsExactly(entity)

    foreignReferenceManager.triggerDatabaseDeletion(
      TestReferencesParticle_Entity_Foreign.SCHEMA,
      id
    )

    assertThat(entityHandle().dispatchFetchAll()).isEmpty()
  }

  @Test
  fun hardForeignReferenceReferenceCollection() = runBlocking<Unit> {
    val writeHandle = entityHandle()
    val id = "id"
    val reference = writeHandle.createForeignReference(TestReferencesParticle_Entity_Foreign, id)
    assertThat(reference).isNotNull()
    val entity = TestReferencesParticle_Entity(refs = setOf(reference!!))
    writeHandle.dispatchStore(entity)

    assertThat(entity.refs.single().isHardReference).isTrue()
    assertThat(entity.refs.single().dereference()).isNotNull()
    assertThat(entityHandle().dispatchFetchAll()).containsExactly(entity)

    foreignReferenceManager.triggerDatabaseDeletion(
      TestReferencesParticle_Entity_Foreign.SCHEMA,
      id
    )

    assertThat(entityHandle().dispatchFetchAll()).isEmpty()
  }

  @Test
  fun hardForeignReferenceListInline() = runBlocking<Unit> {
    val writeHandle = entityHandle()
    val id = "id"
    val reference = writeHandle.createForeignReference(TestReferencesParticle_Entity_Foreign, id)
    val inner = TestReferencesParticle_Entity_Inner(ref = reference)
    val entity = TestReferencesParticle_Entity(list = listOf(inner))
    writeHandle.dispatchStore(entity)

    assertThat(entity.list.single().ref?.isHardReference).isTrue()
    assertThat(entity.list.single().ref?.dereference()).isNotNull()
    assertThat(entityHandle().dispatchFetchAll()).containsExactly(entity)

    foreignReferenceManager.triggerDatabaseDeletion(
      TestReferencesParticle_Entity_Foreign.SCHEMA,
      id
    )

    assertThat(entityHandle().dispatchFetchAll()).isEmpty()
  }

  @Test
  fun hardForeignReferenceListReferences() = runBlocking<Unit> {
    val writeHandle = entityHandle()
    val id = "id"
    val reference = writeHandle.createForeignReference(TestReferencesParticle_Entity_Foreign, id)
    assertThat(reference).isNotNull()
    val entity = TestReferencesParticle_Entity(reflist = listOf(reference!!))
    writeHandle.dispatchStore(entity)

    assertThat(entity.reflist.single().isHardReference).isTrue()
    assertThat(entity.reflist.single().dereference()).isNotNull()
    assertThat(entityHandle().dispatchFetchAll()).containsExactly(entity)

    foreignReferenceManager.triggerDatabaseDeletion(
      TestReferencesParticle_Entity_Foreign.SCHEMA,
      id
    )

    assertThat(entityHandle().dispatchFetchAll()).isEmpty()
  }

  private suspend fun entityHandle() =
    createCollectionHandle(collectionKey, TestReferencesParticle_Entity)

  @Suppress("UNCHECKED_CAST")
  private suspend fun <T : Entity> createCollectionHandle(
    key: StorageKey,
    entitySpec: EntitySpec<T>
  ): ReadWriteCollectionHandle<T> {
    return handleManager.createHandle(
      HandleSpec(
        "name",
        HandleMode.ReadWrite,
        CollectionType(EntityType(entitySpec.SCHEMA)),
        entitySpec
      ),
      key,
      Ttl.Infinite()
    ).awaitReady() as ReadWriteCollectionHandle<T>
  }
}
