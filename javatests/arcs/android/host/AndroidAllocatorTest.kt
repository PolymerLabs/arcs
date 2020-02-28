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

package arcs.android.host

import android.content.Context
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.sdk.host.toComponentName
import arcs.core.allocator.AllocatorTest
import arcs.core.data.Capabilities
import arcs.core.host.HostRegistry
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.runner.RunWith
import org.robolectric.Robolectric

/**
 * These tests are the same as [AllocatorTest] but run with Android Services,
 * the real [ServiceStore], and persistent database.
 *
 * TODO: Use [Capabilities.Persistent] on Integration test subclass with Emulator/Device?
 */
@RunWith(AndroidJUnit4::class)
@UseExperimental(ExperimentalCoroutinesApi::class)
class AndroidAllocatorTest : AllocatorTest() {

    private lateinit var context: Context
    private lateinit var readingService: TestReadingExternalHostService
    private lateinit var writingService: TestWritingExternalHostService

    override suspend fun hostRegistry(): HostRegistry {
        return AndroidManifestHostRegistry.createForTest(context) {
            val readingComponentName =
                TestReadingExternalHostService::class.toComponentName(context)
            if (it.component?.equals(readingComponentName) == true) {
                readingService.onStartCommand(it, 0, 0)
            } else {
                val writingComponentName =
                    TestWritingExternalHostService::class.toComponentName(context)
                if (it.component?.equals(writingComponentName) == true) {
                    writingService.onStartCommand(it, 0, 0)
                }
            }
        }
    }

    override fun readingHost() = readingService.arcHost
    override fun writingHost() = writingService.arcHost

    // TODO: wire up some kind of mock persistent database?
    override fun storageCapability() = Capabilities.TiedToRuntime

    @Before
    override fun setUp() = runBlocking {
        readingService = Robolectric.setupService(TestReadingExternalHostService::class.java)
        writingService = Robolectric.setupService(TestWritingExternalHostService::class.java)
        context = InstrumentationRegistry.getInstrumentation().targetContext
        TestBindingDelegate.delegate = TestBindingDelegate(context)
        WorkManagerTestInitHelper.initializeTestWorkManager(context)
        super.setUp()
    }
}
