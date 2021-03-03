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
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import arcs.android.labs.host.AndroidManifestHostRegistry
import arcs.android.labs.host.prod.ProdArcHostService
import arcs.core.allocator.AllocatorIntegrationTestBase
import arcs.core.data.Capabilities
import arcs.core.data.Capability.Shareable
import arcs.core.host.ArcHostException
import arcs.core.host.HostRegistry
import arcs.core.host.PersonPlan
import arcs.core.host.TestingJvmProdHost
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.sdk.android.labs.host.toComponentName
import arcs.sdk.android.storage.AndroidStorageServiceEndpointManager
import arcs.sdk.android.storage.service.testutil.TestBindHelper
import kotlin.test.assertFailsWith
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.setMain
import org.junit.Before
import org.junit.Ignore
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric

/**
 * These tests are the same as [AllocatorIntegrationTestBase] but run with Android Services,
 * the real [ServiceStore], and a ramdisk.
 *
 */
@RunWith(AndroidJUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
open class AndroidAllocatorIntegrationTest : AllocatorIntegrationTestBase() {

  protected lateinit var context: Context
  private lateinit var readingService: TestReadingExternalHostService
  private lateinit var testProdService: ProdArcHostService
  private lateinit var prodService: ProdArcHostService

  private lateinit var writingService: TestWritingExternalHostService

  override suspend fun hostRegistry(): HostRegistry {
    return AndroidManifestHostRegistry.createForTest(context) {
      GlobalScope.launch(Dispatchers.Main) {
        val readingComponentName =
          TestReadingExternalHostService::class.toComponentName(context)
        val testProdComponentName =
          TestProdArcHostService::class.toComponentName(context)
        val prodComponentName =
          ProdArcHostService::class.toComponentName(context)
        val writingComponentName =
          TestWritingExternalHostService::class.toComponentName(context)
        when (it.component) {
          readingComponentName -> readingService
          testProdComponentName -> testProdService
          prodComponentName -> prodService
          writingComponentName -> writingService
          else -> throw IllegalArgumentException("Unknown ${it.component}")
        }.onStartCommand(it, 0, 0)
      }
    }
  }

  override fun readingHost() = readingService.arcHost
  override fun writingHost() = writingService.arcHost
  override fun pureHost() = testProdService.arcHost as TestingJvmProdHost

  // TODO: wire up some kind of mock persistent database?
  override val storageCapability = Capabilities(Shareable(true))

  class DefaultProdArcHostServiceForTest : ProdArcHostService() {
    override val coroutineContext = Dispatchers.Default
    override val arcSerializationCoroutineContext = Dispatchers.Default
    override val storageEndpointManager = AndroidStorageServiceEndpointManager(
      scope,
      TestBindHelper(this)
    )
  }

  @OptIn(ExperimentalStdlibApi::class)
  override fun runAllocatorTest(
    testBody: suspend CoroutineScope.() -> Unit
  ) = runBlocking {
    Dispatchers.setMain(coroutineContext[CoroutineDispatcher.Key]!!)
    testBody()
  }

  @Before
  override fun setUp() = runBlocking {
    DriverAndKeyConfigurator.configure(null)

    context = ApplicationProvider.getApplicationContext()
    context.setTheme(R.style.Theme_AppCompat)

    // Initialize WorkManager for instrumentation tests.
    WorkManagerTestInitHelper.initializeTestWorkManager(context)

    TestExternalArcHostService.testBindHelper = TestBindHelper(context)

    readingService = Robolectric.setupService(TestReadingExternalHostService::class.java)
    writingService = Robolectric.setupService(TestWritingExternalHostService::class.java)
    testProdService = Robolectric.setupService(TestProdArcHostService::class.java)
    prodService = Robolectric.setupService(DefaultProdArcHostServiceForTest::class.java)

    super.setUp()
  }

  @Ignore("b/154947390 - Deflake")
  @Test
  fun allocator_startArc_throwsException() = runAllocatorTest {
    writingHost().throws = true

    assertFailsWith<ArcHostException> {
      allocator.startArcForPlan(PersonPlan).waitForStart()
    }
  }

  @Ignore("b/154947390 - Deflake")
  @Test
  override fun allocator_doesntCreateArcsOnDuplicateStartArc() {
    super.allocator_doesntCreateArcsOnDuplicateStartArc()
  }

  @Ignore("b/154947390 - Deflake")
  @Test
  override fun allocator_startFromOneAllocatorAndStopInAnother() {
    super.allocator_startFromOneAllocatorAndStopInAnother()
  }

  @Ignore("b/154947390 - Deflake")
  @Test
  override fun allocator_canStartArcInTwoExternalHosts() {
    super.allocator_canStartArcInTwoExternalHosts()
  }

  @Ignore("b/154947390 - Deflake")
  @Test
  override fun allocator_computePartitions() {
    super.allocator_computePartitions()
  }

  @Ignore("b/154947390 - Deflake")
  @Test
  override fun allocator_verifyStorageKeysCreated() {
    super.allocator_verifyStorageKeysCreated()
  }

  @Ignore("b/154947390 - Deflake")
  @Test
  override fun allocator_startArc_particleException_isErrorState() {
    super.allocator_startArc_particleException_isErrorState()
  }

  @Ignore("b/157266444 - Deflake")
  @Test
  override fun allocator_startArc_particleException_failsWaitForStart() {
    super.allocator_startArc_particleException_failsWaitForStart()
  }
}
