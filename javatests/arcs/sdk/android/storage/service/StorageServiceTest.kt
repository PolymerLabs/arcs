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
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.WorkInfo
import androidx.work.WorkManager
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.common.resurrection.ResurrectionRequest
import arcs.android.storage.database.DatabaseGarbageCollectionPeriodicTask
import arcs.android.storage.service.BindingContext
import arcs.android.storage.service.IStorageService
import arcs.android.storage.service.suspendForResultCallback
import arcs.android.storage.toProto
import arcs.android.storage.ttl.PeriodicCleanupTask
import arcs.core.crdt.CrdtCount
import arcs.core.data.CountType
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StoreOptions
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.keys.RamDiskStorageKey
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.Shadows.shadowOf

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class StorageServiceTest {
  private lateinit var app: Application
  private lateinit var storeOptions: StoreOptions
  private lateinit var workManager: WorkManager

  private val ttlTag = PeriodicCleanupTask.WORKER_TAG
  private val gcTag = DatabaseGarbageCollectionPeriodicTask.WORKER_TAG

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

    assertEnqueued(ttlTag)
    assertEnqueued(gcTag)
  }

  @Test
  fun testPeriodicJobsConfig_subclass_disabled() = runBlocking {
    class MyStorageService : StorageService() {
      override val config = StorageServiceConfig(false, 1, false, 1)
    }
    MyStorageService().onCreate()

    assertNotEnqueued(ttlTag)
    assertNotEnqueued(gcTag)
  }

  @Test
  fun testPeriodicJobsConfig_subclass_oneOnOneOff() = runBlocking {
    class MyStorageService : StorageService() {
      override val config = StorageServiceConfig(false, 1, true, 1)
    }
    MyStorageService().onCreate()

    assertNotEnqueued(ttlTag)
    assertEnqueued(gcTag)
  }

  @Test
  fun testPeriodicJobsConfig_subclass_stopStart() = runBlocking {
    class MyStorageService : StorageService() {
      fun changeConfig(config: StorageServiceConfig) = schedulePeriodicJobs(config)
    }

    val sts = MyStorageService()
    sts.onCreate()

    assertEnqueued(ttlTag)
    assertEnqueued(gcTag)

    sts.changeConfig(StorageService.StorageServiceConfig(false, 2, false, 2))

    assertCanceled(ttlTag)
    assertCanceled(gcTag)

    sts.changeConfig(StorageService.StorageServiceConfig(true, 2, false, 2))

    assertEnqueued(ttlTag)
    assertCanceled(gcTag)
  }

  @Test
  fun testPeriodicJobsConfig_subclass_cancelAll() = runBlocking {
    StorageService().onCreate()

    assertEnqueued(ttlTag)
    assertEnqueued(gcTag)

    StorageService.cancelAllPeriodicJobs(app)

    assertCanceled(ttlTag)
    assertCanceled(gcTag)
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
}
