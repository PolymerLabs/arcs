package arcs.showcase.mappedread

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.core.host.toRegistration
import arcs.showcase.ShowcaseEnvironment
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@ExperimentalCoroutinesApi
@RunWith(AndroidJUnit4::class)
class ReadWriteTest {

    @get:Rule
    val env = ShowcaseEnvironment(
        ::Reader.toRegistration(),
        ::Writer.toRegistration()
    )

    private val storage = ArcsStorage(env)

    private val l0 = ClientItem("whee", 42)

    @Test
    fun writeAndReadBack0() {
        storage.put0(l0)
        assertThat(storage.all0()).containsExactly(l0)
    }
}
