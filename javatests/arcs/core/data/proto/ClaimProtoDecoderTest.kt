package arcs.core.data.proto

import arcs.core.data.AccessPath
import arcs.core.data.Claim
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.HandleMode
import arcs.core.data.InformationFlowLabel
import arcs.core.data.InformationFlowLabel.Predicate
import arcs.core.data.TypeVariable
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class ClaimProtoDecoderTest {
    @Test
    fun roundTrip_assumeClaim() {
        val handleConnectionSpec = HandleConnectionSpec(
            "output",
            HandleMode.Write,
            TypeVariable("output")
        )
        val claim = Claim.Assume(
            AccessPath("TestSpec", handleConnectionSpec),
            Predicate.Label(InformationFlowLabel.SemanticTag("public"))
        )

        val encoded = claim.encode()
        val decoded = encoded.decode(mapOf("output" to handleConnectionSpec))

        assertThat(decoded).isEqualTo(claim)
    }

    @Test
    fun roundTrip_derivesFromClaim() {
        val outputSpec = HandleConnectionSpec(
            "output",
            HandleMode.Write,
            TypeVariable("output")
        )
        val inputSpec = HandleConnectionSpec(
            "input",
            HandleMode.Read,
            TypeVariable("output")
        )
        val connectionSpecs = listOf(inputSpec, outputSpec).associateBy { it.name }
        val claim = Claim.DerivesFrom(
            AccessPath("TestSpec", outputSpec),
            AccessPath("TestSpec", inputSpec)
        )

        val encoded = claim.encode()
        val decoded = encoded.decode(connectionSpecs)

        assertThat(decoded).isEqualTo(claim)
    }
}
