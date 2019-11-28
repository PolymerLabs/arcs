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

package arcs.storage

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.crdt.parcelables.ParcelableCrdtType
import arcs.storage.driver.RamDisk
import arcs.storage.driver.RamDiskDriverProvider
import arcs.storage.parcelables.ParcelableStoreOptions
import arcs.storage.service.BindingContext
import arcs.storage.service.StorageServiceBindingDelegate
import com.nhaarman.mockitokotlin2.mock
import kotlin.coroutines.coroutineContext
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for the [ServiceStore]. */
@RunWith(AndroidJUnit4::class)
@UseExperimental(ExperimentalCoroutinesApi::class)
class ServiceStoreTest {
    private lateinit var bindingDelegate: StorageServiceBindingDelegate
    private lateinit var lifecycle: Lifecycle

    @Before
    fun setup() {
        RamDisk.clear()
        RamDiskDriverProvider()
        bindingDelegate = mock()
        lifecycle = mock()
    }

    @Test
    fun getLocalData_getsLocalDataFromService() = runBlockingTest {
    }

    private suspend fun buildService(storeOpts: ParcelableStoreOptions): BindingContext {
        val store = Store(storeOpts.actual)
        return BindingContext(store, ParcelableCrdtType.Count, coroutineContext)
    }
}
