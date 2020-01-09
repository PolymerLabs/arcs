package arcs.android.common.resurrection

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Before
import org.junit.runner.RunWith
import org.robolectric.android.controller.ServiceController

@RunWith(AndroidJUnit4::class)
class ResurrectorServiceTest {
    private lateinit var service: ServiceController<ResurrectorServiceImpl>

    @Before
    fun setUp() {
    }
}