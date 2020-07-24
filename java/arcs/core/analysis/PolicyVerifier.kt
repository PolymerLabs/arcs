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
import arcs.core.data.InformationFlowLabel.Predicate
import arcs.core.data.ParticleSpec
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
    public fun verifyPolicy(recipe: Recipe, policy: Policy): Boolean {
        // TODO(b/162083814): This should be moved to the compilation step.
        val policyConstraints = translatePolicy(policy, options)
        val graph = RecipeGraph(recipe)

        // Map the storeClaims to the corresponding handles.
        val ingresses = graph.handleNodes.mapNotNull { getIngressInfo(it, policyConstraints) }

        // Compute the egress check map.
        val egressCheckPredicate = policyConstraints.egressCheck
        val egressParticles = recipe.particles.filterNot { it.spec.isolated }
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
    }

    /**
     * Returns the egress checks.
     *
     * @throws [PolicyViolation] if recipe violates egress requirements.
     */
    private fun getEgressChecks(
        policy: Policy,
        recipe: Recipe,
        egressCheck: Predicate
    ): Map<ParticleSpec, List<Check>> {
        // Check that egress particles are compliant with policy.
        val egressParticles = recipe.particles.filterNot { it.spec.isolated }
        checkEgressParticles(policy, egressParticles)

        // Create a check for each handle connection needs in the egress particles.
        return egressParticles.associate { particle ->
            val checks = particle.spec.connections.values
                .filter {
                    // TODO(b/157605232): Also check canQuery -- but first, need to add QUERY to
                    // the Direction enum in the manifest proto.
                    it.direction.canRead
                }
                .map { connectionSpec ->
                    Check.Assert(AccessPath(particle, connectionSpec), egressCheck)
                }
            particle.spec to checks
        }
    }

    /**
     * Verifies that the given egress particle nodes match the policy. The only egress particle
     * allowed to be used with a policy named `Foo` is an egress particle named `Egress_Foo`.
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
            throw PolicyViolation.InvalidEgressParticle(
                policy,
                invalidEgressParticles.map { it.name }
            )
        }
    }
}
