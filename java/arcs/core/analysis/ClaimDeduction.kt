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
 * See [DependencyGraph] for more information.
 */
fun RecipeGraph.Node.Particle.deduceClaims(): List<Claim> {
  return particle.spec.connections.values
    .filter { connection -> connection.expression != null }
    .flatMap { connection ->
      val root = connection.expression?.analyze()
      require(root is DependencyGraph.Associate) {
        "Expression on '${particle.spec.name}.${connection.name}' is invalid."
      }
      root.toClaims(particle, connection)
    }
}

/** Converts a [Path] into an [AccessPath]. */
private fun List<String>.asFields() = map { AccessPath.Selector.Field(it) }

/**
 * This flattens nested [DependencyGraph]s into a map of [Path]s and terminal [DependencyGraph]s.
 *
 * Example:
 *   ```
 *   DependencyGraph.Associate(
 *     "a" to DependencyGraph.Associate(
 *        "x" to DependencyGraph.Associate(
 *          "q": DependencyGraph.Input("input", "foo")
 *        ),
 *        "y" to DependencyGraph.Input("input", "bar")
 *     ),
 *     "b" to DependencyGraph.Derive(listOf("input", "foo"), listOf("input", "bar"))
 *   )
 *   ```
 * This would be flattened to:
 *
 *   ```
 *   mapOf(
 *     listOf("a", "x", "q") to DependencyGraph.Input("input", "foo"),
 *     listOf("a", "y") to DependencyGraph.Input("input", "bar"),
 *     listOf("b") to DependencyGraph.Derive(listOf("input", "foo"), listOf("input", "bar"))
 *   )
 *   ```
 */
private fun DependencyGraph.Associate.flatten(
  prefix: List<String> = emptyList()
): Map<List<String>, DependencyGraph> {
  val output = mutableMapOf<List<String>, DependencyGraph>()
  for ((key, value) in this.associations) {
    val path = prefix + listOf(key)
    when (value) {
      is DependencyGraph.Associate -> output += value.flatten(path)
      else -> output += path to value
    }
  }
  return output
}

/**
 * Converts a [DependencyGraph.Associate] into a list of [Claim]s, given contextual information
 * about the particle.
 *
 * [DependencyGraph.Associate]s is a DAG-like structure that can represent data flow relationships
 * from the target `connection`s to other [HandleConnectionSpec]s in the [ParticleSpec].
 *
 * This [flatten]s the nested [DependencyGraph.Associate] and then transforms its data into
 * [Claim.DerivesFrom] statements.
 */
private fun DependencyGraph.Associate.toClaims(
  particle: Recipe.Particle,
  connection: HandleConnectionSpec
): List<Claim> {
  return this.flatten().flatMap { (lhsPath, graph) ->
    val lhs = AccessPath(particle, connection, lhsPath.asFields())
    when (graph) {
      is DependencyGraph.Input -> listOf(Claim.DerivesFrom(lhs, graph.toAccessPath(particle)))
      is DependencyGraph.Derive -> graph.toAccessPaths(particle)
        .map { rhs -> Claim.DerivesFrom(lhs, rhs) }
      is DependencyGraph.Associate -> throw UnsupportedOperationException(
        "Associate is not a terminal DependencyGraph."
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

/** Converts a [DependencyGraph.Input] into an [AccessPath], given Particle context. */
private fun DependencyGraph.Input.toAccessPath(particle: Recipe.Particle) =
  path.asAccessPath(particle)

/** Converts a [DependencyGraph.Derive] into [AccessPath]s, given Particle context. */
private fun DependencyGraph.Derive.toAccessPaths(particle: Recipe.Particle): List<AccessPath> =
  this.paths.map { path -> path.asAccessPath(particle) }
