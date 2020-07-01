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

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.core.data.Capabilities
import arcs.core.data.Capability.Persistence
import arcs.sdk.android.storage.AndroidDriverAndKeyConfigurator
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Ignore
import org.junit.runner.RunWith

/**
 * These tests are the same as [AndroidAllocatorTest] but run with [AndroidSqliteDatabaseManager]
 * and [Capability.Persistence.ON_DISK].
 */
@Ignore("2% Flaky (runs_per_test=100) on TAP, disabled for now.")
@RunWith(AndroidJUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class AndroidAllocatorWithSqliteTest : AndroidAllocatorTest() {

    override val storageCapability = Capabilities(Persistence.ON_DISK)
    private lateinit var manager: AndroidSqliteDatabaseManager

    @Before
    override fun setUp() = runBlocking {
        TestExternalArcHostService.testingCapability = Capabilities(Persistence.ON_DISK)
        super.setUp()
        AndroidDriverAndKeyConfigurator.configure(context)
        Unit
    }
}
