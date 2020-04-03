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

import android.app.Activity
import android.app.Instrumentation
import android.content.Context
import android.content.Intent
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import com.google.common.truth.Truth.assertWithMessage
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * E2e test cases for Arcs.
 */
@RunWith(AndroidJUnit4::class)
class ArcsTest {

    private lateinit var instrumentation: Instrumentation
    private lateinit var context: Context
    private lateinit var uiDevice: UiDevice

    private var activity: Activity? = null

    @Before
    fun setup() {
        instrumentation = InstrumentationRegistry.getInstrumentation()
        context = instrumentation.context
        uiDevice = UiDevice.getInstance(instrumentation)

        activity = instrumentation.startActivitySync(
            createTestAppIntent(TEST_APP_PKG_NAME, TEST_ACTIVITY_NAME))
    }

    @After
    fun after() {
        instrumentation.runOnMainSync {
            activity?.finish()
        }
    }

    @Test
    fun testStorageService_inMemoryLocalActivity() {
        // Configure handle options.
        clickOnTextIfPresent(IN_MEMORY_BTN_TEXT)
        clickOnTextIfPresent(LOCAL_ACTIVITY_BTN_TEXT)

        // Create a handle first.
        clickOnTextIfPresent(CREATE_BTN_TEXT)
        waitForTextToAppear(WAITING_FOR_RESULT, ON_SYNC_NULL)

        // Set value to the handle.
        clickOnTextIfPresent(SET_BTN_TEXT)
        waitForTextToAppear(ON_SYNC_NULL, ON_UPDATE_TEST_RESULT)

        // Clear the handle.
        clickOnTextIfPresent(CLEAR_BTN_TEXT)
        waitForTextToAppear(ON_UPDATE_TEST_RESULT, ON_UPDATE_NULL)
    }

    @Test
    fun testStorageService_inMemoryRemoteService() {
        // Configure handle options.
        clickOnTextIfPresent(IN_MEMORY_BTN_TEXT)
        clickOnTextIfPresent(REMOTE_SERVICE_BTN_TEXT)

        // Create a handle first.
        clickOnTextIfPresent(CREATE_BTN_TEXT)
        waitForTextToAppear(WAITING_FOR_RESULT, ON_SYNC_NULL)

        // Set value to the handle.
        clickOnTextIfPresent(SET_BTN_TEXT)
        waitForTextToAppear(ON_SYNC_NULL, ON_UPDATE_TEST_RESULT)

        // Clear the handle.
        clickOnTextIfPresent(CLEAR_BTN_TEXT)
        waitForTextToAppear(ON_UPDATE_TEST_RESULT, ON_UPDATE_NULL)
    }

    @Test
    fun testStorageService_persistentLocalActivity() {
        // Configure handle options.
        clickOnTextIfPresent(PERSISTENT_BTN_TEXT)
        clickOnTextIfPresent(LOCAL_ACTIVITY_BTN_TEXT)

        // Create a handle first.
        clickOnTextIfPresent(CREATE_BTN_TEXT)
        waitForTextToAppear(WAITING_FOR_RESULT, ON_SYNC_NULL)

        // Set value to the handle.
        clickOnTextIfPresent(SET_BTN_TEXT)
        waitForTextToAppear(ON_SYNC_NULL, ON_UPDATE_TEST_RESULT)

        // Restart the activity.
        instrumentation.runOnMainSync {
            activity?.finish()
        }
        activity = instrumentation.startActivitySync(
            createTestAppIntent(TEST_APP_PKG_NAME, TEST_ACTIVITY_NAME))

        // Configure handle options.
        clickOnTextIfPresent(PERSISTENT_BTN_TEXT)
        clickOnTextIfPresent(LOCAL_ACTIVITY_BTN_TEXT)

        // Create a handle first.
        clickOnTextIfPresent(CREATE_BTN_TEXT)
        waitForTextToAppear(WAITING_FOR_RESULT, ON_SYNC_TEST_RESULT)

        // Clear the handle.
        clickOnTextIfPresent(CLEAR_BTN_TEXT)
        waitForTextToAppear(ON_SYNC_TEST_RESULT, ON_UPDATE_NULL)
    }

    @Test
    fun testAllocator_readWrite() {
        clickOnTextIfPresent(PERSON_TEST_BTN_TEXT)
        waitForTextToAppear(WAITING_FOR_RESULT, PERSON_TEST_RESULT_TEXT)
    }

    private fun clickOnTextIfPresent(text: String) {
        uiDevice.wait(Until.hasObject(By.text(text)), UI_TIMEOUT_MS)
        val textObject = uiDevice.findObject(By.text(text))
        textObject.click()
    }

    private fun waitForTextGone(text: String) {
        val textGone = uiDevice.wait(Until.gone(By.text(text)), UI_TIMEOUT_MS)
        assertWithMessage("View with exactly \"$text\" should be gone")
            .that(textGone).isTrue()
    }

    private fun waitForTextToAppear(text1: String, text2: String) {
        val sequencedText1 = "1: $text1"
        val sequencedText2 = "2: $text2"

        val text1Appeared = uiDevice.wait(Until.hasObject(By.text(
            sequencedText1)), UI_TIMEOUT_MS)
        assertWithMessage("View with exactly \"$sequencedText1\" should appear")
            .that(text1Appeared).isTrue()
        val text2Appeared = uiDevice.wait(Until.hasObject(By.text(
            sequencedText2)), UI_TIMEOUT_MS)
        assertWithMessage("View with exactly \"$sequencedText2\" should appear")
            .that(text2Appeared).isTrue()
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

        const val WAITING_FOR_RESULT = "Waiting for result."

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
