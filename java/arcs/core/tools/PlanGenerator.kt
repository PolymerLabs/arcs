package arcs.core.tools

import arcs.core.data.ParticleProto
import arcs.core.data.Plan
import arcs.core.data.RecipeEnvelopeProto
import arcs.core.data.RecipeProto
import com.squareup.kotlinpoet.*
import com.squareup.kotlinpoet.ParameterizedTypeName.Companion.parameterizedBy

class PlanGenerator(private val fileBuilder: FileSpec.Builder) {

    /** Generate code from a Recipe proto. */
    fun generate(recipeEnvelopeProto: RecipeEnvelopeProto) {
        fileBuilder.addType(
            generatePlan(recipeEnvelopeProto.recipe)
                .build()
        )
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
