package arcs.core.tools

import arcs.core.data.Plan
import arcs.core.data.RecipeEnvelopeProto
import arcs.core.data.RecipeProto
import com.squareup.kotlinpoet.ClassName
import com.squareup.kotlinpoet.FileSpec
import com.squareup.kotlinpoet.ParameterizedTypeName.Companion.parameterizedBy
import com.squareup.kotlinpoet.PropertySpec
import com.squareup.kotlinpoet.TypeSpec

class PlanGenerator(private val fileBuilder: FileSpec.Builder) {
    fun generate(recipeEnvelopeProto: RecipeEnvelopeProto) {
        fileBuilder.addType(
            generatePlan(recipeEnvelopeProto.recipe)
                .build()
        )
    }

    private fun generatePlan(recipe: RecipeProto): TypeSpec.Builder {
        val particleSpecClass = ClassName("arcs.core.data.Plan", "Particle")
        val list = ClassName("kotlin.collections", "List")
        val listOfParticleSpecs = list.parameterizedBy(particleSpecClass)

        val particleSpecProperty = PropertySpec.builder("particles", listOfParticleSpecs)
            .initializer("listOf()") // TODO(alxr): initialize with codeblock later
            .build()

        val planCompanionBuilder = TypeSpec.companionObjectBuilder()
            .addProperty(particleSpecProperty)

        val planBuilder = TypeSpec.classBuilder("${recipe.name}Plan")
            .addType(planCompanionBuilder.build())
            .superclass(Plan::class)
            .addSuperclassConstructorParameter("%N", particleSpecProperty)

        return planBuilder
    }
}
