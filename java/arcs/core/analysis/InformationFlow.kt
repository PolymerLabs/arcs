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
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.HandleMode
import arcs.core.data.InformationFlowLabel
import arcs.core.data.InformationFlowLabel.Predicate
import arcs.core.data.InformationFlowLabel.SemanticTag
import arcs.core.data.Recipe
import arcs.core.data.Recipe.Particle
import arcs.core.util.TaggedLog
import java.util.BitSet

/**
 * Information flow analysis of a [Recipe] using the labels in the particle checks and claims.
 *
 * For the time being, we pass in the ingress handles.
*/
class InformationFlow private constructor(
    private val recipe: Recipe,
    private val ingresses: List<String> = emptyList()
) : RecipeGraphFixpointIterator<AccessPathLabels>(AccessPathLabels.getBottom()) {

    private val log = TaggedLog { "InformationFlow" }

    private val particleClaims: Map<Particle, List<Claim>> = recipe.particles
        .filterNot { it.spec.claims.isEmpty() }
        .map { it to it.instantiatedClaims() }
        .toMap()

    private val particleChecks = recipe.particles
        .filterNot { it.spec.checks.isEmpty() }
        .map { it to it.instantiatedChecks() }
        .toMap()

    /** Returns the instantiated [List<Claim>] for this particle. */
    private fun Particle.instantiatedClaims() = spec.claims.map { it.instantiateFor(this) }

    /** Returns the instantiated [List<Check>] for this particle. */
    private fun Particle.instantiatedChecks() = spec.checks.map { it.instantiateFor(this) }

    /** Represents all the labels mentioned in the particle claims. */
    private val labelsInClaims: Set<InformationFlowLabel> =
        particleClaims.values.flatMap { claims ->
            claims.flatMap { claim ->
                when (claim) {
                    is Claim.Assume -> claim.predicate.labels()
                    else -> emptyList()
                }
            }
        }.toSet()

    /** Represents all the labels mentioned in the particle checks. */
    private val labelsInChecks: Set<InformationFlowLabel> =
        particleChecks.values.flatMap { checks ->
            checks.flatMap { check ->
                when (check) {
                    is Check.Assert -> check.predicate.labels()
                    else -> emptyList()
                }
            }
        }.toSet()

    /** The universe of labels is the union of the labels from the checks and claims. */
    private val labels = ArrayList(labelsInClaims union labelsInChecks)

    /** Index assigned to the labels for use in bitsets. */
    private val labelIndices: Map<InformationFlowLabel, Int> = labels.mapIndexed {
        index, label -> label to index
    }.toMap()

    override fun getInitialValues(graph: RecipeGraph): Map<RecipeGraph.Node, AccessPathLabels> {
        // TODO(bgogul): This is where we get initial value from the mapped stores.
        // TODO(bgogul): Ensure that ingress particles do not have input connections.
        val nodeValues = mutableMapOf<RecipeGraph.Node, AccessPathLabels>()
        ingresses.forEach { ingressSpec ->
            getInitialValueForIngress(graph, ingressSpec)?.let {
                (node, initialValues) -> nodeValues[node] = initialValues
            }
        }
        log.debug { "Initial Values For Ingress Nodes:\n $nodeValues" }
        return nodeValues.toMap()
    }

    /**
     * Returns the initial abstract value to be used for the given [ingressSpec]. An [ingressSpec]
     * is of the form "<particle-name>.<connection-name>".
     */
    private fun getInitialValueForIngress(
        graph: RecipeGraph,
        ingressSpec: String
    ): Pair<RecipeGraph.Node, AccessPathLabels>? {
        val specParts = ingressSpec.split(".")
        require(specParts.size <= 2) { "Unsupported ingress specification." }
        val particleName = specParts[0]
        val connectionName = if (specParts.size == 2) specParts[1] else null
        val particleNode = graph.nodes.asSequence()
            .filterIsInstance<RecipeGraph.Node.Particle>()
            .find { it.particle.spec.name == particleName }
        val initialValues = mutableMapOf<AccessPath, InformationFlowLabels>()

        val particle = particleNode?.particle ?: return null

        // If a connection is specified, set it to empty labels.
        // Otherwise, set all write connections to empty labels.
        particle.handleConnections
            .filter { connectionName?.equals(it.spec.name) ?: it.spec.isWrite() }
            .forEach {
                val emptyLabels = InformationFlowLabels(setOf(BitSet(labels.size)))
                val accessPath = AccessPath(particle, it.spec)
                initialValues[accessPath] = emptyLabels
            }

        // For read-write connections, apply any claims that are present. This is necessary as
        // the claim on a read-write connection immediately manifests on the read connection.
        particleClaims[particle]?.let { claims ->
            initialValues.applyClaims(
                claims.filterIsInstance<Claim.Assume>()
                    .filter {
                        val accessPathRoot =
                            it.accessPath.root as? AccessPath.Root.HandleConnection
                        accessPathRoot?.connectionSpec?.isReadWrite() == true
                    }
            )
        }

        return Pair<RecipeGraph.Node, AccessPathLabels>(
            particleNode as RecipeGraph.Node,
            AccessPathLabels.makeValue(initialValues)
        )
    }

    override fun nodeTransfer(
        particle: Recipe.Particle,
        input: AccessPathLabels
    ): AccessPathLabels {
        // If `input.accessPathLabels` is null, return the input itself.
        // This takes care of `TOP` and `BOTTOM`.
        val inputLabelsMap = input.accessPathLabels ?: return input

        // Compute the label that is obtained by combining labels on all inputs.
        val mixedLabels = inputLabelsMap.values
           .fold(InformationFlowLabels(emptySet())) { acc, cur -> acc join cur }

        // Update all the outputs with the mixed label value.
        // TODO(bgogul): Fields of the connections.
        val resultAccessPathLabels = mutableMapOf<AccessPath, InformationFlowLabels>()
        particle.handleConnections.filter { it.spec.isWrite() }
            .map { AccessPath(particle, it.spec) to mixedLabels.copy() }
            .toMap(resultAccessPathLabels)

        // Apply claims if any.
        particleClaims[particle]?.let { resultAccessPathLabels.applyClaims(it) }

        // Return the final result.
        return AccessPathLabels.makeValue(resultAccessPathLabels.toMap())
    }

    override fun edgeTransfer(
        fromParticle: Recipe.Particle,
        toHandle: Recipe.Handle,
        spec: HandleConnectionSpec,
        input: AccessPathLabels
    ): AccessPathLabels {
        val accessPathLabels = input.accessPathLabels ?: return input
        val handleConnection = AccessPath.Root.HandleConnection(fromParticle, spec)
        val handle = AccessPath.Root.Handle(toHandle)

        // Filter out the information pertaining to the given handle-connection -> handle edge.
        // Also, convert the root of the access path from handle-connection to handle.
        return AccessPathLabels.makeValue(
            accessPathLabels
                .filterKeys { accessPath -> accessPath.root == handleConnection }
                .map { (accessPath, labels) ->
                     AccessPath(handle, accessPath.selectors) to labels
                }.toMap()
        )
    }

    override fun edgeTransfer(
        fromHandle: Recipe.Handle,
        toParticle: Recipe.Particle,
        spec: HandleConnectionSpec,
        input: AccessPathLabels
    ): AccessPathLabels {
        val accessPathLabels = input.accessPathLabels ?: return input
        val handleConnection = AccessPath.Root.HandleConnection(toParticle, spec)
        val handle = AccessPath.Root.Handle(fromHandle)

        // Filter out the information pertaining to the given handle -> handle-connection edge.
        // Also, convert the root of the access path from handle to handle-connection.
        return AccessPathLabels.makeValue(
            accessPathLabels
                .filterKeys { accessPath -> accessPath.root == handle }
                .map { (accessPath, labels) ->
                     AccessPath(handleConnection, accessPath.selectors) to labels
                }.toMap()
        )
    }

    /** Apply the [claims] to the given map. */
    private fun MutableMap<AccessPath, InformationFlowLabels>.applyClaims(claims: List<Claim>) {
        claims.forEach { claim ->
            when (claim) {
                is Claim.Assume -> applyAssume(claim)
                is Claim.DerivesFrom -> {
                    // TODO(bgogul): Deal with derivesFrom claims.
                    TODO("DerivesFrom claims are not yet handled!")
                }
            }
        }
    }

    /** Apply the [assume] to the given map. */
    private fun MutableMap<AccessPath, InformationFlowLabels>.applyAssume(assume: Claim.Assume) {
        val accessPathLabels =
            this[assume.accessPath] ?: InformationFlowLabels(setOf(BitSet(labels.size)))
        // If accessPathLabels.labelSets is null, it indicates TOP/BOTTOM. So, nothing to do.
        val labelSets = accessPathLabels.labelSets ?: return
        this[assume.accessPath] = InformationFlowLabels(
            labelSets.map { labels ->
                (labels.clone() as BitSet).apply { assume.predicate.updateLabels(this) }
            }.toSet()
        )
    }

    /** Update the [labels] bitset to reflect the predicate. */
    private fun Predicate.updateLabels(labels: BitSet) = when (this) {
        is Predicate.Label -> labels.set(labelIndices.getValue(label))
        is Predicate.Not -> {
            require(predicate is Predicate.Label) { "Not is only supported for labels!" }
            val labelPredicate = predicate as Predicate.Label
            labels.clear(labelIndices.getValue(labelPredicate.label))
        }
        else -> throw IllegalArgumentException("Unsupported claim predicates!")
    }

    /** Returns true if the [HandleConnectionSpec] is a write. */
    private fun HandleConnectionSpec.isWrite() = when (direction) {
        HandleMode.Write,
        HandleMode.ReadWrite,
        HandleMode.WriteQuery,
        HandleMode.ReadWriteQuery -> true
        HandleMode.Read, HandleMode.ReadQuery, HandleMode.Query -> false
    }

    private fun HandleConnectionSpec.isReadWrite() = when (direction) {
        HandleMode.ReadWrite, HandleMode.ReadWriteQuery -> true
        else -> false
    }

    /** Represents the result of information flow analysis on the given recipe. */
    data class AnalysisResult(
        val recipe: Recipe,
        val fixpoint: FixpointResult<AccessPathLabels>,
        val checks: Map<Particle, List<Check>>,
        val labels: ArrayList<InformationFlowLabel>,
        val labelIndices: Map<InformationFlowLabel, Int>
    )

    companion object {
        /** Computes the labels for [recipe] when [ingress] is used as the ingress handles. */
        public fun computeLabels(recipe: Recipe, ingress: List<String>): AnalysisResult {
            val graph = RecipeGraph(recipe)
            val analysis = InformationFlow(recipe, ingress)
            return AnalysisResult(
                recipe = recipe,
                fixpoint = analysis.computeFixpoint(graph),
                checks = analysis.particleChecks,
                labels = analysis.labels,
                labelIndices = analysis.labelIndices
            )
        }
    }
}

/** Return the [InformationFlowLabel] occurences in the predicate. */
private fun Predicate.labels(): List<InformationFlowLabel> = when(this) {
    is Predicate.Label -> listOf(label)
    is Predicate.Not -> predicate.labels()
    is Predicate.Or -> lhs.labels() + rhs.labels()
    is Predicate.And -> lhs.labels() + rhs.labels()
}

/** Returns true if the [check] is satisfied by the labels computed for [particle]. */
fun InformationFlow.AnalysisResult.verify(particle: Recipe.Particle, check: Check): Boolean {
    val result = fixpoint.getValue(particle)

    // Unreachable particle => check is trivially satisfied.
    if (result.isBottom) return true

    // All possible values => check is unsatisfied.
    if (result.isTop) return false

    val assert = requireNotNull(check as? Check.Assert)
    val accessPathLabels =
        result.accessPathLabels?.get(assert.accessPath) ?: InformationFlowLabels.getBottom()

    // Unreachable => check is trivially satisfied.
    if (accessPathLabels.isBottom) return true
    // All possible values => check is unsatisfied.
    if (accessPathLabels.isTop) return false

    val labelsForAllReachingPaths = requireNotNull(accessPathLabels.labelSets)
    val assertConjuncts = assert.predicate.asDNF(labelIndices)

    // Returns true if all paths satisfy at least one of the conjuncts in the check.
    return labelsForAllReachingPaths.all { label ->
         assertConjuncts.any { (assertMask, assertConjunct) ->
            val maskedLabel = (label.clone() as BitSet).apply { and(assertMask) }
            maskedLabel.equals(assertConjunct)
        }
    }
}
