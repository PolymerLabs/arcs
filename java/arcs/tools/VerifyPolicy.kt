package arcs.tools

import arcs.core.analysis.PolicyVerifier
import arcs.core.data.proto.ManifestProto
import arcs.core.data.proto.decodeRecipes
import arcs.core.policy.proto.decode
import arcs.core.util.Log
import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.core.CliktError
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.options.flag
import com.github.ajalt.clikt.parameters.options.option
import com.github.ajalt.clikt.parameters.types.file

class VerifyPolicy : CliktCommand(
  name = "verify_policy",
  help = "Verifies that all recipes in an Arcs manifest file comply with their policies.",
  printHelpOnEmptyArgs = true
) {
  val manifest by argument(
    help = "Arcs manifest to check, encoded as a binary proto file (.binarypb)"
  ).file()

  val debug by option("-d", "--debug", help = "Turn on debug tracing")
    .flag(default = false)

  override fun run() {
    if (debug) {
      Log.level = Log.Level.Debug
    }
    val manifestProto = ManifestProto.parseFrom(manifest.readBytes())

    val recipes = manifestProto.decodeRecipes()
    val policies = manifestProto.policiesList.map { it.decode() }.associateBy { it.name }
    val policyVerifier = PolicyVerifier()

    recipes.forEach { recipe ->
      val policyName = recipe.policyName
      if (policyName == null) {
        val message = "Recipe '${recipe.name}' does not have a @policy annotation."
        if (recipe.particles.any { it.spec.dataflowType.egress }) {
          throw CliktError(message)
        } else {
          print("[WARNING] $message [No egress in recipe]\n")
        }
      } else {
        val policy = policies[policyName] ?: throw CliktError(
          "Recipe '${recipe.name}' refers to policy '$policyName', which does not " +
            "exist in the manifest."
        )
        policyVerifier.verifyPolicy(recipe, policy)
      }
    }
  }
}

fun main(args: Array<String>) = VerifyPolicy().main(args)
