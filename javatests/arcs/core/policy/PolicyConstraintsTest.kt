package arcs.core.policy

import arcs.core.data.AccessPath
import arcs.core.data.Check
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.InformationFlowLabel
import arcs.core.data.InformationFlowLabel.Predicate
import arcs.core.data.ParticleSpec
import arcs.core.data.Recipe
import arcs.core.data.proto.decodeRecipes
import arcs.core.policy.proto.decode
import arcs.core.testutil.protoloader.loadManifestBinaryProto
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.test.assertFailsWith

@RunWith(JUnit4::class)
class PolicyConstraintsTest {
    // Loaded from binary proto, maps all keyed by name.
    private lateinit var recipes: Map<String, Recipe>
    private lateinit var policies: Map<String, Policy>

    @Before
    fun setUp() {
        val proto = loadManifestBinaryProto(
            "javatests/arcs/core/policy/PolicyTranslationTestData.pb.bin"
        )
        recipes = proto.decodeRecipes().associateBy { it.name!! }
        policies = proto.policiesList.map { it.decode() }.associateBy { it.name }
    }

    @Test
    fun applyPolicy_checksEgressParticles_acceptsIsolatedParticles() {
        val recipe = createRecipe(
            createParticle("Isolated1", isolated = true),
            createParticle("Isolated2", isolated = true)
        )

        val result = translatePolicy(BLANK_POLICY, recipe)

        assertThat(result).isEqualTo(
            PolicyConstraints(BLANK_POLICY, recipe, emptyMap())
        )
    }

    @Test
    fun applyPolicy_checksEgressParticles_acceptsValidEgressParticles() {
        val recipe = createRecipe(
            createParticle(BLANK_EGRESS_PARTICLE_NAME, isolated = false)
        )

        translatePolicy(BLANK_POLICY, recipe)
    }

    @Test
    fun applyPolicy_checksEgressParticles_rejectsInvalidEgressParticles() {
        val recipe = createRecipe(
            createParticle("Egress1", isolated = false),
            createParticle("Egress2", isolated = false)
        )

        val e = assertFailsWith<PolicyViolation.InvalidEgressParticle> {
            translatePolicy(BLANK_POLICY, recipe)
        }
        assertThat(e.policy).isEqualTo(BLANK_POLICY)
        assertThat(e.particleNames).containsExactly("Egress1", "Egress2")
    }

    @Test
    fun applyPolicy_checksEgressParticles_rejectsMultipleEgressParticles() {
        val recipe = createRecipe(
            createParticle(BLANK_EGRESS_PARTICLE_NAME, isolated = false),
            createParticle(BLANK_EGRESS_PARTICLE_NAME, isolated = false)
        )

        val e = assertFailsWith<PolicyViolation.MultipleEgressParticles> {
            translatePolicy(BLANK_POLICY, recipe)
        }
        assertThat(e.policy).isEqualTo(BLANK_POLICY)
    }

    @Test
    fun applyPolicy_egressCheck_withoutRedactionLabels() {
        val policy = BLANK_POLICY.copy(name = "SingleInput")
        val recipe = recipes.getValue("SingleInput")
        val particle = recipe.particles.single()

        val result = translatePolicy(policy, recipe)

        assertThat(result.egressChecks).containsExactly(
            particle,
            listOf(
                Check.Assert(
                    AccessPath(AccessPath.Root.HandleConnection(
                        particle,
                        particle.spec.connections.values.single())
                    ),
                    labelPredicate("allowedForEgress")
                )
            )
        )
    }

    @Test
    fun applyPolicy_egressCheck_withRedactionLabels() {
        val policy = policies.getValue("FooRedactions")
        val recipe = recipes.getValue("SingleInput").forceMatchPolicyName("FooRedactions")

        val result = translatePolicy(policy, recipe)
        
        val check = result.egressChecks.values.single().single() as Check.Assert
        assertThat(check.predicate).isEqualTo(
            Predicate.or(
                labelPredicate("allowedForEgress"),
                labelPredicate("allowedForEgress_redaction1") and labelPredicate("redaction1"),
                labelPredicate("allowedForEgress_redaction2") and labelPredicate("redaction2"),
                labelPredicate("allowedForEgress_redaction3") and labelPredicate("redaction3")
            )
        )
    }

    @Test
    fun applyPolicy_egressCheck_ignoresWriteOnlyConnections() {
        val policy = BLANK_POLICY.copy(name = "SingleOutput")
        val recipe = recipes.getValue("SingleOutput")

        val result = translatePolicy(policy, recipe)

        val particle = recipe.particles.single()
        assertThat(result.egressChecks).containsExactly(particle, emptyList<Check>())
    }

    companion object {
        private const val BLANK_POLICY_NAME = "BlankPolicy"
        private const val BLANK_EGRESS_PARTICLE_NAME = "Egress_BlankPolicy"

        private val BLANK_POLICY = Policy(name = BLANK_POLICY_NAME, egressType = EgressType.LOGGING)

        private fun createParticle(
            name: String,
            isolated: Boolean,
            connectionSpecs: List<HandleConnectionSpec> = emptyList()
        ): Recipe.Particle {
            return Recipe.Particle(
                spec = ParticleSpec(
                    name = name,
                    connections = connectionSpecs.associateBy { it.name },
                    location = "location",
                    isolated = isolated
                ),
                handleConnections = emptyList()
            )
        }

        private fun createRecipe(vararg particles: Recipe.Particle): Recipe {
            return Recipe(
                name = "Recipe",
                handles = emptyMap(),
                particles = particles.toList()
            )
        }

        private fun labelPredicate(label: String): Predicate.Label {
            return Predicate.Label(InformationFlowLabel.SemanticTag(label))
        }

        private fun Recipe.forceMatchPolicyName(policyName: String): Recipe {
            val egressParticles = particles.filter { !it.spec.isolated }
            require(egressParticles.size == 1) { "Must have exactly one egress particle." }
            val particle = egressParticles.single()
            val updatedParticle = particle.copy(
                spec = particle.spec.copy(name = "Egress_$policyName")
            )
            return copy(particles = particles.filter { it.spec.isolated } + listOf(updatedParticle))
        }
    }
}

