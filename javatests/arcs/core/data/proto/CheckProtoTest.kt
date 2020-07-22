package arcs.core.data.proto

import arcs.core.data.AccessPath
import arcs.core.data.Check
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.HandleMode
import arcs.core.data.InformationFlowLabel
import arcs.core.data.TypeVariable
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class CheckProtoTest {
    @Test
    fun roundTrip_assert() {
        val connectionSpec = HandleConnectionSpec(
            name = "connectionSpec",
            direction = HandleMode.Read,
            type = TypeVariable("a")
        )
        val check = Check.Assert(
            accessPath = AccessPath("particleSpec", connectionSpec),
            predicate = InformationFlowLabel.Predicate.Label(
                InformationFlowLabel.SemanticTag("label")
            )
        )

        val encoded = check.encode()
        val decoded = encoded.decode(mapOf("connectionSpec" to connectionSpec))

        assertThat(decoded).isEqualTo(check)
    }
}
