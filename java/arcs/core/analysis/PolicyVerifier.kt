/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.analysis

import arcs.core.data.AccessPath
import arcs.core.data.Check
import arcs.core.data.Recipe
import arcs.core.host.toSchema
import arcs.core.policy.Policy
import arcs.core.policy.PolicyConstraints
import arcs.core.policy.PolicyOptions
import arcs.core.policy.PolicyViolation
import arcs.core.policy.translatePolicy

/** A class to verify that recipes are compliant with a policy. */
@Suppress("UNUSED_PARAMETER") // TODO(b/164153178): Delete PolicyOptions.
class PolicyVerifier(val options: PolicyOptions? = null) {
    /**
     * Returns true if the recipe is compliant with the given policy.
     *
     * @throws [PolicyViolation] if policy is violated by the recipe.
     */
    fun verifyPolicy(recipe: Recipe, policy: Policy): Boolean {
        checkPolicyName(recipe, policy)

        // TODO(b/162083814): This should be moved to the compilation step.
        val graph = RecipeGraph(recipe)
        val policyConstraints = translatePolicy(policy)

        // Map the claims from the PolicyConstraints to the corresponding handles.
        val ingresses = getGraphIngresses(graph, policyConstraints)

        // Compute the egress check map.
        val egressCheckPredicate = policyConstraints.egressCheck
        val egressParticles = recipe.particles.filter { it.spec.dataflowType.egress }
        checkEgressParticles(policy, egressParticles)
        val egressChecks = egressParticles.associate { particle ->
            // Each handle connection needs its own check statement.
            val checks = particle.spec.connections.values
                .filter {
                    // TODO(b/157605232): Also check canQuery -- but first, need to add QUERY to
                    // the Direction enum in the manifest proto.
                    it.direction.canRead
                }
                .map { connectionSpec ->
                    Check.Assert(AccessPath(particle, connectionSpec), egressCheckPredicate)
                }
            particle.spec to checks
        }
        val analysisResult = InformationFlow.computeLabels(graph, ingresses, egressChecks)
        val violations = analysisResult.checks.flatMap { (particle, checks) ->
            checks.filterNot { check -> analysisResult.verify(particle, check) }
            .map { it as Check.Assert }
        }

        if (violations.isNotEmpty()) {
            throw PolicyViolation.ChecksViolated(policy, violations)
        }

        // No violations.
        return true
    }

    /**
     * Generates a list of [InformationFlow.IngressInfo] for every ingress handle in the graph. The
     * claims in the returned ingress info for a handle will be derived from the [PolicyConstraints]
     * that apply to that handle. When there are no such constraints, an empty list of claims will
     * be used. This will ensure that the data in the ingress handle cannot be egressed.
     */
    private fun getGraphIngresses(
        graph: RecipeGraph,
        policyConstraints: PolicyConstraints
    ): List<InformationFlow.IngressInfo> {
        return getIngressHandles(graph).map { handleNode ->
            val partialClaims = handleNode.handle.type.toSchema().name?.name?.let { schemaName ->
                policyConstraints.claims[schemaName]
            }
            val claims = partialClaims.orEmpty().map { it.inflate(handleNode.handle) }
            InformationFlow.IngressInfo(handleNode, claims)
        }
    }

    /**
     * Returns the set of all ingress handles in the [graph].
     *
     * Ingress handles are identified as being the outputs of particles marked with the `@ingress`
     * annotation, and any handle with the `map` fate.
     */
    private fun getIngressHandles(graph: RecipeGraph): Set<RecipeGraph.Node.Handle> {
        // Compute set of handles explicitly marked as ingress (via @ingress annotations on the
        // particles that write to them).
        val ingressParticleNodes = graph.particleNodes.filter { particleNode ->
            particleNode.particle.spec.dataflowType.ingress
        }
        val explicitIngressHandles = ingressParticleNodes
            .flatMap { particleNode -> particleNode.successors }
            .map { neighbor -> neighbor.node }
            .filterIsInstance<RecipeGraph.Node.Handle>()
            .toSet()

        // Compute set of mapped handles (these will be treated as ingress points too).
        val mappedHandles = graph.handleNodes.filter { handleNode ->
            handleNode.handle.fate == Recipe.Handle.Fate.MAP
        }

        return explicitIngressHandles + mappedHandles
    }

    /**
     * Verifies that the given egress particle nodes match the policy. The egress type of the
     * particles must match the egress type of the policy.
     */
    private fun checkEgressParticles(policy: Policy, egressParticles: List<Recipe.Particle>) {
        val invalidEgressParticles = egressParticles
            .map { it.spec }
            .filter { it.dataflowType.egress && it.egressType != policy.egressType }
        if (invalidEgressParticles.isNotEmpty()) {
            throw PolicyViolation.InvalidEgressTypeForParticles(
                policy = policy,
                invalidEgressParticles = invalidEgressParticles
            )
        }
    }

    /** Checks that the given [policy] matches the recipe's `@policy` annotation. */
    private fun checkPolicyName(recipe: Recipe, policy: Policy) {
        val policyName = recipe.policyName
        if (policyName == null) {
            throw PolicyViolation.MissingPolicyAnnotation(recipe, policy)
        } else if (policyName != policy.name) {
            throw PolicyViolation.MismatchedPolicyName(policyName, policy)
        }
    }
}
