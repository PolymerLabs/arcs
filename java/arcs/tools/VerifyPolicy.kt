package arcs.tools

import arcs.core.analysis.PolicyVerifier
import arcs.core.data.proto.ManifestProto
import arcs.core.data.proto.PolicyOptionsProto
import arcs.core.data.proto.decodeRecipes
import arcs.core.policy.PolicyOptions
import arcs.core.policy.proto.decode
import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.core.CliktError
import com.github.ajalt.clikt.parameters.options.option
import com.github.ajalt.clikt.parameters.options.required
import com.github.ajalt.clikt.parameters.types.file
import com.google.protobuf.TextFormat

class VerifyPolicy : CliktCommand(
    name = "verify_policy",
    help = "Verifies that all recipes in an Arcs manifest file comply with their policies."
) {
    val manifest by option(
        help = "Arcs manifest to check, encoded as a binary proto file (.binarypb)"
    ).file().required()

    val options by option(
        help = "Policy options, encoded as a text proto (.textproto) or binary proto (.binarypb)"
    ).file().required()

    override fun run() {
        val policyOptions: PolicyOptions = if (options.extension == "textproto") {
            // Parse text proto.
            val optionsBuilder = PolicyOptionsProto.newBuilder()
            TextFormat.getParser().merge(options.readText(), optionsBuilder)
            optionsBuilder.build().decode()
        } else {
            // Parse binary proto.
            PolicyOptionsProto.parseFrom(options.readBytes()).decode()
        }
        val manifestProto = ManifestProto.parseFrom(manifest.readBytes())

        val recipes = manifestProto.decodeRecipes()
        val policies = manifestProto.policiesList.map { it.decode() }.associateBy { it.name }
        val policyVerifier = PolicyVerifier(policyOptions)

        recipes.forEach { recipe ->
            val policyName = recipe.policyName ?: throw CliktError(
                "Recipe '${recipe.name}' does not have a @policy annotation."
            )
            val policy = policies[policyName] ?: throw CliktError(
                "Recipe '${recipe.name}' refers to policy '$policyName', which does not exist in " +
                    "the manifest."
            )
            policyVerifier.verifyPolicy(recipe, policy)
        }
    }
}

fun main(args: Array<String>) = VerifyPolicy().main(args)
