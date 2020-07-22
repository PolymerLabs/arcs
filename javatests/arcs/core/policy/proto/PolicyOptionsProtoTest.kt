package arcs.core.policy.proto

import arcs.core.policy.PolicyOptions
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class PolicyOptionsProtoTest {
    @Test
    fun roundTrip() {
        val options = PolicyOptions(
            storeMap = mapOf("a" to "One", "b" to "Two")
        )
        assertThat(options.encode().decode()).isEqualTo(options)
    }
}
