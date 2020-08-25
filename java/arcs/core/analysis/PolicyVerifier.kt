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
import arcs.core.data.Claim
import arcs.core.data.Recipe
import arcs.core.policy.Policy
import arcs.core.policy.PolicyConstraints
import arcs.core.policy.PolicyOptions
import arcs.core.policy.PolicyViolation
import arcs.core.policy.translatePolicy

/** A class to verify that recipes are compliant with a policy. */
class PolicyVerifier(val options: PolicyOptions) {
    /**
     * Returns true if the recipe is compliant with the given policy.
     *
     * @throws [PolicyViolation] if policy is violated by the recipe.
     */
    fun verifyPolicy(recipe: Recipe, policy: Policy): Boolean {
        checkPolicyName(recipe, policy)

        // TODO(b/162083814): This should be moved to the compilation step.
        val policyConstraints = translatePolicy(policy, options)
        val graph = RecipeGraph(recipe)

        // Map the storeClaims to the corresponding handles.
        val ingresses = graph.handleNodes.mapNotNull { getIngressInfo(it, policyConstraints) }

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
     * If there are any claims associated with this handle's stores, creates and returns a
     * [InformationFlow.IngressInfo] after remapping the root of the claims from the store to this
     * handle. Otherwise returns null.
     */
    private fun getIngressInfo(
        handleNode: RecipeGraph.Node.Handle,
        policyConstraints: PolicyConstraints
    ): InformationFlow.IngressInfo? {
        return policyConstraints.storeClaims[handleNode.handle.id]
            ?.filterIsInstance<Claim.Assume>()
            ?.map {
                Claim.Assume(
                    AccessPath(handleNode.handle, it.accessPath.selectors),
                    it.predicate
                )
            }
            ?.let { claims -> InformationFlow.IngressInfo(handleNode, claims) }
            // If there is information in `storeClaims`, use the safest information.
            ?: getDefaultIngressInfo(handleNode)
    }

    /**
     * Returns an [IngressInfo] with empty claims if [handleNode] has (1) only read connections, or
     * (2) is written to by a particle that only has write connections. Otherwise, returns null.
     *
     * When the above conditions are true for a handle, the store corresponding to the handle is a
     * possibly protected store and this handle should be treated as an ingress. If we don't treat
     * this handle as an ingress, dataflow analysis would not track data flows from this handle and
     * a recipe might be verified as being compliant with a policy even if it isn't.
     *
     * Returning empty claims makes sure that we can't do anything with the data, and therefore,
     * the recipe will be rejected if it egresses any data from this store.
     */
    private fun getDefaultIngressInfo(
        handleNode: RecipeGraph.Node.Handle
    ) = InformationFlow.IngressInfo(handleNode, emptyList()).takeIf {
        handleNode.predecessors.isEmpty() ||
        handleNode.predecessors.any { predecessor ->
            predecessor.node is RecipeGraph.Node.Particle &&
            predecessor.node.particle.spec.connections.all { (_, spec) ->
                spec.direction.canWrite && !spec.direction.canRead
            }
        }
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
