package arcs.tools

import arcs.core.data.Plan
import arcs.core.data.Recipe
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyParser
import com.squareup.kotlinpoet.CodeBlock
import com.squareup.kotlinpoet.FileSpec
import com.squareup.kotlinpoet.PropertySpec
import com.squareup.kotlinpoet.buildCodeBlock

fun listFromProperties(properties: List<PropertySpec>) = buildCodeBlock {
    if (properties.isEmpty()) {
        add("emptyList()")
        return build()
    }
    add("listOf(")
    properties.forEach { add("%N", it) }
    add(")")
}

fun Recipe.toGeneration(builder: FileSpec.Builder) {
    val handles = this.handles.values.map { it.toGeneration() }
    val plan = PropertySpec.builder("${name}Plan", Plan::class)
        .initializer(buildCodeBlock {
            add("%T(", Plan::class)
            indent()
            add("particles = emptyList(), ")
            add("handles = ")
            add(listFromProperties(handles))
            add(", ")
            add("annotations = emptyList()")
            unindent()
            add(")")
        })
        .build()

    handles.forEach { builder.addProperty(it) }

    builder.addProperty(plan)
}

fun Recipe.Particle.toGeneration() {}

fun Recipe.Handle.toGeneration() = PropertySpec.builder(name, Plan.Handle::class)
    .initializer(buildCodeBlock {
        add("%T(", Plan.Handle::class)
        add("storageKey = ")
        add("""%T.parse("%L")""", StorageKeyParser::class, storageKey)
        add(")")
    })
    .build()

fun Annotation.toGeneration() {}
