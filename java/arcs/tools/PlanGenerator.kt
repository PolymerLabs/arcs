package arcs.tools

import arcs.core.data.Plan
import arcs.core.data.proto.ManifestProto
import arcs.core.data.proto.ParticleProto
import arcs.core.data.proto.RecipeProto
import com.squareup.kotlinpoet.ClassName
import com.squareup.kotlinpoet.CodeBlock
import com.squareup.kotlinpoet.FileSpec
import com.squareup.kotlinpoet.ParameterizedTypeName.Companion.parameterizedBy
import com.squareup.kotlinpoet.PropertySpec
import com.squareup.kotlinpoet.TypeSpec

class PlanGenerator(private val fileBuilder: FileSpec.Builder) {

    /** Generate code from a Recipe proto. */
    fun generate(manifestProto: ManifestProto) {
        manifestProto.recipesList.forEach {
            fileBuilder.addType(
                generatePlan(it)
                    .build())
        }
    }

    /** Generate a Plan class from a recipe. */
    private fun generatePlan(recipe: RecipeProto): TypeSpec.Builder {
        val particleSpecClass = ClassName("arcs.core.data.Plan", "Particle")
        val list = ClassName("kotlin.collections", "List")
        val listOfParticleSpecs = list.parameterizedBy(particleSpecClass)

        val particleSpecProperty = PropertySpec.builder("particles", listOfParticleSpecs)
            .initializer(generateParticles(recipe.particlesList).build())
            .build()

        val planBuilder = TypeSpec.objectBuilder("${recipe.name}Plan")
            .addProperty(particleSpecProperty)
            .superclass(Plan::class)
            .addSuperclassConstructorParameter("%N", particleSpecProperty)

        return planBuilder
    }

    /** Generate a List of Particle Literals. */
    private fun generateParticles(particles: List<ParticleProto>): CodeBlock.Builder {
        return CodeBlock.builder().add("listOf()")
    }
}
