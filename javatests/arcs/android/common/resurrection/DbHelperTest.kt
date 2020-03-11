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

package arcs.android.common.resurrection

import android.content.ComponentName
import android.os.PersistableBundle
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.core.storage.keys.RamDiskStorageKey
import com.google.common.truth.Truth.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class DbHelperTest {
    private lateinit var dbHelper: DbHelper
    private val requestA = ResurrectionRequest(
        ComponentName("a", "A"),
        ResurrectionRequest.ComponentType.Service,
        ResurrectionRequest.ACTION_RESURRECT,
        null
    )
    private val requestB = ResurrectionRequest(
        ComponentName("b", "B"),
        ResurrectionRequest.ComponentType.Activity,
        "StartMeUp",
        PersistableBundle().apply {
            putBoolean("foo", true)
            putInt("bar", 1)
        },
        listOf(
            RamDiskStorageKey("bThing")
        )
    )
    private val requestC = ResurrectionRequest(
        ComponentName("c", "C"),
        ResurrectionRequest.ComponentType.Activity,
        ResurrectionRequest.ACTION_RESURRECT,
        PersistableBundle.EMPTY,
        listOf(
            RamDiskStorageKey("bThing"),
            RamDiskStorageKey("cThing"),
            RamDiskStorageKey("somethingElse")
        )
    )

    @Before
    fun setUp() {
        dbHelper = DbHelper(ApplicationProvider.getApplicationContext())
    }

    @After
    fun tearDown() {
        dbHelper.reset()
    }

    @Test
    fun registerRequest_getRegistrations_roundtrip() {
        dbHelper.registerRequest(requestA)
        assertThat(dbHelper.getRegistrations()).containsExactly(requestA)

        dbHelper.registerRequest(requestB)
        assertThat(dbHelper.getRegistrations()).containsExactly(requestA, requestB)

        dbHelper.registerRequest(requestC)
        assertThat(dbHelper.getRegistrations()).containsExactly(requestA, requestB, requestC)
    }

    @Test
    fun unregisterRequest() {
        dbHelper.registerRequest(requestA)
        dbHelper.registerRequest(requestB)
        dbHelper.registerRequest(requestC)

        dbHelper.unregisterRequest(requestB.componentName)

        assertThat(dbHelper.getRegistrations()).containsExactly(requestA, requestC)
    }

    @Test
    fun reset() {
        dbHelper.registerRequest(requestA)
        dbHelper.registerRequest(requestB)
        dbHelper.registerRequest(requestC)

        dbHelper.reset()

        assertThat(dbHelper.getRegistrations()).isEmpty()
    }
}
