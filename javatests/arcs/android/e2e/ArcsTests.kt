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
    }
}
