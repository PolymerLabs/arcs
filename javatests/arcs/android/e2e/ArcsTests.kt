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

package arcs.android.e2e

import android.content.Context
import android.content.Intent
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.Until
import com.google.common.truth.Truth.assertWithMessage
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * E2e test cases for Arcs.
 */
@RunWith(AndroidJUnit4::class)
class ArcsTest {

    private lateinit var context: Context
    private lateinit var uiDevice: UiDevice

    @Before
    fun setup() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        this.context = instrumentation.context
        this.uiDevice = UiDevice.getInstance(instrumentation)
        uiDevice.pressHome()
    }

    @Test
    fun testStorageService_inMemoryLocalActivity() {
        context.startActivity(createTestAppIntent(TEST_APP_PKG_NAME, TEST_ACTIVITY_NAME))

        // Configure handle options.
        clickOnTextIfPresent(IN_MEMORY_BTN_TEXT, UI_TIMEOUT_MS)
        clickOnTextIfPresent(LOCAL_ACTIVITY_BTN_TEXT, UI_TIMEOUT_MS)

        // Create a handle first.
        clickOnTextIfPresent(CREATE_BTN_TEXT, UI_TIMEOUT_MS)
        waitForTextToAppear(ON_SYNC_NULL, UI_TIMEOUT_MS)

        // Set value to the handle.
        clickOnTextIfPresent(SET_BTN_TEXT, UI_TIMEOUT_MS)
        waitForTextToAppear(ON_UPDATE_TEST_RESULT, UI_TIMEOUT_MS)

        // Clear the handle.
        clickOnTextIfPresent(CLEAR_BTN_TEXT, UI_TIMEOUT_MS)
        waitForTextToAppear(ON_UPDATE_NULL, UI_TIMEOUT_MS)
    }

    @Test
    fun testStorageService_inMemoryRemoteService() {
        context.startActivity(createTestAppIntent(TEST_APP_PKG_NAME, TEST_ACTIVITY_NAME))

        // Configure handle options.
        clickOnTextIfPresent(IN_MEMORY_BTN_TEXT, UI_TIMEOUT_MS)
        clickOnTextIfPresent(REMOTE_SERVICE_BTN_TEXT, UI_TIMEOUT_MS)

        // Create a handle first.
        clickOnTextIfPresent(CREATE_BTN_TEXT, UI_TIMEOUT_MS)
        waitForTextToAppear(ON_SYNC_NULL, UI_TIMEOUT_MS)

        // Set value to the handle.
        clickOnTextIfPresent(SET_BTN_TEXT, UI_TIMEOUT_MS)
        waitForTextToAppear(ON_UPDATE_TEST_RESULT, UI_TIMEOUT_MS)

        // Clear the handle.
        clickOnTextIfPresent(CLEAR_BTN_TEXT, UI_TIMEOUT_MS)
        waitForTextToAppear(ON_UPDATE_NULL, UI_TIMEOUT_MS)
    }

    @Test
    fun testStorageService_persistentLocalActivity() {
        context.startActivity(createTestAppIntent(TEST_APP_PKG_NAME, TEST_ACTIVITY_NAME))

        // Configure handle options.
        clickOnTextIfPresent(PERSISTENT_BTN_TEXT, UI_TIMEOUT_MS)
        clickOnTextIfPresent(LOCAL_ACTIVITY_BTN_TEXT, UI_TIMEOUT_MS)

        // Create a handle first.
        clickOnTextIfPresent(CREATE_BTN_TEXT, UI_TIMEOUT_MS)
        waitForTextToAppear(ON_SYNC_NULL, UI_TIMEOUT_MS)

        // Set value to the handle.
        clickOnTextIfPresent(SET_BTN_TEXT, UI_TIMEOUT_MS)
        waitForTextToAppear(ON_UPDATE_TEST_RESULT, UI_TIMEOUT_MS)

        uiDevice.pressBack()

        context.startActivity(createTestAppIntent(TEST_APP_PKG_NAME, TEST_ACTIVITY_NAME))

        // Configure handle options.
        clickOnTextIfPresent(PERSON_TEST_BTN_TEXT, UI_TIMEOUT_MS)
        clickOnTextIfPresent(LOCAL_ACTIVITY_BTN_TEXT, UI_TIMEOUT_MS)

        // Create a handle first.
        clickOnTextIfPresent(CREATE_BTN_TEXT, UI_TIMEOUT_MS)
        waitForTextToAppear(ON_SYNC_TEST_RESULT, UI_TIMEOUT_MS)

        // Clear the handle.
        clickOnTextIfPresent(CLEAR_BTN_TEXT, UI_TIMEOUT_MS)
        waitForTextToAppear(ON_UPDATE_NULL, UI_TIMEOUT_MS)
    }

    @Test
    fun testAllocator_readWrite() {
        context.startActivity(createTestAppIntent(TEST_APP_PKG_NAME, TEST_ACTIVITY_NAME))
        clickOnTextIfPresent(PERSON_TEST_BTN_TEXT, UI_TIMEOUT_MS)
        waitForTextToAppear(PERSON_TEST_RESULT_TEXT, UI_TIMEOUT_MS)
    }

    private fun clickOnTextIfPresent(text: String , timeoutMs: Long) {
        uiDevice.wait(Until.hasObject(By.text(text)), timeoutMs)
        val textObject = uiDevice.findObject(By.text(text))
        textObject?.click()
    }

    private fun waitForTextToAppear(text: String , timeoutMs: Long) {
        val textAppeared = uiDevice.wait(Until.hasObject(By.text(text)), timeoutMs)
        assertWithMessage("View with exactly \"$text\" should appear").that(textAppeared).isTrue()
    }

    private fun createTestAppIntent(packageName: String, className: String) : Intent {
        var intent = Intent()
        intent.setClassName(packageName, className)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        return intent
    }

    companion object {
        const val TEST_APP_PKG_NAME = "arcs.android.e2e.testapp"
        const val TEST_ACTIVITY_NAME = "$TEST_APP_PKG_NAME.TestActivity"

        const val UI_TIMEOUT_MS = 20000L

        const val PERSON_TEST_BTN_TEXT = "PersonTest"
        const val PERSON_TEST_RESULT_TEXT = "John Wick"

        const val STORAGE_TEST_RESULT = "Test Text,1234.0,true"
        const val ON_UPDATE_TEST_RESULT = "onUpdate:$STORAGE_TEST_RESULT"
        const val ON_UPDATE_NULL = "onUpdate:null"
        const val ON_SYNC_TEST_RESULT = "onSync:$STORAGE_TEST_RESULT"
        const val ON_SYNC_NULL = "onSync:null"
        const val IN_MEMORY_BTN_TEXT = "In Memory"
        const val PERSISTENT_BTN_TEXT = "Persistent"
        const val LOCAL_ACTIVITY_BTN_TEXT = "Local Activity"
        const val REMOTE_SERVICE_BTN_TEXT = "Remote Service"
        const val CREATE_BTN_TEXT = "Create"
        const val SET_BTN_TEXT = "Set"
        const val CLEAR_BTN_TEXT = "Clear"
    }
}
