package arcs.core.policy

import arcs.core.analysis.RecipeGraph
import arcs.core.data.ParticleSpec
import arcs.core.data.Recipe
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.test.assertFailsWith

@RunWith(JUnit4::class)
class PolicyTranslationTest {
    @Test
    fun applyPolicy_checksEgressParticles_acceptsIsolatedParticles() {
        val graph = RecipeGraph(
            Recipe(
                name = "Recipe",
                handles = emptyMap(),
                particles = listOf(
                    createParticle("Isolated1", isolated = true),
                    createParticle("Isolated2", isolated = true)
                )
            )
        )

        val result = applyPolicy(BLANK_POLICY, graph)

        assertThat(result).isEqualTo(graph)
    }

    @Test
    fun applyPolicy_checksEgressParticles_acceptsValidEgressParticles() {
        val graph = RecipeGraph(
            Recipe(
                name = "Recipe",
                handles = emptyMap(),
                particles = listOf(createParticle("Egress_$BLANK_POLICY_NAME", isolated = false))
            )
        )

        val result = applyPolicy(BLANK_POLICY, graph)

        assertThat(result).isEqualTo(graph)
    }

    @Test
    fun applyPolicy_checksEgressParticles_rejectsInvalidEgressParticles() {
        val graph = RecipeGraph(
            Recipe(
                name = "Recipe",
                handles = emptyMap(),
                particles = listOf(
                    createParticle("Egress1", isolated = false),
                    createParticle("Egress2", isolated = false)
                )
            )
        )

        val e = assertFailsWith<PolicyViolation.InvalidEgressParticle> {
            applyPolicy(BLANK_POLICY, graph)
        }
        assertThat(e.policy).isEqualTo(BLANK_POLICY)
        assertThat(e.particleNames).containsExactly("Egress1", "Egress2")
    }

    companion object {
        private const val BLANK_POLICY_NAME = "BlankPolicy"
        private val BLANK_POLICY = Policy(name = BLANK_POLICY_NAME, egressType = EgressType.LOGGING)

        private fun createParticle(name: String, isolated: Boolean): Recipe.Particle {
            return Recipe.Particle(
                spec = ParticleSpec(
                    name = name,
                    connections = emptyMap(),
                    location = "location",
                    isolated = isolated
                ),
                handleConnections = emptyList()
            )
        }
    }
}
