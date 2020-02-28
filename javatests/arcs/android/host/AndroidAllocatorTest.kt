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

import android.app.Application
import android.content.Context
import androidx.lifecycle.Lifecycle
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ActivityScenario.launch
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.sdk.host.toComponentName
import arcs.android.storage.handle.AndroidHandleManager
import arcs.android.storage.handle.R
import arcs.android.storage.handle.TestActivity
import arcs.core.allocator.AllocatorTest
import arcs.core.data.Capabilities
import arcs.core.host.EntityHandleManager
import arcs.core.host.HostRegistry
import arcs.sdk.android.storage.service.DefaultConnectionFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.TestCoroutineScope
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import kotlin.coroutines.CoroutineContext

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
    private lateinit var app: Application

    override suspend fun hostRegistry(): HostRegistry {
        return AndroidManifestHostRegistry.createForTest(context) {
            GlobalScope.launch(Dispatchers.Unconfined) {
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
    }

    override fun readingHost() = readingService.arcHost
    override fun writingHost() = writingService.arcHost

    // TODO: wire up some kind of mock persistent database?
    override val storageCapability = Capabilities.TiedToRuntime

    @Before
    override fun setUp() = runBlocking {
        context = ApplicationProvider.getApplicationContext()
        context.setTheme(R.style.Theme_AppCompat);

        // Initialize WorkManager for instrumentation tests.
        WorkManagerTestInitHelper.initializeTestWorkManager(context)

        readingService = Robolectric.setupService(TestReadingExternalHostService::class.java)
        writingService = Robolectric.setupService(TestWritingExternalHostService::class.java)
        super.setUp()
    }

    override fun runAllocatorTest(
        coroutineContext: CoroutineContext,
        testBody: suspend TestCoroutineScope.() -> Unit
    ) = runBlockingTest(coroutineContext) {
        val scenario = ActivityScenario.launch(TestActivity::class.java)

        scenario.moveToState(Lifecycle.State.STARTED)

        val activityJob = launch {
            scenario.onActivity { activity ->
                runBlocking {
                    this@runBlockingTest.testBody()
                }
                scenario.close()
            }
        }

        activityJob.join()
    }
}
