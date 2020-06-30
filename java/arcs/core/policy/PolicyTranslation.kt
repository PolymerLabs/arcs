package arcs.core.policy

import arcs.core.analysis.RecipeGraph

/**
 * Translates the given [Policy] into dataflow analysis checks and claims on the given
 * [RecipeGraph], returning a modified copy of the graph.
 */
fun applyPolicy(policy: Policy, graph: RecipeGraph): RecipeGraph {
    checkEgressParticles(policy, graph)
    // TODO(b/157605232): Modify the graph and attach checks and claims.
    return graph
}

private fun checkEgressParticles(policy: Policy, graph: RecipeGraph) {
    val invalidEgressParticles = graph.particleNodes
        .map { it.particle.spec  }
        .filter { !it.isolated && it.name != policy.egressParticleName }
    if (invalidEgressParticles.isNotEmpty()) {
        throw PolicyViolation.InvalidEgressParticle(policy, invalidEgressParticles.map { it.name })
    }
}

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
}
