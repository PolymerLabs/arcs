package arcs.android.e2e

import android.content.Context
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Integration test cases for Arcs.
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
    fun testArcsOutputsNotification() {
        uiDevice.openNotification()
        val notificationTitle = uiDevice.findObjects(By.text("haha"))
        assertThat(notificationTitle).isEmpty()
    }
}
