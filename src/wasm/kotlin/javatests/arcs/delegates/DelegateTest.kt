package arcs.core.delegates

import arcs.BaseEntity
import arcs.entityField
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@Suppress("UNCHECKED_CAST", "UNUSED_VARIABLE")
@RunWith(JUnit4::class)
class DelegateTest : BaseEntity() {
    var n: Double by entityField()
    var s: String by entityField()
    var b: Boolean by entityField()
    private var ready = false

    override fun isSet() {
        ready = true
    }

    @Test
    fun TestDelegates() {
        assertThat(this.n).isEqualTo(0.0)
        assertThat(this.s).isEqualTo("")
        assertThat(this.b).isEqualTo(false)
        assertThat(this.ready).isEqualTo(false)

        this.n = 10.0
        assertThat(this.n).isEqualTo(10.0)
        assertThat(this.ready).isEqualTo(false)

        this.s = "fooBar"
        assertThat(this.s).isEqualTo("fooBar")
        assertThat(this.ready).isEqualTo(false)

        this.b = true
        assertThat(this.b).isEqualTo(true)
        assertThat(this.ready).isEqualTo(true)
    }
}
