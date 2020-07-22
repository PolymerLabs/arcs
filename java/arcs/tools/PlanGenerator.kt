package arcs.tools

import arcs.core.data.Plan
import arcs.core.data.Recipe
import arcs.core.storage.StorageKeyParser
import arcs.core.type.Type
import com.squareup.kotlinpoet.CodeBlock
import com.squareup.kotlinpoet.FileSpec
import com.squareup.kotlinpoet.PropertySpec
import com.squareup.kotlinpoet.buildCodeBlock

fun <T> List<T>.toGeneration(template: String = "%N") =
    toGeneration { builder, item -> builder.add(template, item) }

fun <T> List<T>.toGeneration(template: (builder: CodeBlock.Builder, item: T) -> Unit) = buildCodeBlock {
    if (this@toGeneration.isEmpty()) {
        add("emptyList()")
        return build()
    }

    add("listOf(")
    this@toGeneration.forEachIndexed { idx, it ->
        template(this, it)
        if (idx != size - 1) { add(", ") }
    }
    add(")")
}


fun Recipe.toGeneration(builder: FileSpec.Builder) {
    val handles = this.handles.values.map { it.toGeneration(name.orEmpty()) }
    val ctx = mapOf<String, Any>(
        "plan" to Plan::class,
        "particles" to listOf<Recipe.Particle>().toGeneration(),
        "handles" to handles.toGeneration(),
        "annotations" to listOf<Annotation>().toGeneration()
    )
    val plan = PropertySpec.builder("${name}Plan", Plan::class)
        .initializer(buildCodeBlock {
            addNamed("""
            %plan:T(
                particles = %particles:L,
                handles = %handles:L,
                annotations = %annotations:L
            )
            """.trimIndent(), ctx)
        })
        .build()

    handles.forEach { builder.addProperty(it) }
    builder.addProperty(plan)
}

fun Recipe.Particle.toGeneration() {}

fun Recipe.Handle.toGeneration(planName: String) = PropertySpec.builder("${planName}_$name", Plan.Handle::class)
    .initializer(buildCodeBlock {
        val ctx = mapOf<String, Any>(
            "handle" to Plan.Handle::class,
            "storageParser" to StorageKeyParser::class,
            // TODO(alxr) verify join handles work
            "key" to storageKey.orEmpty(),
            "type" to type.toGeneration(),
            "annotations" to "emptyList()"
        )
        addNamed("""
        %handle:T(
            storageKey = %storageParser:T.parse(%key:S),
            type = %type:L,    
            annotations = %annotations:L
        )
        """.trimIndent(), ctx)
    })
    .build()

fun Type.toGeneration() = buildCodeBlock {
    add("%T()", Type::class)
}

fun Annotation.toGeneration() {}
