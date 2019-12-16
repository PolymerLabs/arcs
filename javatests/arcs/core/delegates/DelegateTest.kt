package arcs.core.delegates

import arcs.BooleanDelegate
import arcs.NumDelegate
import arcs.TextDelegate
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [StringDecoder]. */
@Suppress("UNCHECKED_CAST", "UNUSED_VARIABLE")
@RunWith(JUnit4::class)
class DelegateTest {

    @Test
    fun TestNumDelegate() {
        var n: Double by NumDelegate()
        assertThat(n).isEqualTo(0.0)
        n = 10.0
        assertThat(n).isEqualTo(10.0)
    }

    @Test
    fun TestTextDelegate() {
        var n: String by TextDelegate()
        assertThat(n).isEqualTo("")
        n = "fooBar"
        assertThat(n).isEqualTo("fooBar")
    }

    @Test
    fun TestBooleanDelegate() {
        var n: Boolean by BooleanDelegate()
        assertThat(n).isEqualTo(false)
        n = true
        assertThat(n).isEqualTo(true)
    }
}
