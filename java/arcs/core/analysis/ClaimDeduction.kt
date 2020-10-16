package arcs.core.analysis

import arcs.core.data.AccessPath
import arcs.core.data.Claim
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.Recipe

/** Converts a [Path] into an [AccessPath]. */
private fun List<String>.asFields() = map { AccessPath.Selector.Field(it) }

/**
 * Deduce [Claim]s on Paxel Expressions from all connections on a [Recipe.Particle].
 *
 * See [Deduction] for more information.
 */
fun RecipeGraph.Node.Particle.deduceClaims(): List<Claim> {
  return particle.spec.connections.values
    .filter { connection -> connection.expression != null }
    .flatMap { connection ->
      val deduction = connection.expression?.analyzeExpression()
      require(deduction is Deduction.Scope) {
        "Expression on '${particle.spec.name}.${connection.name} is invalid."
      }
      deduction.toClaims(particle, connection)
    }
}

/**
 * This flattens nested [Deduction]s into a map of [Path]s and terminal [Deduction]s
 *
 * Example:
 *   ```
 *   Deduction.Scope(
 *     "a" to Deduction.Scope(
 *        "x" to Deduction.Scope(
 *          "q": Deduction.Equal("input", "foo")
 *        ),
 *        "y" to Deduction.Equal("input", "bar")
 *     ),
 *     "b" to Deduction.Derive(listOf("input", "foo"), listOf("input", "bar"))
 *   )
 *   ```
 * This would be flattened to:
 *
 *   ```
 *   mapOf(
 *     listOf("a", "x", "a") to Deduction.Equal("input", "foo"),
 *     listOf("a, "y") to Deduction.Equal("input", "bar"),
 *     listOf("b") to Deduction.Derive(listOf("input", "foo"), listOf("input", "bar"))
 *   )
 *   ```
 */
private fun flattenAnalysis(
  scope: Deduction.Scope,
  prefix: List<String> = emptyList()
): Map<List<String>, Deduction> {
  val output = mutableMapOf<List<String>, Deduction>()
  for ((key, value) in scope.associations) {
    val path = prefix + listOf(key)
    when (value) {
      is Deduction.Scope -> output += flattenAnalysis(value, path)
      else -> output += path to value
    }
  }
  return output
}

/**
 * Converts a [Deduction.Scope] into a list of [Claim]s, given contextual information about the
 * particle.
 *
 * [Deduction.Scope]s is a DAG-like structure that can represent data flow relationships from the
 * target `connection to other [HandleConnectionSpec]s in the [Recipe.Particle].
 *
 * This function flattens the nested [Deduction.Scope], and then transforms its data into
 * [Claim.DerivesFrom] statements.
 */
fun Deduction.Scope.toClaims(
  particle: Recipe.Particle,
  connection: HandleConnectionSpec
): List<Claim> {
  val lhsBasePath = AccessPath(particle, connection)

  return flattenAnalysis(this).flatMap { (lhsPath, analysis) ->
    when (analysis) {
      is Deduction.Equal -> listOf(
        Claim.DerivesFrom(
          AccessPath(lhsBasePath, lhsPath.asFields()),
          analysis.toAccessPath(particle)
        )
      )
      is Deduction.Derive -> analysis.toAccessPaths(particle).map { rhsPath ->
        Claim.DerivesFrom(
          AccessPath(lhsBasePath, lhsPath.asFields()),
          rhsPath
        )
      }
      is Deduction.Scope -> throw UnsupportedOperationException(
        "Scope is not a terminal Deduction."
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

/** Converts a [Path] into a valid [AccessPath] in a [Recipe.Particle].*/
private fun List<String>.asAccessPath(particle: Recipe.Particle): AccessPath =
  AccessPath(particle, particle.connectionFrom(this), this.drop(1).asFields())

/** Converts a [Deduction.Equal] into an [AccessPath], given contextual Particle information. */
fun Deduction.Equal.toAccessPath(particle: Recipe.Particle) = path.asAccessPath(particle)

/** Converts a [Deduction.Derive] into [AccessPath]s, given contextual Particle information. */
fun Deduction.Derive.toAccessPaths(particle: Recipe.Particle): List<AccessPath> =
  this.paths.map { path -> path.asAccessPath(particle) }
