/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.sdk.android.storage

import android.content.ComponentName
import android.content.ServiceConnection
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleObserver
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.crdt.ParcelableCrdtType
import arcs.android.storage.ParcelableStoreOptions
import arcs.android.storage.service.BindingContext
import arcs.android.storage.service.BindingContextStatsImpl
import arcs.android.storage.service.DeferredResult
import arcs.android.storage.toParcelable
import arcs.android.storage.toProto
import arcs.core.crdt.CrdtCount
import arcs.core.data.CountType
import arcs.core.storage.ProxyMessage
import arcs.core.storage.Store
import arcs.core.storage.StoreOptions
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.sdk.android.storage.service.ConnectionFactory
import arcs.sdk.android.storage.service.StorageServiceBindingDelegate
import arcs.sdk.android.storage.service.StorageServiceConnection
import com.google.common.truth.Truth.assertThat
import kotlin.coroutines.coroutineContext
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.yield
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/** Unit-Tests for the [ServiceStore]. */
@RunWith(AndroidJUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class ServiceStoreTest {
    private lateinit var lifecycle: Lifecycle
    private val storeOptions = StoreOptions<CrdtCount.Data, CrdtCount.Operation, Int>(
        RamDiskStorageKey("myData"),
        CountType()
    )

    @Before
    fun setUp() {
        RamDisk.clear()
        RamDiskDriverProvider()
        lifecycle = FakeLifecycle()
    }

    @Test
    fun getLocalData_getsLocalDataFromService() = runBlocking {
        val service = buildService(storeOptions.toParcelable(ParcelableCrdtType.Count))
        val bindingDelegate = buildBindingDelegate(service)
        val connectionFactory = buildConnectionFactory(bindingDelegate)

        val store = ServiceStore(
            storeOptions,
            ParcelableCrdtType.Count,
            lifecycle,
            connectionFactory,
            coroutineContext
        ).initialize()

        val data = store.getLocalData()

        assertThat(data.values).isEmpty()

        // Increment at the binding context directly.
        val deferredResult = DeferredResult(coroutineContext)
        service.sendProxyMessage(
            ProxyMessage.Operations<CrdtCount.Data, CrdtCount.Operation, Int>(
                listOf(CrdtCount.Operation.Increment("alice", 0 to 1)),
                null
            ).toProto().toByteArray(),
            deferredResult
        )

        deferredResult.await()

        val dataAfter = store.getLocalData()

        assertThat(dataAfter.values).containsExactly("alice", 1).inOrder()

        store.onLifecycleDestroyed()
    }

    @Test
    fun onProxyMessage_sendsProxyMessageToService() = runBlocking {
        val service = buildService(storeOptions.toParcelable(ParcelableCrdtType.Count))
        val bindingDelegate = buildBindingDelegate(service)
        val connectionFactory = buildConnectionFactory(bindingDelegate)

        val store = ServiceStore(
            storeOptions,
            ParcelableCrdtType.Count,
            lifecycle,
            connectionFactory,
            coroutineContext
        ).initialize()

        store.onProxyMessage(
            ProxyMessage.Operations(
                listOf(CrdtCount.Operation.Increment("alice", 0 to 1)),
                null
            )
        )

        yield()

        val data = store.getLocalData()
        assertThat(data.values).containsExactly("alice", 1).inOrder()

        store.onLifecycleDestroyed()
    }

    private fun buildBindingDelegate(
        service: BindingContext
    ): StorageServiceBindingDelegate = object : StorageServiceBindingDelegate {
        override fun bindStorageService(
            conn: ServiceConnection,
            flags: Int,
            options: ParcelableStoreOptions?
        ): Boolean {
            conn.onServiceConnected(ComponentName("asdf", "asdf"), service)
            return true
        }

        override fun unbindStorageService(conn: ServiceConnection) = Unit
    }

    private suspend fun buildConnectionFactory(
        bindingDelegate: StorageServiceBindingDelegate
    ): ConnectionFactory {
        val context = coroutineContext
        return { opts, type ->
            StorageServiceConnection(bindingDelegate, opts.toParcelable(type), context)
        }
    }

    private suspend fun buildService(storeOpts: ParcelableStoreOptions): BindingContext {
        val store = Store(storeOpts.actual)
        return BindingContext(
            store,
            coroutineContext,
            BindingContextStatsImpl()
        )
    }

    private class FakeLifecycle : Lifecycle() {
        override fun addObserver(p0: LifecycleObserver) = Unit

        override fun removeObserver(p0: LifecycleObserver) = Unit

        override fun getCurrentState(): State = State.CREATED
    }
}
