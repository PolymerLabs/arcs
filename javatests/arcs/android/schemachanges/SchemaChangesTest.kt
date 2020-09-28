package arcs.android.schemachanges

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.core.data.Capability.Ttl
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.entity.Entity
import arcs.core.entity.EntitySpec
import arcs.core.entity.HandleSpec
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.awaitReady
import arcs.core.host.EntityHandleManager
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.storage.DirectStorageEndpointManager
import arcs.core.storage.StorageKey
import arcs.core.storage.StoreManager
import arcs.core.storage.StoreWriteBack
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.WriteBackForTesting
import arcs.core.testutil.handles.dispatchFetchAll
import arcs.core.testutil.handles.dispatchStore
import arcs.jvm.util.testutil.FakeTime
import arcs.sdk.android.storage.AndroidDriverAndKeyConfigurator
import arcs.sdk.android.storage.ServiceStoreFactory
import arcs.sdk.android.storage.service.testutil.TestConnectionFactory
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@Suppress("EXPERIMENTAL_API_USAGE", "UNCHECKED_CAST")
@RunWith(AndroidJUnit4::class)
class SchemaChangesTest {
  private val schedulerProvider = SimpleSchedulerProvider(Dispatchers.Default)
  private val collectionKey =
    ReferenceModeStorageKey(
      backingKey = DatabaseStorageKey.Persistent(
        "entities",
        TestParticle_Entity.SCHEMA.hash
      ),
      storageKey = DatabaseStorageKey.Persistent(
        "meta",
        TestParticle_Entity.SCHEMA.hash
      )
    )
  private val app: Application = ApplicationProvider.getApplicationContext()

  // Create a new storeManager and handleManager on each call, to avoid reading cached data.
  private val storeManager: DirectStorageEndpointManager
    get() = DirectStorageEndpointManager(
      StoreManager(ServiceStoreFactory(app, connectionFactory = TestConnectionFactory(app)))
    )
  private val handleManager: EntityHandleManager
    get() = EntityHandleManager(
      arcId = "arcId",
      hostId = "hostId",
      time = FakeTime(),
      scheduler = schedulerProvider("myArc"),
      storageEndpointManager = storeManager
    )

  @Before
  fun setUp() {
    StoreWriteBack.writeBackFactoryOverride = WriteBackForTesting
    AndroidDriverAndKeyConfigurator.configure(app)
    WorkManagerTestInitHelper.initializeTestWorkManager(app)
  }

  @After
  fun tearDown() {
    WriteBackForTesting.clear()
    schedulerProvider.cancelAll()
  }

  @Test
  fun updateSchema_withNewField() = runBlocking<Unit> {
    val writeHandle = handleManager.createCollectionHandle(
      collectionKey,
      entitySpec = TestParticle_Entity
    )

    val entity = TestParticle_Entity(3, "foo")
    writeHandle.dispatchStore(entity)

    val readHandle = handleManager.createCollectionHandle(
      collectionKey,
      entitySpec = TestParticle_EntityWithField
    )

    val entityOut = readHandle.dispatchFetchAll().single()
    assertThat(entityOut.aField).isEqualTo(entity.aField)
    assertThat(entityOut.otherField).isEqualTo(entity.otherField)
    assertThat(entityOut.newField).isEqualTo(0.0)
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
