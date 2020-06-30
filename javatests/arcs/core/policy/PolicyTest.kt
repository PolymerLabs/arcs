package arcs.core.policy

import arcs.core.data.Annotation
import arcs.core.data.Capabilities
import arcs.core.data.Capability.Encryption
import arcs.core.data.Capability.Persistence
import arcs.core.data.Capability.Ttl
import arcs.core.policy.PolicyRetention
import arcs.core.policy.PolicyTarget
import arcs.core.policy.StorageMedium
import com.google.common.truth.Truth.assertThat
import java.util.concurrent.TimeUnit
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.test.assertFailsWith

@RunWith(JUnit4::class)
class PolicyTest {
    @Test
    fun policyTarget_toCapabilities() {
        val policyTarget = PolicyTarget(
            schemaName = "schema",
            maxAgeMs = TimeUnit.MILLISECONDS.convert(2L, TimeUnit.HOURS),
            retentions = listOf(
                PolicyRetention(medium = StorageMedium.DISK, encryptionRequired = true),
                PolicyRetention(medium = StorageMedium.RAM, encryptionRequired = false)
            ),
            fields = emptyList(),
            annotations = emptyList()
        )
        val capabilities = policyTarget.toCapabilities()
        assertThat(capabilities).hasSize(2)
        assertThat(
            capabilities[0].containsAll(
                Capabilities(listOf(Persistence.ON_DISK, Encryption(true), Ttl.Minutes(120)))
            )
        )
        assertThat(
            capabilities[0].containsAll(
                Capabilities(listOf(Persistence.IN_MEMORY, Ttl.Minutes(120)))
            )
        )
    }
}
