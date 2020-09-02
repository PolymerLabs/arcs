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

import arcs.core.data.Recipe
import arcs.core.type.Type
import java.util.IdentityHashMap

/**
 * Returns a dot representation of this [RecipeGraph].
 *
 * The [nodeLabeler] function is used to label the nodes in the dot output.
*/
fun RecipeGraph.toDotGraph(
    nodeLabeler: (RecipeGraph.Node) -> String = { node -> "$node" }
): String {
    val toStringOptions = Type.ToStringOptions(hideFields = false, pretty = true)
    var nextParticleIndex = mutableMapOf<String, Int>()
    val getUniqueName = { particle: Recipe.Particle ->
        val name = particle.spec.name
        val index = nextParticleIndex[name] ?: 0
        nextParticleIndex[name] = index + 1
        "${name}_$index"
    }
    // We use [IdentityHashMap] instead of a [MutableMap] or [associateBy] because a [Recipe] can
    // have multiple instances of the same [Recipe.Particle].
    val nodeNames = IdentityHashMap<RecipeGraph.Node, String>()
    nodes.forEach { node ->
        nodeNames[node] = when (node) {
            is RecipeGraph.Node.Particle -> getUniqueName(node.particle)
            is RecipeGraph.Node.Handle -> "${node.handle.name}"
        }
    }
    val dotNodes = nodeNames.map { (node, name) ->
        when (node) {
            is RecipeGraph.Node.Particle -> {
                val nodeLabel = "$name: ${nodeLabeler(node)}"
                """  $name[shape="box", label="$nodeLabel"];"""
            }
            is RecipeGraph.Node.Handle -> {
                val typeText = node.handle.type.toString(toStringOptions)
                val nodeLabel = "$name: $typeText ${nodeLabeler(node)}"
                """  $name[label="$name: $nodeLabel"];"""
            }
        }
    }.joinToString(separator = "\n")
    val dotEdges = nodes.flatMap { node ->
        node.successors.map { (succ, kind) ->
            when (kind) {
                is RecipeGraph.EdgeKind.HandleConnection -> {
                    val typeText = kind.spec.type.toString(toStringOptions)
                    """  ${nodeNames[node]} -> ${nodeNames[succ]}[label="$typeText"];"""
                }
                is RecipeGraph.EdgeKind.JoinConnection -> {
                    val componentText = "${kind.spec.component}"
                    """  ${nodeNames[node]} -> ${nodeNames[succ]}[label="$componentText"];"""
                }
            }
        }
    }.joinToString(separator = "\n")
    return "digraph G {\n$dotNodes\n$dotEdges\n}"
}
