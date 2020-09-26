package arcs.core.policy

import arcs.core.data.AccessPath
import arcs.core.data.Check
import arcs.core.data.Claim
import arcs.core.data.InformationFlowLabel.Predicate
import arcs.core.data.InformationFlowLabel.SemanticTag
import arcs.core.data.ParticleSpec
import arcs.core.data.Recipe

/**
 * Additional checks and claims that should be added to the particles in a recipe, which together
 * are used to enforce that it complies with a policy.
 */
data class PolicyConstraints(
  val policy: Policy,
  val egressCheck: Predicate,
  /** Maps from schema name to a list of claims to apply to stores of that type. */
  val claims: Map<String, List<SelectorClaim>>
)

/** Equivalent to a [Claim.Assume] object, but without an [AccessPath.Root]. */
data class SelectorClaim(val selectors: List<AccessPath.Selector>, val predicate: Predicate) {
  /** Converts the [SelectorClaim] to a [Claim] rooted at the given [handle]. */
  fun inflate(handle: Recipe.Handle): Claim {
    return Claim.Assume(AccessPath(handle, selectors), predicate)
  }
}

/**
 * Translates the given [policy] into dataflow analysis checks and claims, which are to be added to
 * the particles from the given [recipe].
 *
 * @return additional checks and claims for the particles as a [PolicyConstraints] object
 * @throws PolicyViolation if the [particles] violate the [policy]
 */
fun translatePolicy(policy: Policy): PolicyConstraints {
  // Compute the predicate that will enforce the policy at an egress.
  val egressCheckPredicate = createEgressCheckPredicate(policy)

  // Add claim statements for stores.
  val claims = policy.targets.associate { target -> target.schemaName to target.createClaims() }

  return PolicyConstraints(policy, egressCheckPredicate, claims)
}

/** Returns a list of store [Claim]s for the given [handle] and corresponding [target]. */
private fun PolicyTarget.createClaims(): List<SelectorClaim> {
  return fields.flatMap { field -> field.createClaims() }
}

/**
 * Returns a list of claims for the given [field] (and all subfields), using the given [handle]
 * as the root for the claims.
 */
private fun PolicyField.createClaims(): List<SelectorClaim> {
  val claims = mutableListOf<SelectorClaim>()

  // Create claim for this field.
  createStoreClaimPredicate()?.let { predicate ->
    val selectors = fieldPath.map { AccessPath.Selector.Field(it) }
    claims.add(SelectorClaim(selectors, predicate))
  }

  // Add claims for subfields.
  subfields.flatMapTo(claims) { subfield -> subfield.createClaims() }

  return claims
}

/**
 * Constructs the [Predicate] for the given [field] in a [Policy], to be used in constructing
 * [Claim]s on the corresponding handles for the field in a recipe.
 */
private fun PolicyField.createStoreClaimPredicate(): Predicate? {
  val predicates = mutableListOf<Predicate>()
  if (rawUsages.canEgress()) {
    predicates.add(labelPredicate(ALLOWED_FOR_EGRESS_LABEL))
  }
  val egressRedactionLabels = redactedUsages.filterValues { it.canEgress() }.keys
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
  class InvalidEgressTypeForParticles(
    policy: Policy,
    val invalidEgressParticles: List<ParticleSpec>
  ) : PolicyViolation(
    policy,
    "Invalid egress types found for particles: " +
      invalidEgressParticles.namesAndEgressTypes() +
      ". Egress type allowed by policy: ${policy.egressType}."
  )

  /** Thrown when policy checks are violated by a recipe. */
  class ChecksViolated(
    policy: Policy,
    checks: List<Check>
  ) : PolicyViolation(policy, "Recipe violates egress checks: $checks")

  /** Thrown when a recipe is missing the `@policy` annotation. */
  class MissingPolicyAnnotation(recipe: Recipe, policy: Policy) : PolicyViolation(
    policy,
    "Recipe '${recipe.name}' does not have an @policy annotation."
  )

  /** Thrown when a recipe was checked against a mismatched policy. */
  class MismatchedPolicyName(electedPolicyName: String, policy: Policy) : PolicyViolation(
    policy,
    "Recipe elected a policy named '$electedPolicyName'."
  )
}

/** Converts a list of particles into their names and egress types, as a string. */
private fun List<ParticleSpec>.namesAndEgressTypes(): String {
  return sortedBy { it.name }.joinToString(prefix = "{", postfix = "}") {
    "${it.name} (${it.egressType})"
  }
}
