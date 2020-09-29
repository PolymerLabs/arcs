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
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.storage.StorageEndpointManager
import arcs.core.storage.StorageKey
import arcs.core.storage.StoreWriteBack
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.database.ForeignReferenceManager
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.WriteBackForTesting
import arcs.core.testutil.handles.dispatchCreateReference
import arcs.core.testutil.handles.dispatchFetchAll
import arcs.core.testutil.handles.dispatchStore
import arcs.jvm.util.testutil.FakeTime
import arcs.sdk.android.storage.AndroidStorageServiceEndpointManager
import arcs.sdk.android.storage.service.testutil.TestConnectionFactory
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@Suppress("EXPERIMENTAL_API_USAGE", "UNCHECKED_CAST")
@RunWith(AndroidJUnit4::class)
class HardReferenceTest {
  private val schedulerProvider = SimpleSchedulerProvider(Dispatchers.Default)
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
  private val storeManager: StorageEndpointManager
    get() = AndroidStorageServiceEndpointManager(
      CoroutineScope(Dispatchers.Default),
      TestConnectionFactory(app)
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
      scheduler = schedulerProvider("myArc"),
      storageEndpointManager = storeManager,
      foreignReferenceChecker = foreignReferenceChecker
    )

  @Before
  fun setUp() {
    StoreWriteBack.writeBackFactoryOverride = WriteBackForTesting
    DriverAndKeyConfigurator.configure(dbManager)
    WorkManagerTestInitHelper.initializeTestWorkManager(app)
  }

  @After
  fun tearDown() {
    WriteBackForTesting.clear()
    schedulerProvider.cancelAll()
  }

  @Test
  fun hardReferenceWorkEndToEnd() = runBlocking<Unit> {
    val referencedEntityHandle = handleManager.createCollectionHandle(
      referencedEntitiesKey,
      entitySpec = TestReferencesParticle_Entity_Hard
    )
    val child = TestReferencesParticle_Entity_Hard(5)
    referencedEntityHandle.dispatchStore(child)
    val childRef = referencedEntityHandle.dispatchCreateReference(child)
    val entity = TestReferencesParticle_Entity(hard = childRef)

    assertThat(entity.hard!!.isHardReference).isTrue()

    val writeHandle = handleManager.createCollectionHandle(
      collectionKey,
      entitySpec = TestReferencesParticle_Entity
    )
    writeHandle.dispatchStore(entity)
    val readHandle = handleManager.createCollectionHandle(
      collectionKey,
      entitySpec = TestReferencesParticle_Entity
    )
    val entityOut = readHandle.dispatchFetchAll().single()

    assertThat(entityOut).isEqualTo(entity)

    val referenceOut = entityOut.hard!!

    assertThat(referenceOut).isEqualTo(childRef)
    assertThat(referenceOut.isHardReference).isTrue()
    assertThat(referenceOut.dereference()).isEqualTo(child)
  }

  @Test
  fun foreignReferenceWorkEndToEnd() = runBlocking<Unit> {
    val writeHandle = handleManager.createCollectionHandle(
      collectionKey,
      entitySpec = TestReferencesParticle_Entity
    )
    val id = "id"
    val reference =
      writeHandle.createForeignReference(TestReferencesParticle_Entity_Foreign, id)

    assertThat(reference?.dereference()).isNotNull()

    val entity = TestReferencesParticle_Entity(foreign = reference)
    writeHandle.dispatchStore(entity)
    val readHandle = handleManager.createCollectionHandle(
      collectionKey,
      entitySpec = TestReferencesParticle_Entity
    )
    val entityOut = readHandle.dispatchFetchAll().single()

    assertThat(entityOut).isEqualTo(entity)

    val referenceOut = entityOut.foreign!!

    assertThat(referenceOut.entityId).isEqualTo(id)
    assertThat(referenceOut.dereference()).isNotNull()
  }

  @Test
  fun hardForeignReferenceWorkEndToEnd() = runBlocking<Unit> {
    val writeHandle = handleManager.createCollectionHandle(
      collectionKey,
      TestReferencesParticle_Entity
    )
    val id = "id"
    val reference = writeHandle.createForeignReference(TestReferencesParticle_Entity_Foreign, id)
    assertThat(reference?.dereference()).isNotNull()

    val entity = TestReferencesParticle_Entity(hardForeign = reference)
    writeHandle.dispatchStore(entity)

    val readHandle = handleManager.createCollectionHandle(
      collectionKey,
      TestReferencesParticle_Entity
    )

    assertThat(readHandle.dispatchFetchAll()).containsExactly(entity)
    val entityOut = readHandle.dispatchFetchAll().single()
    assertThat(entityOut.hardForeign!!.dereference()).isNotNull()

    // Because this is a foreign and hard reference, we can use the foreignReferenceManager to
    // delete all entities that contain it.
    foreignReferenceManager.triggerDatabaseDeletion(
      TestReferencesParticle_Entity_Foreign.SCHEMA,
      "id"
    )
    val readHandle2 = handleManager.createCollectionHandle(
      collectionKey,
      TestReferencesParticle_Entity
    )

    assertThat(readHandle2.dispatchFetchAll()).isEmpty()
  }

  @Test
  fun hardForeignReferenceReconcile() = runBlocking<Unit> {
    val writeHandle = handleManager.createCollectionHandle(
      collectionKey,
      TestReferencesParticle_Entity
    )
    val reference1 =
      writeHandle.createForeignReference(TestReferencesParticle_Entity_Foreign, "id1")
    val entity1 = TestReferencesParticle_Entity(hardForeign = reference1)
    val reference2 =
      writeHandle.createForeignReference(TestReferencesParticle_Entity_Foreign, "id2")
    val entity2 = TestReferencesParticle_Entity(hardForeign = reference2)
    writeHandle.dispatchStore(entity1)
    writeHandle.dispatchStore(entity2)

    val readHandle = handleManager.createCollectionHandle(
      collectionKey,
      TestReferencesParticle_Entity
    )

    assertThat(readHandle.dispatchFetchAll()).containsExactly(entity1, entity2)

    foreignReferenceManager.reconcile(TestReferencesParticle_Entity_Foreign.SCHEMA, setOf("id2"))
    val readHandle2 = handleManager.createCollectionHandle(
      collectionKey,
      TestReferencesParticle_Entity
    )

    assertThat(readHandle2.dispatchFetchAll()).containsExactly(entity2)
  }

  @Suppress("UNCHECKED_CAST")
  private suspend fun <T : Entity> EntityHandleManager.createCollectionHandle(
    key: StorageKey,
    entitySpec: EntitySpec<T>
  ) = createHandle(
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
