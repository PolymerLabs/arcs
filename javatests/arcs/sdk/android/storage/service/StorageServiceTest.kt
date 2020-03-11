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
import arcs.android.common.resurrection.ResurrectionRequest
import arcs.android.crdt.ParcelableCrdtType
import arcs.android.storage.service.BindingContext
import arcs.android.storage.service.DeferredResult
import arcs.android.storage.toParcelable
import arcs.core.crdt.CrdtCount
import arcs.core.data.CountType
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StorageKey
import arcs.core.storage.StoreOptions
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.sdk.android.storage.ResurrectionHelper
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Ignore
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.Shadows.shadowOf

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class StorageServiceTest {
    private lateinit var app: Application
    private lateinit var storeOptions: StoreOptions<CrdtCount.Data, CrdtCount.Operation, Int>

    @Before
    fun setUp() {
        app = ApplicationProvider.getApplicationContext()
        storeOptions = StoreOptions(
            RamDiskStorageKey("count"),
            CountType()
        )
    }

    @Test
    @Ignore("Travis seems to dislike this test. Be sure to run it locally, however.")
    fun sendingProxyMessage_resultsInResurrection() = lifecycle(storeOptions) { service, context ->
        // Setup:
        // Create a resurrection helper we'll use to collect updated storage keys coming from the
        // ShadowApplication-captured nextStartedService intents.
        val receivedUpdates = mutableListOf<List<StorageKey>>()
        val resurrectionHelper = ResurrectionHelper(app) { keys: List<StorageKey> ->
            receivedUpdates.add(keys)
        }

        // Setup:
        // Add a resurrection request to the storage service.
        val resurrectionRequestIntent = Intent(app, StorageService::class.java).apply {
            ResurrectionRequest.createDefault(app, listOf(storeOptions.storageKey))
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
            val deferredResult = DeferredResult(this.coroutineContext)
            context.sendProxyMessage(
                proxyMessage.toParcelable(ParcelableCrdtType.Count),
                deferredResult
            )

            deferredResult.await()
        }
        assertThat(success).isTrue()

        // Verify:
        // Pass the nextStartedService to the resurrectionHelper. If it was a resurrection intent,
        // the helper's callback will be triggered, adding to `receivedUpdates`.
        val shadowApp = shadowOf(app)
        resurrectionHelper.onStartCommand(shadowApp.nextStartedService)
        assertThat(receivedUpdates).hasSize(1)
        assertThat(receivedUpdates[0]).containsExactly(storeOptions.storageKey)
    }

    private fun lifecycle(
        storeOptions: StoreOptions<*, *, *>,
        block: (StorageService, BindingContext) -> Unit
    ) {
        val intent = StorageService.createBindIntent(
            app,
            storeOptions.toParcelable(ParcelableCrdtType.Count)
        )
        Robolectric.buildService(StorageService::class.java, intent)
            .create()
            .bind()
            .also {
                val context = it.get().onBind(intent)
                block(it.get(), context as BindingContext)
            }
            .destroy()
    }
}
