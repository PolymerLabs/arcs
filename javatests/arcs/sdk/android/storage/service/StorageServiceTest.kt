/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.sdk.android.storage.service

import android.app.Application
import android.content.Intent
import android.os.IBinder
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.WorkInfo
import androidx.work.WorkManager
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.common.resurrection.ResurrectionRequest
import arcs.android.storage.database.DatabaseGarbageCollectionPeriodicTask
import arcs.android.storage.service.BindingContext
import arcs.android.storage.service.IStorageService
import arcs.android.storage.service.StorageServiceNgImpl
import arcs.android.storage.service.suspendForResultCallback
import arcs.android.storage.toProto
import arcs.android.storage.ttl.PeriodicCleanupTask
import arcs.android.util.testutil.AndroidLogRule
import arcs.core.crdt.CrdtCount
import arcs.core.data.CountType
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StoreOptions
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.flags.BuildFlagDisabledError
import arcs.flags.BuildFlags
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.Shadows.shadowOf

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class StorageServiceTest {

  @get:Rule
  val log = AndroidLogRule()

  private lateinit var app: Application
  private lateinit var storeOptions: StoreOptions
  private lateinit var workManager: WorkManager

  @Before
  fun setUp() {
    DriverAndKeyConfigurator.configure(null)
    app = ApplicationProvider.getApplicationContext()
    WorkManagerTestInitHelper.initializeTestWorkManager(app)
    workManager = WorkManager.getInstance(app)
    storeOptions = StoreOptions(
      RamDiskStorageKey("count"),
      CountType()
    )
    BuildFlags.STORAGE_SERVICE_NG = false
  }

  @Test
  fun bindingWithStorageServiceIntent_createsBindingContext() = runBlocking {
    val intent = StorageServiceIntentHelpers.storageServiceIntent(
      app,
      storeOptions
    )

    val deferredBinder = CompletableDeferred<IBinder?>()

    Robolectric.buildService(StorageService::class.java, intent)
      .create()
      .bind()
      .also {
        deferredBinder.complete(it.get().onBind(intent))
      }

    val binder = deferredBinder.await()
    assertThat(binder).isInstanceOf(BindingContext::class.java)
  }

  @Test
  fun storageServiceNgIntent_requiresBuildFlag(): Unit = runBlocking {
    BuildFlags.STORAGE_SERVICE_NG = false

    assertFailsWith<BuildFlagDisabledError> {
      StorageServiceIntentHelpers.storageServiceNgIntent(
        app
      )
    }
    Unit
  }

  @Test
  fun bindingWithStorageServiceNgIntent_createsStorageServiceNgService() = runBlocking {
    BuildFlags.STORAGE_SERVICE_NG = true
    val intent = StorageServiceIntentHelpers.storageServiceNgIntent(
      app
    )

    val deferredBinder = CompletableDeferred<IBinder?>()

    Robolectric.buildService(StorageService::class.java, intent)
      .create()
      .bind()
      .also {
        deferredBinder.complete(it.get().onBind(intent))
      }

    val binder = deferredBinder.await()
    assertThat(binder).isInstanceOf(StorageServiceNgImpl::class.java)
  }

  @Test
  fun sendingProxyMessage_resultsInResurrection() = lifecycle(storeOptions) { service, context ->
    // Setup:
    // Add a resurrection request to the storage service.
    val resurrectionRequestIntent = Intent(app, StorageService::class.java).apply {
      ResurrectionRequest.createDefault(app, listOf(storeOptions.storageKey), "test")
        .populateRequestIntent(this)
    }
    service.onStartCommand(resurrectionRequestIntent, 0, 0)

    // Act:
    // Issue a proxy message to the binding context (and transitively: to the storage service)
    val success = runBlocking {
      // Wait to let the resurrection request propagate.
      while (service.loadJob == null) {
        delay(100)
      }
      service.loadJob?.join()

      val op = CrdtCount.Operation.Increment("foo", 0 to 1)
      val proxyMessage = ProxyMessage.Operations<CrdtCount.Data, CrdtCount.Operation, Int>(
        listOf(op), id = 1
      )

      suspendForResultCallback {
        context.sendProxyMessage(proxyMessage.toProto().toByteArray(), it)
      }

      suspendForResultCallback {
        context.idle(10000, it)
      }

      true
    }
    assertThat(success).isTrue()

    // Verify:
    // Pass the nextStartedService to the resurrectionHelper. If it was a resurrection intent,
    // the helper's callback will be triggered, adding to `receivedUpdates`.
    val shadowApp = shadowOf(app)

    val next = shadowApp.nextStartedService
    val id = next.getStringExtra(ResurrectionRequest.EXTRA_REGISTRATION_TARGET_ID)
    val ids = next.getStringArrayListExtra(ResurrectionRequest.EXTRA_RESURRECT_NOTIFIER)
    assertThat(id).isEqualTo("test")
    assertThat(ids).containsExactly(storeOptions.storageKey.toString())
    assertThat(shadowApp.nextStartedService).isNull()
  }

  @Test
  fun storageService_unbind_closesStores() = runBlocking<Unit> {
    val intent = StorageServiceIntentHelpers.storageServiceIntent(
      app,
      storeOptions
    )

    val storeOptions2 = StoreOptions(
      RamDiskStorageKey("count2"),
      CountType()
    )

    val intent2 = StorageServiceIntentHelpers.storageServiceIntent(
      app,
      storeOptions2
    )

    Robolectric.buildService(StorageService::class.java, intent)
      .create()
      .bind()
      .also {
        val binder1 = it.get().onBind(intent) as IStorageService
        // Perform some action to trigger store creation
        suspendForResultCallback { callback -> binder1.idle(1L, callback) }
        assertThat(it.get().storeCount).isEqualTo(1)
        it.get().onBind(intent2)
        val binder2 = it.get().onBind(intent2) as IStorageService
        // Perform some action to trigger store creation
        suspendForResultCallback { callback -> binder2.idle(1L, callback) }
        assertThat(it.get().storeCount).isEqualTo(2)
        it.get().onUnbind(intent)
        assertThat(it.get().storeCount).isEqualTo(1)
        it.get().onUnbind(intent2)
        assertThat(it.get().storeCount).isEqualTo(0)
      }
      .destroy()
  }

  @Test
  fun testPeriodicJobsConfig_default() = runBlocking {
    StorageService().onCreate()

    assertEnqueued(TTL_TAG)
    assertEnqueued(GC_TAG)
  }

  @Test
  fun testPeriodicJobsConfig_subclass_disabled() = runBlocking {
    class MyStorageService : StorageService() {
      override val config = StorageServiceConfig(false, 1, false, 1)
    }
    MyStorageService().onCreate()

    assertNotEnqueued(TTL_TAG)
    assertNotEnqueued(GC_TAG)
  }

  @Test
  fun testPeriodicJobsConfig_subclass_oneOnOneOff() = runBlocking {
    class MyStorageService : StorageService() {
      override val config = StorageServiceConfig(false, 1, true, 1)
    }
    MyStorageService().onCreate()

    assertNotEnqueued(TTL_TAG)
    assertEnqueued(GC_TAG)
  }

  @Test
  fun testPeriodicJobsConfig_subclass_stopStart() = runBlocking {
    class MyStorageService : StorageService() {
      fun changeConfig(config: StorageServiceConfig) = schedulePeriodicJobs(config)
    }

    val sts = MyStorageService()
    sts.onCreate()

    assertEnqueued(TTL_TAG)
    assertEnqueued(GC_TAG)

    sts.changeConfig(StorageService.StorageServiceConfig(false, 2, false, 2))

    assertCanceled(TTL_TAG)
    assertCanceled(GC_TAG)

    sts.changeConfig(StorageService.StorageServiceConfig(true, 2, false, 2))

    assertEnqueued(TTL_TAG)
    assertCanceled(GC_TAG)
  }

  @Test
  fun testPeriodicJobsConfig_subclass_cancelAll() = runBlocking {
    StorageService().onCreate()

    assertEnqueued(TTL_TAG)
    assertEnqueued(GC_TAG)

    StorageService.cancelAllPeriodicJobs(app)

    assertCanceled(TTL_TAG)
    assertCanceled(GC_TAG)
  }

  @Test
  fun testPeriodicJobsConfig_startWithDifferentWorkerClass() = runBlocking {
    class MyStorageService : StorageService() {
      override val config = StorageServiceConfig(
        ttlJobEnabled = true,
        garbageCollectionJobEnabled = true,
        useGarbageCollectionTaskV2 = true
      )
    }
    MyStorageService().onCreate()

    assertEnqueued(TTL_TAG)
    assertEnqueued(GC_V2_TAG)
    assertNotEnqueued(GC_TAG)
  }

  @Test
  fun testPeriodicJobsConfig_changeWorkerClass() = runBlocking {
    class MyStorageService : StorageService() {
      fun changeConfig(config: StorageServiceConfig) = schedulePeriodicJobs(config)
    }
    val sts = MyStorageService()
    sts.onCreate()

    assertEnqueued(TTL_TAG)
    assertEnqueued(GC_TAG)
    assertNotEnqueued(GC_V2_TAG)

    sts.changeConfig(
      StorageService.StorageServiceConfig(
        ttlJobEnabled = true,
        garbageCollectionJobEnabled = true,
        useGarbageCollectionTaskV2 = true
      )
    )

    assertEnqueued(TTL_TAG)
    assertCanceled(GC_TAG)
    assertEnqueued(GC_V2_TAG)

    sts.changeConfig(
      StorageService.StorageServiceConfig(
        ttlJobEnabled = true,
        garbageCollectionJobEnabled = false,
        useGarbageCollectionTaskV2 = true
      )
    )

    assertCanceled(GC_TAG)
    assertCanceled(GC_V2_TAG)
  }

  private fun assertEnqueued(tag: String) {
    val jobs = workManager.getWorkInfosForUniqueWork(tag).get()
    assertThat(jobs).hasSize(1)
    assertThat(jobs.single().state).isEqualTo(WorkInfo.State.ENQUEUED)
  }

  private fun assertCanceled(tag: String) {
    val jobs = workManager.getWorkInfosForUniqueWork(tag).get()
    assertThat(jobs).hasSize(1)
    assertThat(jobs.single().state).isEqualTo(WorkInfo.State.CANCELLED)
  }

  private fun assertNotEnqueued(tag: String) {
    val jobs = workManager.getWorkInfosForUniqueWork(tag).get()
    assertThat(jobs).isEmpty()
  }

  private fun lifecycle(
    storeOptions: StoreOptions,
    block: (StorageService, BindingContext) -> Unit
  ) {
    val intent = StorageServiceIntentHelpers.storageServiceIntent(
      app,
      storeOptions
    )
    Robolectric.buildService(StorageService::class.java, intent)
      .create()
      .bind()
      .also {
        val context = it.get().onBind(intent)
        block(it.get(), context as BindingContext)
        it.get().onUnbind(intent)
      }
      .destroy()
  }

  companion object {
    private const val TTL_TAG = PeriodicCleanupTask.WORKER_TAG
    private const val GC_TAG = DatabaseGarbageCollectionPeriodicTask.WORKER_TAG
    private const val GC_V2_TAG = DatabaseGarbageCollectionPeriodicTaskV2.WORKER_TAG
  }
}
