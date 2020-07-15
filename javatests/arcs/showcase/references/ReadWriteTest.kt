package arcs.showcase.references

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.core.host.toRegistration
import arcs.core.util.testutil.LogRule
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
    val log = LogRule()

    @get:Rule
    val env = ShowcaseEnvironment(
        ::Reader0.toRegistration(),
        ::Writer0.toRegistration(),
        ::Reader1.toRegistration(),
        ::Writer1.toRegistration(),
        ::Reader2.toRegistration(),
        ::Writer2.toRegistration()
    )

    private val storage = ArcsStorage(env)

    private val l0 = MyLevel0("l0-1")
    private val l1 = MyLevel1("l1-1", setOf(l0))
    private val l2 = MyLevel2("l2-1", setOf(l1))

    @Test
    fun writeAndReadBack0() {
        storage.put0(l0)
        assertThat(storage.all0()).containsExactly(l0)
    }

    @Test
    fun writeAndReadBack1() {
        storage.put1(l1)
        assertThat(storage.all1()).containsExactly(l1)
    }

    @Test
    fun writeAndReadBack2() {
        storage.put2(l2)
        assertThat(storage.all2()).containsExactly(l2)
    }
}
