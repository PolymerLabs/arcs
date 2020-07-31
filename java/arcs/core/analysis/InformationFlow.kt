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
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.FieldName
import arcs.core.data.FieldType
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.InformationFlowLabel
import arcs.core.data.InformationFlowLabel.Predicate
import arcs.core.data.MuxType
import arcs.core.data.ParticleSpec
import arcs.core.data.Recipe
import arcs.core.data.Recipe.Particle
import arcs.core.data.ReferenceType
import arcs.core.data.Schema
import arcs.core.data.SchemaRegistry
import arcs.core.data.SingletonType
import arcs.core.data.TupleType
import arcs.core.type.Tag
import arcs.core.type.Type
import arcs.core.util.TaggedLog
import java.util.BitSet

/**
 * Information flow analysis of a [Recipe] using the labels in the particle checks and claims.
 */
class InformationFlow private constructor(
    private val graph: RecipeGraph,
    private val ingresses: List<IngressInfo>,
    private val egressChecks: Map<ParticleSpec, List<Check>>
) : RecipeGraphFixpointIterator<AccessPathLabels>(AccessPathLabels.getBottom()) {

    /**
     * Information about an ingress [handleNode] in the recipe graph, where [claims] represents the
     * initial set of claims on the ingress handle.
     */
    data class IngressInfo(val handleNode: RecipeGraph.Node.Handle, val claims: List<Claim>)

    private val log = TaggedLog { "InformationFlow" }

    private val particleClaims = graph.particleNodes.associateBy(
        keySelector = { it.particle },
        valueTransform = { it.instantiatedClaims() }
    )

    private val particleChecks = graph.particleNodes.associateBy(
        keySelector = { it.particle },
        valueTransform = { node ->
            val instantiatedExtraChecks = egressChecks[node.particle.spec]?.map { check ->
                check.instantiateFor(node.particle)
            }
            node.instantiatedChecks() + (instantiatedExtraChecks ?: emptyList())
        }
    )

    /** Returns all the labels in the given list of [Claim] instances. */
    private fun List<Claim>.getLabels(): List<InformationFlowLabel> {
        return flatMap { claim ->
            when (claim) {
                is Claim.Assume -> claim.predicate.labels()
                else -> emptyList()
            }
        }
    }

    /** Represents all the labels mentioned in the ingress claims. */
    private val labelsInIngressClaims = ingresses.flatMap { it.claims.getLabels() }.toSet()

    /** Represents all the labels mentioned in the particle claims. */
    private val labelsInClaims: Set<InformationFlowLabel> =
        particleClaims.values.flatMap { claims -> claims.getLabels() }.toSet()

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
    private val labels = ArrayList(labelsInClaims union labelsInIngressClaims union labelsInChecks)

    /** Index assigned to the labels for use in bitsets. */
    private val labelIndices: Map<InformationFlowLabel, Int> = labels.mapIndexed {
        index, label -> label to index
    }.toMap()

    override fun getInitialValues(graph: RecipeGraph): Map<RecipeGraph.Node, AccessPathLabels> {
        return ingresses
            .map { (it.handleNode as RecipeGraph.Node) to getInitialValues(it) }
            .toMap()
            .also {
                log.debug { "Initial Values For Ingress Nodes:\n $it" }
            }
    }

    private fun getInitialValues(ingress: IngressInfo): AccessPathLabels {
        // The initial value is (accessPaths -> emptyLabels) followed by applying all the claims.
        val handle = ingress.handleNode.handle
        val root = AccessPath.Root.Handle(handle)
        // 1. accessPaths -> emptyLabels
        val emptyLabelsMap = mutableMapOf<AccessPath, InformationFlowLabels>()
        for (accessPath in handle.type.getAccessPaths(root)) {
            emptyLabelsMap[accessPath] = getEmptyLabels()
        }
        // 2. Apply any initial claims.
        return emptyLabelsMap
            .apply { applyAssumes(ingress.claims) }
            .let { AccessPathLabels.makeValue(it.toMap()) }
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
        val resultAccessPathLabels = mutableMapOf<AccessPath, InformationFlowLabels>()
        particle.handleConnections.filter { it.spec.direction.canWrite }
            .flatMap { handleConnection ->
                val root = AccessPath.Root.HandleConnection(particle, handleConnection.spec)
                val resolvedType = particle.getResolvedType(handleConnection.spec)
                resolvedType.getAccessPaths(root).map { it to mixedLabels.copy() }
            }.toMap(resultAccessPathLabels)

        // Apply claims if any.
        particleClaims[particle]?.let {
            // First `derives from` claims followed by `assume` claims.
            resultAccessPathLabels.applyDerivesFromClaims(inputLabelsMap, it)
            resultAccessPathLabels.applyAssumes(it)
        }

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
        val targetSelectors = toHandle.type.accessPathSelectors(partial = true)

        // Filter out the information pertaining to the given handle-connection -> handle edge.
        // Also, convert the root of the access path from handle-connection to handle.
        return AccessPathLabels.makeValue(
            accessPathLabels
                .filterKeys { accessPath ->
                    accessPath.root == handleConnection &&
                    accessPath.isCompatibleWith(targetSelectors)
                }
                .map { (accessPath, labels) -> AccessPath(handle, accessPath.selectors) to labels }
                .toMap()
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
        val resolvedType = toParticle.getResolvedType(spec)
        val targetSelectors = resolvedType.accessPathSelectors(partial = true)

        // Filter out the information pertaining to the given handle -> handle-connection edge.
        // Also, convert the root of the access path from handle to handle-connection.
        return AccessPathLabels.makeValue(
            accessPathLabels
                .filterKeys { accessPath ->
                    accessPath.root == handle &&
                    accessPath.isCompatibleWith(targetSelectors)
                }
                .map { (accessPath, labels) ->
                    AccessPath(handleConnection, accessPath.selectors) to labels
                }.toMap()
        )
    }

    override fun edgeTransfer(
        fromHandle: Recipe.Handle,
        toHandle: Recipe.Handle,
        spec: RecipeGraph.JoinSpec,
        input: AccessPathLabels
    ): AccessPathLabels {
        val accessPathLabels = input.accessPathLabels ?: return input
        val toHandleRoot = AccessPath.Root.Handle(toHandle)
        val handle = AccessPath.Root.Handle(fromHandle)
        val sourceSelectors = fromHandle.type.accessPathSelectors(partial = true)

        // Filter out the information pertaining to the given handle -> join-handle edge.
        // Also, convert the root of the access path from handle to join-handle.
        val component = listOf(getTupleField(spec.component))
        return AccessPathLabels.makeValue(
            accessPathLabels
                .filterKeys { accessPath ->
                    accessPath.root == handle &&
                    accessPath.isCompatibleWith(sourceSelectors)
                }
                .map { (accessPath, labels) ->
                    AccessPath(toHandleRoot, component + accessPath.selectors) to labels
                }.toMap()
        )
    }

    /** Returns the resolved type for the given handle connection spec in the particle. */
    private fun Particle.getResolvedType(connectionSpec: HandleConnectionSpec): Type {
        val connection = requireNotNull(handleConnections.find { it.spec == connectionSpec }) {
            "Unable to find a handle connection for ${connectionSpec.name} in a particle."
        }
        return connection.type
    }

    /** Returns all the [AccessPath] instances for this [Type] with the given [root]. */
    private fun Type.getAccessPaths(root: AccessPath.Root): List<AccessPath> {
        val selectorsList = accessPathSelectors(partial = false)
        if (selectorsList.isEmpty()) {
            return listOf(AccessPath(root))
        } else {
            return selectorsList.map { selectors -> AccessPath(root, selectors) }
        }
    }

    /**
     * Returns the [AccessPath.Selector] part of the [AccessPath] instances for this [Type].
     *
     * If [partial] is true, returns intermedate paths as well. e.g., `foo.a` and `foo.a.b`
     * are both returned if [partial] is true, otherwise only `foo.a.b` is returned.
     */
    private fun Type.accessPathSelectors(
        partial: Boolean
    ): Set<List<AccessPath.Selector>> = when (tag) {
        Tag.Collection -> (this as CollectionType<*>).collectionType.accessPathSelectors(partial)
        Tag.Count -> emptySet<List<AccessPath.Selector>>()
        Tag.Entity -> (this as EntityType).entitySchema.accessPathSelectors(emptyList(), partial)
        // TODO(b/154234733): This only supports simple use cases of references.
        Tag.Reference -> (this as ReferenceType<*>).containedType.accessPathSelectors(partial)
        Tag.Mux -> (this as MuxType<*>).containedType.accessPathSelectors(partial)
        Tag.Tuple -> (this as TupleType).elementTypes
            .foldIndexed(emptySet<List<AccessPath.Selector>>()) { index, acc, cur ->
                acc + cur.accessPathSelectors(partial).map { listOf(getTupleField(index)) + it }
            }
        Tag.Singleton -> (this as SingletonType<*>).containedType.accessPathSelectors(partial)
        Tag.TypeVariable -> throw IllegalArgumentException("TypeVariable should be resolved!")
    }

    /**
     * Returns the [AccessPath.Selector] part of [AccessPath] instances for this [Schema].
     * If [partial] is true, returns intermedate paths as well.
     */
    private fun Schema.accessPathSelectors(
        prefix: List<AccessPath.Selector>,
        partial: Boolean
    ): Set<List<AccessPath.Selector>> {
        return fields.singletons.accessPathSelectors(prefix, partial) +
        fields.collections.accessPathSelectors(prefix, partial)
    }

    private fun Map<FieldName, FieldType>.accessPathSelectors(
        prefix: List<AccessPath.Selector>,
        partial: Boolean
    ): Set<List<AccessPath.Selector>> {
        return asSequence().fold(emptySet<List<AccessPath.Selector>>()) { acc, (name, type) ->
            acc +
            type.accessPathSelectors(prefix + listOf(AccessPath.Selector.Field(name)), partial)
        }.toSet()
    }

    private fun FieldType.accessPathSelectors(
        prefix: List<AccessPath.Selector>,
        partial: Boolean
    ): Set<List<AccessPath.Selector>> {
        return when (tag) {
            // For primitives, we don't go down to collect access paths.
            FieldType.Tag.Primitive -> setOf(prefix)
            // TODO(b/154234733): For references, we should go down, but it gets a bit tricky
            // as there can be cycles in the access paths. Right now, we don't support cyclic
            // references. So, it is OK to go down. Eventually we should detect cycles here.
            FieldType.Tag.EntityRef -> {
                val schema = SchemaRegistry.getSchema((this as FieldType.EntityRef).schemaHash)
                (if (partial) setOf(prefix) else emptySet()) +
                schema.accessPathSelectors(prefix, partial)
            }
            FieldType.Tag.Tuple -> {
                // Access path selectors of all components.
                val componentSelectors = (this as FieldType.Tuple).types
                    .foldIndexed(emptySet<List<AccessPath.Selector>>()) { index, result, cur ->
                        result + cur.accessPathSelectors(prefix, partial).map {
                            // Prepend the component selector to the component's access paths.
                            listOf(getTupleField(index)) + it
                        }
                    }
                (if (partial) setOf(prefix) else emptySet()) + componentSelectors
            }
            FieldType.Tag.List -> {
                (if (partial) setOf(prefix) else emptySet()) +
                (this as FieldType.ListOf).primitiveType.accessPathSelectors(prefix, partial)
            }
            FieldType.Tag.InlineEntity -> {
                val schema = SchemaRegistry.getSchema((this as FieldType.InlineEntity).schemaHash)
                (if (partial) setOf(prefix) else emptySet()) +
                schema.accessPathSelectors(prefix, partial)
            }
        }
    }

    /** Returns true if the selectors of the given [AccessPath] is present in [targetSelectors]. */
    private fun AccessPath.isCompatibleWith(
        targetSelectors: Set<List<AccessPath.Selector>>
    ) = (targetSelectors.isEmpty() && selectors.isEmpty()) || targetSelectors.contains(selectors)

    /** Apply the [Claim.Assume] [claims] to the given map. */
    private fun MutableMap<AccessPath, InformationFlowLabels>.applyAssumes(claims: List<Claim>) {
        claims.asSequence().filterIsInstance<Claim.Assume>().forEach { applyAssume(it) }
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

    /** Apply the [Claim.DerivedFrom] [claims] to the given map. */
    private fun MutableMap<AccessPath, InformationFlowLabels>.applyDerivesFromClaims(
        input: Map<AccessPath, InformationFlowLabels>,
        claims: List<Claim>
    ) {
        val updatedAccessPaths = mutableMapOf<AccessPath, InformationFlowLabels>()
        claims.asSequence().filterIsInstance<Claim.DerivesFrom>().forEach { derivesFrom ->
            val sourceValue = input[derivesFrom.source] ?: getEmptyLabels()
            val currentValue =
                updatedAccessPaths[derivesFrom.target] ?: InformationFlowLabels(emptySet())
            updatedAccessPaths[derivesFrom.target] = sourceValue join currentValue
        }
        updatedAccessPaths.forEach { (accessPath, labels) -> this[accessPath] = labels }
    }

    /** Returns an [InformationFlowLabels] entity with all the labels not set. */
    private fun getEmptyLabels() = InformationFlowLabels(setOf(BitSet(labels.size)))

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

    /** Represents the result of information flow analysis on the given recipe. */
    data class AnalysisResult(
        val recipe: Recipe,
        val fixpoint: FixpointResult<AccessPathLabels>,
        val checks: Map<Particle, List<Check>>,
        val labels: ArrayList<InformationFlowLabel>,
        val labelIndices: Map<InformationFlowLabel, Int>
    )

    companion object {

        val tupleIndexNames = listOf("first", "second", "third", "fourth", "fifth")

        public fun getTupleField(component: Int): AccessPath.Selector.Field {
            require(component >= 0 && component < tupleIndexNames.size) {
                "Only up to ${tupleIndexNames.size} tuple components is allowed!"
            }
            return AccessPath.Selector.Field(tupleIndexNames[component])
        }

        /**
         * Computes the labels for [recipe] when [ingressSpecs] is used as the ingress handles.
         *
         * An [ingressSpec] is of the form "<particle-name>.<connection-name>".
         */
        public fun computeLabels(recipe: Recipe, ingressSpecs: List<String>): AnalysisResult {
            val graph = RecipeGraph(recipe)
            val ingresses = ingressSpecs.flatMap { getIngressInfo(graph, it) }
            return computeLabels(graph, ingresses, emptyMap())
        }

        /**
         * Computes the labels for [recipe] using the given [ingresses] and additional
         * checks for the particles provided in [egressChecks].
         */
        public fun computeLabels(
            graph: RecipeGraph,
            ingresses: List<IngressInfo>,
            egressChecks: Map<ParticleSpec, List<Check>>
        ): AnalysisResult {
            val analysis = InformationFlow(graph, ingresses, egressChecks)
            return AnalysisResult(
                recipe = graph.recipe,
                fixpoint = analysis.computeFixpoint(graph) { value, prefix ->
                    value.toString(prefix) { i -> "${analysis.labels[i]}" }
                },
                checks = analysis.particleChecks,
                labels = analysis.labels,
                labelIndices = analysis.labelIndices
            )
        }

        /**
         * Returns a list of [IngressInfo] for the given [ingressSpec] in the corresponding [graph].
         *
         * An [ingressSpec] is of the form "<particle-name>.<connection-name>".
         */
        private fun getIngressInfo(graph: RecipeGraph, ingressSpec: String): List<IngressInfo> {
            val specParts = ingressSpec.split(".")
            require(specParts.size <= 2) { "Unsupported ingress specification." }
            val particleName = specParts[0]
            val connectionName = if (specParts.size == 2) specParts[1] else null
            val particleNode = graph.nodes.asSequence()
                .filterIsInstance<RecipeGraph.Node.Particle>()
                .find { it.particleName == particleName }

            val particle = particleNode?.particle ?: return emptyList()

            // If a connection is specified, extract ingress information for that alone.
            // Otherwise, extract ingress information for all the write connections.
            // (See filter below.)
            return particle.handleConnections
                .filter { connectionName?.equals(it.spec.name) ?: it.spec.direction.canWrite }
                .map { handleConnection -> getIngressInfo(particleNode, handleConnection) }
        }

        /** Returns the [IngressInfo] for the given [handleConnection] in [particleNode]. */
        private fun getIngressInfo(
            particleNode: RecipeGraph.Node.Particle,
            handleConnection: Recipe.Particle.HandleConnection
        ): IngressInfo {
            val particle = particleNode.particle
            val neighbors = if (handleConnection.spec.direction.canWrite) {
                particleNode.successors
            } else {
                particleNode.predecessors
            }
            val handleNode = neighbors.asSequence()
                .map { neighbor -> neighbor.node }
                .filterIsInstance<RecipeGraph.Node.Handle>()
                .find { it.handle == handleConnection.handle }

            // Extract the claims on access paths based off of the given handleConnection.
            val accessPath = AccessPath(particle.spec.name, handleConnection.spec)
            val claims = particle.spec.claims.asSequence()
                .filterIsInstance<Claim.Assume>()
                .filter { assume -> assume.accessPath.root == accessPath.root }
                .map { assume ->
                    // Remap claim to an access path based on the corresponding handle.
                    Claim.Assume(
                        AccessPath(handleConnection.handle, assume.accessPath.selectors),
                        assume.predicate
                    )
                }.toList()
            return IngressInfo(requireNotNull(handleNode), claims)
        }
    }
}

// TODO(b/158526199): Factor these functions out into their respective classes.

/** Returns the instantiated [List<Claim>] for this particle. */
private fun RecipeGraph.Node.Particle.instantiatedClaims(): List<Claim> {
    return particle.spec.claims.map { it.instantiateFor(particle) }
}

/** Returns the instantiated [List<Check>] for this particle. */
private fun RecipeGraph.Node.Particle.instantiatedChecks(): List<Check> {
    return particle.spec.checks.map { it.instantiateFor(particle) }
}

/** Return the [InformationFlowLabel] occurrences in the predicate. */
private fun Predicate.labels(): List<InformationFlowLabel> = when (this) {
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
    val accessPathLabels = result.getLabels(assert.accessPath)

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
