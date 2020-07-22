package arcs.core.policy

import arcs.core.data.AccessPath
import arcs.core.data.Check
import arcs.core.data.Claim
import arcs.core.data.InformationFlowLabel.Predicate
import arcs.core.data.InformationFlowLabel.SemanticTag
import arcs.core.data.ParticleSpec
import arcs.core.data.Recipe
import arcs.core.data.StoreId

/**
 * Additional checks and claims that should be added to the particles in a recipe, which together
 * are used to enforce that it complies with a policy.
 */
data class PolicyConstraints(
    val policy: Policy,
    val egressChecks: Map<ParticleSpec, List<Check>>,
    val storeClaims: Map<StoreId, List<Claim>>
)

/**
 * Translates the given [policy] into dataflow analysis checks and claims, which are to be added to
 * the particles from the given [recipe].
 *
 * @return additional checks and claims for the particles as a [PolicyConstraints] object
 * @throws PolicyViolation if the [particles] violate the [policy]
 */
fun translatePolicy(policy: Policy, recipe: Recipe, options: PolicyOptions): PolicyConstraints {
    val egressParticles = recipe.particles.filterNot { it.spec.isolated }
    checkEgressParticles(policy, egressParticles)

    // Add check statements to every egress particle node.
    val egressCheckPredicate = createEgressCheckPredicate(policy)
    val egressChecks = egressParticles.associate { particle ->
        // Each handle connection needs its own check statement.
        val checks = particle.spec.connections.values
            .filter {
                // TODO(b/157605232): Also check canQuery -- but first, need to add QUERY to the
                // Direction enum in the manifest proto.
                it.direction.canRead
            }
            .map { connectionSpec ->
                Check.Assert(AccessPath(particle, connectionSpec), egressCheckPredicate)
            }
        particle.spec to checks
    }

    // Add claim statements for stores.
    val targetBySchemaName = policy.targets.associateBy { it.schemaName }
    val storeClaims = recipe.handles.values.filter { options.storeMap.containsKey(it.id) }
        .associate { handle ->
            val storeId = handle.id
            val claims = options.storeMap[storeId]?.let { schemaName ->
                targetBySchemaName[schemaName]?.let { target ->
                    createClaims(handle, target)
                }
            }
            handle.id to (claims ?: emptyList())
        }
        .filterValues { it.isNotEmpty() }

    return PolicyConstraints(policy, egressChecks, storeClaims)
}

/** Returns a list of store [Claim]s for the given [handle] and corresponding [target]. */
private fun createClaims(handle: Recipe.Handle, target: PolicyTarget): List<Claim> {
    return target.fields.flatMap { field -> createClaims(handle, field) }
}

/**
 * Returns a list of claims for the given [field] (and all subfields), using the given [handle]
 * as the root for the claims.
 */
private fun createClaims(handle: Recipe.Handle, field: PolicyField): List<Claim> {
    val claims = mutableListOf<Claim>()

    // Create claim for this field.
    createStoreClaimPredicate(field)?.let { predicate ->
        val selectors = field.fieldPath.map { AccessPath.Selector.Field(it) }
        // TODO(b/157605232): This AccessPath is rooted by the handle's name in the recipe. The name
        // might not be the same across different recipes, so this needs to be store ID instead.
        val accessPath = AccessPath(handle, selectors)
        claims.add(Claim.Assume(accessPath, predicate))
    }

    // Add claims for subfields.
    field.subfields.flatMapTo(claims) { subfield -> createClaims(handle, subfield) }

    return claims
}

/**
 * Constructs the [Predicate] for the given [field] in a [Policy], to be used in constructing
 * [Claim]s on the corresponding handles for the field in a recipe.
 */
private fun createStoreClaimPredicate(field: PolicyField): Predicate? {
    val predicates = mutableListOf<Predicate>()
    if (field.rawUsages.canEgress()) {
        predicates.add(labelPredicate(ALLOWED_FOR_EGRESS_LABEL))
    }
    val egressRedactionLabels = field.redactedUsages.filterValues { it.canEgress() }.keys
    egressRedactionLabels.forEach { label ->
        predicates.add(labelPredicate("${ALLOWED_FOR_EGRESS_LABEL}_$label"))
    }
    return when (predicates.size) {
        0 -> null
        1 -> predicates.single()
        else -> Predicate.and(*predicates.toTypedArray())
    }
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
