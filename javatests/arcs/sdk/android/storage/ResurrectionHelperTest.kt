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

package arcs.sdk.android.storage

import android.app.Application
import android.content.Context
import android.content.Intent
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import arcs.android.common.resurrection.ResurrectionRequest
import arcs.android.common.resurrection.ResurrectionRequest.Companion.EXTRA_REGISTRATION_CLASS_NAME
import arcs.android.common.resurrection.ResurrectionRequest.Companion.EXTRA_REGISTRATION_NOTIFIERS
import arcs.android.common.resurrection.ResurrectionRequest.Companion.EXTRA_REGISTRATION_TARGET_ID
import arcs.android.common.resurrection.ResurrectionRequest.Companion.EXTRA_REGISTRATION_PACKAGE_NAME
import arcs.core.storage.StorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.Shadows.shadowOf

@RunWith(AndroidJUnit4::class)
class ResurrectionHelperTest {
    private var callbackCalls = mutableListOf<List<StorageKey>>()
    private lateinit var context: Context
    private lateinit var helper: ResurrectionHelper
    private lateinit var service: ResurrectionHelperDummyService

    @Before
    fun setUp() {
        service = Robolectric.setupService(ResurrectionHelperDummyService::class.java)
        context = InstrumentationRegistry.getInstrumentation().targetContext

        callbackCalls.clear()

        helper = ResurrectionHelper(context) { _, keys -> callbackCalls.add(keys) }
    }

    @Test
    fun onStartCommand_doesNotCallOnResurrected_when_intentIsNull() {
        helper.onStartCommand(null)
        assertThat(callbackCalls).isEmpty()
    }

    @Test
    fun onStartCommand_doesNotCallOnResurrected_when_intentActionIsNull() {
        helper.onStartCommand(Intent())
        assertThat(callbackCalls).isEmpty()
    }

    @Test
    fun onStartCommand_doesNotCallOnResurrected_when_intentActionDoesNotMatch() {
        helper.onStartCommand(Intent().apply { action = "Incorrect" })
        assertThat(callbackCalls).isEmpty()
    }

    @Test
    fun onStartCommand_doesNotCallOnResurrected_when_notifierExtra_isMissing() {
        helper.onStartCommand(Intent().apply { action = ResurrectionRequest.ACTION_RESURRECT })
        assertThat(callbackCalls).isEmpty()
    }

    @Test
    fun onStartCommand_callsOnResurrected_whenStarsAlign() {
        val storageKeys = listOf(
            RamDiskStorageKey("foo"),
            RamDiskStorageKey("bar")
        )

        val intent = Intent().apply {
            action = ResurrectionRequest.ACTION_RESURRECT
            putExtra(
                ResurrectionRequest.EXTRA_RESURRECT_NOTIFIER,
                ArrayList(storageKeys.map(StorageKey::toString))
            )
            putExtra(ResurrectionRequest.EXTRA_REGISTRATION_TARGET_ID, "test")
        }

        helper.onStartCommand(intent)
        assertThat(callbackCalls).containsExactly(storageKeys)
    }

    @Test
    fun requestResurrection() {
        val storageKeys = listOf(
            RamDiskStorageKey("foo"),
            RamDiskStorageKey("bar")
        )
        helper.requestResurrection("test", storageKeys, ResurrectionHelperDummyService::class.java)

        val actualIntent = shadowOf(ApplicationProvider.getApplicationContext<Application>())
            .nextStartedService
        val expectedIntent = Intent(context, ResurrectionHelperDummyService::class.java).also {
            ResurrectionRequest.createDefault(context, storageKeys, "test")
                .populateRequestIntent(it)
        }

        assertThat(actualIntent.action).isEqualTo(expectedIntent.action)
        assertThat(actualIntent.getStringExtra(EXTRA_REGISTRATION_PACKAGE_NAME))
            .isEqualTo(expectedIntent.getStringExtra(EXTRA_REGISTRATION_PACKAGE_NAME))
        assertThat(actualIntent.getStringExtra(EXTRA_REGISTRATION_CLASS_NAME))
            .isEqualTo(expectedIntent.getStringExtra(EXTRA_REGISTRATION_CLASS_NAME))
        assertThat(actualIntent.getStringArrayListExtra(EXTRA_REGISTRATION_NOTIFIERS))
            .containsExactlyElementsIn(
                expectedIntent.getStringArrayListExtra(EXTRA_REGISTRATION_NOTIFIERS)
            )
        assertThat(actualIntent.getStringExtra(EXTRA_REGISTRATION_TARGET_ID)).isEqualTo("test")
    }

    @Test
    fun cancelResurrectionRequest() {
        helper.cancelResurrectionRequest("test", ResurrectionHelperDummyService::class.java)

        val actualIntent = shadowOf(ApplicationProvider.getApplicationContext<Application>())
            .nextStartedService
        val expectedIntent = Intent(context, ResurrectionHelperDummyService::class.java).also {
            ResurrectionRequest.createDefault(context, emptyList(), "test")
                .populateUnrequestIntent(it)
        }

        assertThat(actualIntent.action).isEqualTo(expectedIntent.action)
        assertThat(actualIntent.getStringExtra(EXTRA_REGISTRATION_PACKAGE_NAME))
            .isEqualTo(expectedIntent.getStringExtra(EXTRA_REGISTRATION_PACKAGE_NAME))
        assertThat(actualIntent.getStringExtra(EXTRA_REGISTRATION_CLASS_NAME))
            .isEqualTo(expectedIntent.getStringExtra(EXTRA_REGISTRATION_CLASS_NAME))
        assertThat(actualIntent.getStringExtra(EXTRA_REGISTRATION_TARGET_ID)).isEqualTo("test")
    }
}
