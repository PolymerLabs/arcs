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
        val options = PolicyOptions(storeMap = mapOf("id1" to "Type1", "id2" to "Type2"))
        assertThat(options.encode().decode()).isEqualTo(options)
    }
}
