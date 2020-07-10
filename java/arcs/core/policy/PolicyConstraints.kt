package arcs.core.policy

import arcs.core.data.AccessPath
import arcs.core.data.Check
import arcs.core.data.InformationFlowLabel.Predicate
import arcs.core.data.InformationFlowLabel.SemanticTag
import arcs.core.data.Recipe

/**
 * Additional checks and claims that should be added to the particles in a recipe, which together
 * are used to enforce that it complies with a policy.
 */
data class PolicyConstraints(
    val policy: Policy,
    val recipe: Recipe,
    val egressChecks: Map<Recipe.Particle, List<Check>>
    // TODO(b/157605232): Add store claims.
)

/**
 * Translates the given [policy] into dataflow analysis checks and claims, which are to be added to
 * the particles from the given [recipe].
 *
 * @return additional checks and claims for the particles as a [PolicyConstraints] object
 * @throws PolicyViolation if the [particles] violate the [policy]
 */
fun translatePolicy(policy: Policy, recipe: Recipe): PolicyConstraints {
    val egressParticles = recipe.particles.filterNot { it.spec.isolated }
    checkEgressParticles(policy, egressParticles)

    // Add check statements to every egress particle node.
    val egressCheckPredicate = createEgressCheckPredicate(policy)
    val egressChecks = egressParticles.associateWith { particle ->
        // Each handle connection needs its own check statement.
        particle.spec.connections.values
            .filter {
                // TODO(b/157605232): Also check canQuery -- but first, need to add QUERY to the
                // Direction enum in the manifest proto.
                it.direction.canRead
            }
            .map { connectionSpec ->
                Check.Assert(AccessPath(particle, connectionSpec), egressCheckPredicate)
            }
    }

    // TODO(b/157605232): Add store claims.
    return PolicyConstraints(policy, recipe, egressChecks)
}

/**
 * Verifies that the given egress particle nodes match the policy. The only egress particle allowed
 * to be used with a policy named `Foo` is an egress particle named `Egress_Foo`.
 */
private fun checkEgressParticles(policy: Policy, egressParticles: List<Recipe.Particle>) {
    val numValidEgressParticles = egressParticles.count {
        it.spec.name == policy.egressParticleName
    }
    if (numValidEgressParticles > 1) {
        throw PolicyViolation.MultipleEgressParticles(policy)
    }
    val invalidEgressParticles = egressParticles
        .map { it.spec }
        .filter { it.name != policy.egressParticleName }
    if (invalidEgressParticles.isNotEmpty()) {
        throw PolicyViolation.InvalidEgressParticle(policy, invalidEgressParticles.map { it.name })
    }
}

/**
 * Constructs the [Predicate] that is to be used for checks on egress particles in the given
 * [Policy].
 *
 * For policies which don't require any redaction labels, the check is a simple one of the form
 * `check x is allowedForEgress`.
 *
 * For policies with redaction labels (e.g. `label1`, `label2`, `label3`), the check looks so:
 * ```
 * check x is allowedForEgress
 *   or (is allowedForEgress_label1 and is label1)
 *   or (is allowedForEgress_label2 and is label2)
 *   or (is allowedForEgress_label3 and is label3)
 * ```
 */
private fun createEgressCheckPredicate(policy: Policy): Predicate {
    val allowedForEgress = labelPredicate(ALLOWED_FOR_EGRESS_LABEL)
    if (policy.allRedactionLabels.isEmpty()) {
        return allowedForEgress
    }
    // List of predicates of the form: allowedForEgress_X AND X.
    val labelPredicates = policy.allRedactionLabels.sorted().map { label ->
        labelPredicate("${ALLOWED_FOR_EGRESS_LABEL}_$label") and labelPredicate(label)
    }
    // OR the predicates for each redaction label together.
    return Predicate.or(allowedForEgress, *labelPredicates.toTypedArray())
}

private fun labelPredicate(label: String) = Predicate.Label(SemanticTag(label))

const val ALLOWED_FOR_EGRESS_LABEL = "allowedForEgress"

/** Indicates that a policy was violated by a recipe. */
sealed class PolicyViolation(val policy: Policy, message: String) : Exception(
    "Policy ${policy.name} violated: $message"
) {
    /** Thrown when egress particles were found in the recipe that are not allowed by policy. */
    class InvalidEgressParticle(
        policy: Policy,
        val particleNames: List<String>
    ) : PolicyViolation(
        policy,
        "Egress particle allowed by policy is ${policy.egressParticleName} but found: " +
            particleNames.joinToString()
    )

    /** Thrown when multiple egress particles were found in the recipe. */
    class MultipleEgressParticles(policy: Policy) : PolicyViolation(
        policy,
        "Multiple egress particles named ${policy.egressParticleName} found for policy"
    )
}
