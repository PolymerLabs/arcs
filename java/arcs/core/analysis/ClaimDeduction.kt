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

/** Converts a [Path] into an [AccessPath]. */
private fun List<String>.asFields() = map { AccessPath.Selector.Field(it) }

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
  prefix: List<String> = emptyList()
): Map<List<String>, DependencyNode> {
  val output = mutableMapOf<List<String>, DependencyNode>()
  for ((key, value) in this.associations) {
    val path = prefix + listOf(key)
    when (value) {
      is DependencyNode.AssociationNode -> output += value.flatten(path)
      else -> output += path to value
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
  return this.flatten().flatMap { (lhsPath, graph) ->
    val lhs = AccessPath(particle, connection, lhsPath.asFields())
    when (graph) {
      is DependencyNode.Input -> listOf(Claim.DerivesFrom(lhs, graph.toAccessPath(particle)))
      is DependencyNode.DerivedFrom -> graph.toAccessPaths(particle)
        .map { rhs -> Claim.DerivesFrom(lhs, rhs) }
      is DependencyNode.AssociationNode -> throw UnsupportedOperationException(
        "AssociationNode is not a terminal DependencyNode."
      )
    }
  }
}

/** Look up a [HandleConnectionSpec] from a [Recipe.Particle], given a [Path]. */
private fun Recipe.Particle.connectionFrom(path: List<String>): HandleConnectionSpec {
  val connectionName = requireNotNull(path.firstOrNull()) {
    "Cannot access a handle connection from an empty field path."
  }
  return requireNotNull(spec.connections[connectionName]) {
    "Particle '${spec.name}' does not have a handle connection called '$connectionName'."
  }
}

/** Converts a [Path] into a valid [AccessPath] given a [Recipe.Particle].*/
private fun List<String>.asAccessPath(particle: Recipe.Particle): AccessPath =
  AccessPath(particle, particle.connectionFrom(this), this.drop(1).asFields())

/** Converts a [DependencyNode.Input] into an [AccessPath], given Particle context. */
private fun DependencyNode.Input.toAccessPath(particle: Recipe.Particle): AccessPath =
  path.asAccessPath(particle)

/** Converts a [DependencyNode.DerivedFrom] into [AccessPath]s, given Particle context. */
private fun DependencyNode.DerivedFrom.toAccessPaths(particle: Recipe.Particle): List<AccessPath> =
  this.inputs.map { input -> input.path.asAccessPath(particle) }
