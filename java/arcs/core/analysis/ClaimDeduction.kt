package arcs.core.analysis

import arcs.core.data.AccessPath
import arcs.core.data.Claim
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.ParticleSpec
import arcs.core.data.Recipe
import arcs.core.data.expression.Expression

/**
 * Deduce [Claim]s on Paxel [Expression]s from all connections on a [Recipe.Particle].
 *
 * See [DependencyNode] for more information.
 */
fun RecipeGraph.Node.Particle.deduceClaims(): List<Claim> {
  return particle.spec.connections.values
    .filter { connection -> connection.expression != null }
    .flatMap { connection ->
      val root = connection.expression?.analyze()
      require(root is DependencyNode.AssociationNode) {
        "Expression on '${particle.spec.name}.${connection.name}' is invalid."
      }
      root.toClaims(particle, connection)
    }
}

/**
 * This flattens nested [DependencyNode]s into a map of [Path]s and terminal [DependencyNode]s.
 *
 * Example:
 *   ```
 *   DependencyNode.AssociationNode(
 *     "a" to DependencyNode.AssociationNode(
 *        "x" to DependencyNode.AssociationNode(
 *          "q": DependencyNode.Input("input", "foo")
 *        ),
 *        "y" to DependencyNode.Input("input", "bar")
 *     ),
 *     "b" to DependencyNode.DerivedFrom(
 *       DependencyNode.Input("input", "foo"),
 *       DependencyNode.Input("input", "bar")
 *     )
 *   )
 *   ```
 * This would be flattened to:
 *
 *   ```
 *   mapOf(
 *     listOf("a", "x", "q") to DependencyNode.Input("input", "foo"),
 *     listOf("a", "y") to DependencyNode.Input("input", "bar"),
 *     listOf("b") to DependencyNode.DerivedFrom(
 *       DependencyNode.Input("input", "foo"),
 *       DependencyNode.Input("input", "bar")
 *     )
 *   )
 *   ```
 */
private fun DependencyNode.AssociationNode.flatten(
  prefix: List<String> = emptyList(),
  output: MutableMap<List<String>, DependencyNode> = mutableMapOf()
): Map<List<String>, DependencyNode> {
  this.associations.forEach { (id, node) ->
    val path = prefix + listOf(id)
    when (node) {
      is DependencyNode.AssociationNode -> node.flatten(path, output)
      else -> output[path] = node
    }
  }
  return output
}

/**
 * Converts a [DependencyNode.AssociationNode] into a list of [Claim]s, given contextual information
 * about the particle.
 *
 * [DependencyNode.AssociationNode]s is a DAG-like structure that can represent data flow
 * relationships from the target `connection`s to other [HandleConnectionSpec]s in the
 * [ParticleSpec].
 *
 * This [flatten]s the nested [DependencyNode.AssociationNode] and then transforms its data into
 * [Claim.DerivesFrom] statements.
 */
private fun DependencyNode.AssociationNode.toClaims(
  particle: Recipe.Particle,
  connection: HandleConnectionSpec
): List<Claim> {
  return this.flatten().flatMap { (lhsPath, node) ->
    val lhs = AccessPath(particle, connection, lhsPath.asFields())
    when (node) {
      is DependencyNode.Input -> listOf(Claim.DerivesFrom(lhs, node.toAccessPath(particle)))
      is DependencyNode.DerivedFrom -> node.toAccessPaths(particle)
        .map { rhs -> Claim.DerivesFrom(lhs, rhs) }
      is DependencyNode.AssociationNode -> throw UnsupportedOperationException(
        "AssociationNode is not a terminal DependencyNode."
      )
    }
  }
}

/** Converts a [Path] into an [AccessPath]. */
private fun List<String>.asFields() = map { AccessPath.Selector.Field(it) }

/** Converts a [DependencyNode.Input] into an [AccessPath], given Particle context. */
private fun DependencyNode.Input.toAccessPath(particle: Recipe.Particle): AccessPath {
  val connectionName = requireNotNull(path.firstOrNull()) {
    "Cannot access a handle connection from an empty field path."
  }
  val connection = requireNotNull(particle.spec.connections[connectionName]) {
    "Particle '${particle.spec.name}' does not have a handle connection called '$connectionName'."
  }
  return AccessPath(particle, connection, path.drop(1).asFields())
}

/** Converts a [DependencyNode.DerivedFrom] into [AccessPath]s, given Particle context. */
private fun DependencyNode.DerivedFrom.toAccessPaths(particle: Recipe.Particle): List<AccessPath> =
  this.inputs.map { input -> input.toAccessPath(particle) }
