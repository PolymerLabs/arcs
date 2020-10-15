package arcs.core.analysis

import arcs.core.data.AccessPath
import arcs.core.data.Claim
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.Recipe

internal fun List<String>.asFields() = map { AccessPath.Selector.Field(it) }

fun RecipeGraph.Node.Particle.analyzeExpression(): List<Claim> {
  return particle.spec.connections.values
    .filter { connection -> connection.expression != null }
    .flatMap { connection ->
      val deduction = connection.expression!!.analyzeExpression() as Deduction.Scope
      deduction.toClaims(particle, connection)
    }
}

/** TODO(alxr) Add real KDoc. */
fun Deduction.Scope.toClaims(particle: Recipe.Particle, connection: HandleConnectionSpec): List<Claim> {
  val lhsBasePath = AccessPath(particle, connection)

  fun helper(
    associations: Map<String, Deduction>,
    prefix: List<String> = emptyList()
  ): Map<List<String>, Deduction> {
    val output = mutableMapOf<List<String>, Deduction>()
    for ((key, value) in associations) {
      val path = prefix + listOf(key)
      when (value) {
        is Deduction.Scope -> output += helper(value.associations, path)
        else -> output += path to value
      }
    }
    return output
  }

  val flattenedAssociations = helper(this.associations)

  return flattenedAssociations.flatMap { (path, deduction) ->
    when (deduction) {
      is Deduction.Equal ->
        listOf(
          Claim.DerivesFrom(
            AccessPath(lhsBasePath, path.asFields()),
            deduction.toAccessPath(particle)
          )
        )
      is Deduction.Derive -> deduction.toAccessPaths(particle).map { derivePath ->
        Claim.DerivesFrom(
          AccessPath(lhsBasePath, path.asFields()),
          derivePath
        )
      }
      is Deduction.Scope -> throw UnsupportedOperationException(
        "Scope is not a terminal Deduction."
      )
    }
  }
}

private fun Recipe.Particle.connectionFrom(path: List<String>): HandleConnectionSpec {
  val connectionName = requireNotNull(path.firstOrNull()) {
    "Cannot access a handle connection from an empty field path."
  }
  return requireNotNull(spec.connections[connectionName]) {
    "Particle '${spec.name}' does not have a handle connection called '$connectionName'."
  }
}

private fun List<String>.asAccessPath(particle: Recipe.Particle): AccessPath =
  AccessPath(particle, particle.connectionFrom(this), this.drop(1).asFields())

fun Deduction.Equal.toAccessPath(particle: Recipe.Particle) = path.asAccessPath(particle)

fun Deduction.Derive.toAccessPaths(particle: Recipe.Particle): List<AccessPath> =
  this.paths.map { path -> path.asAccessPath(particle) }

