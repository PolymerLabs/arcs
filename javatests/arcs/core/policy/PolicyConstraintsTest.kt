package arcs.core.policy

import arcs.core.data.AccessPath
import arcs.core.data.Check
import arcs.core.data.Claim
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.InformationFlowLabel
import arcs.core.data.InformationFlowLabel.Predicate
import arcs.core.data.ParticleSpec
import arcs.core.data.Recipe
import arcs.core.data.proto.decodeRecipes
import arcs.core.policy.proto.decode
import arcs.core.testutil.protoloader.loadManifestBinaryProto
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

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

        val result = translatePolicy(BLANK_POLICY, recipe, emptyMap())

        assertThat(result).isEqualTo(
            PolicyConstraints(BLANK_POLICY, emptyMap(), emptyMap())
        )
    }

    @Test
    fun applyPolicy_checksEgressParticles_acceptsValidEgressParticles() {
        val recipe = createRecipe(
            createParticle(BLANK_EGRESS_PARTICLE_NAME, isolated = false)
        )

        translatePolicy(BLANK_POLICY, recipe, emptyMap())
    }

    @Test
    fun applyPolicy_checksEgressParticles_rejectsInvalidEgressParticles() {
        val recipe = createRecipe(
            createParticle("Egress1", isolated = false),
            createParticle("Egress2", isolated = false)
        )

        val e = assertFailsWith<PolicyViolation.InvalidEgressParticle> {
            translatePolicy(BLANK_POLICY, recipe, emptyMap())
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
            translatePolicy(BLANK_POLICY, recipe, emptyMap())
        }
        assertThat(e.policy).isEqualTo(BLANK_POLICY)
    }

    @Test
    fun applyPolicy_egressCheck_withoutRedactionLabels() {
        val policy = BLANK_POLICY.copy(name = "SingleInput")
        val recipe = recipes.getValue("SingleInput")
        val particle = recipe.particles.single()

        val result = translatePolicy(policy, recipe, emptyMap())

        assertThat(result.egressChecks).containsExactly(
            particle.spec,
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
        val recipe = recipes.getValue("SingleInput").forceMatchPolicyName(policy.name)

        val result = translatePolicy(
            policy,
            recipe,
            mapOf("my_store_id" to "Foo")
        )

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

        val result = translatePolicy(policy, recipe, emptyMap())

        val particle = recipe.particles.single()
        assertThat(result.egressChecks).containsExactly(particle.spec, emptyList<Check>())
    }

    @Test
    fun applyPolicy_storeClaims_fieldClaim() {
        val policy = policies.getValue("FooRedactions")
        val recipe = recipes.getValue("SingleMappedInput").forceMatchPolicyName(policy.name)
        val storeMap = mapOf("my_store_id" to "Foo")

        val result = translatePolicy(policy, recipe, storeMap)

        val store = AccessPath.Root.Store("my_store_id")
        assertThat(result.storeClaims).containsExactly(
            "my_store_id",
            listOf(
                Claim.Assume(
                    AccessPath(store, selectors("a")),
                    labelPredicate("allowedForEgress_redaction1")
                ),
                Claim.Assume(
                    AccessPath(store, selectors("b")),
                    labelPredicate("allowedForEgress_redaction2")
                ),
                Claim.Assume(
                    AccessPath(store, selectors("c")),
                    labelPredicate("allowedForEgress_redaction3")
                )
            )
        )
    }

    @Test
    fun applyPolicy_storeClaims_fieldsNotInPolicyDoNotHaveClaims() {
        val policy = policies.getValue("SingleFooRedaction")
        val recipe = recipes.getValue("SingleMappedInput").forceMatchPolicyName(policy.name)
        val storeMap = mapOf("my_store_id" to "Foo")

        val result = translatePolicy(policy, recipe, storeMap)

        val store = AccessPath.Root.Store("my_store_id")
        assertThat(result.storeClaims).containsExactly(
            "my_store_id",
            listOf(
                Claim.Assume(
                    AccessPath(store, selectors("a")),
                    labelPredicate("allowedForEgress_redaction1")
                )
            )
        )
    }

    @Test
    fun applyPolicy_storeClaims_missingFromStoresMap() {
        val policy = policies.getValue("FooRedactions")
        val recipe = recipes.getValue("SingleMappedInput").forceMatchPolicyName(policy.name)
        val storeMap = mapOf("some_other_store" to "Bar")

        assertFailsWith<PolicyViolation.NoStoreForPolicyTarget> {
            translatePolicy(policy, recipe, storeMap)
        }
    }

    @Test
    fun applyPolicy_storeClaims_emptyPolicy() {
        val recipe = recipes.getValue("SingleMappedInput").forceMatchPolicyName(BLANK_POLICY_NAME)
        val storeMap = mapOf("my_store_id" to "Foo")

        val result = translatePolicy(BLANK_POLICY, recipe, storeMap)

        assertThat(result.storeClaims).isEmpty()
    }

    @Test
    fun applyPolicy_storeClaims_joinUsageType() {
        val policy = policies.getValue("FooJoinPolicy")
        val recipe = recipes.getValue("SingleMappedInput").forceMatchPolicyName(policy.name)
        val storeMap = mapOf("my_store_id" to "Foo")

        val result = translatePolicy(policy, recipe, storeMap)

        assertThat(result.storeClaims).isEmpty()
    }

    @Test
    fun applyPolicy_storeClaims_nestedSubfields() {
        val policy = policies.getValue("NestedFooBarPolicy")
        val recipe = recipes.getValue("SingleMappedInput").forceMatchPolicyName(policy.name)
        val storeMap = mapOf("my_store_id" to "NestedFooBar")

        val result = translatePolicy(policy, recipe, storeMap)

        val store = AccessPath.Root.Store("my_store_id")
        val predicate = labelPredicate("allowedForEgress")
        assertThat(result.storeClaims).containsExactly(
            "my_store_id",
            listOf(
                Claim.Assume(AccessPath(store, selectors("foo")), predicate),
                Claim.Assume(AccessPath(store, selectors("foo", "a")), predicate),
                Claim.Assume(AccessPath(store, selectors("foo", "b")), predicate),
                Claim.Assume(AccessPath(store, selectors("foo", "c")), predicate),
                Claim.Assume(AccessPath(store, selectors("bar")), predicate),
                Claim.Assume(AccessPath(store, selectors("bar", "a")), predicate)
            )
        )
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

        private fun selectors(vararg fields: String): List<AccessPath.Selector> {
            return fields.toList().map { AccessPath.Selector.Field(it) }
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
