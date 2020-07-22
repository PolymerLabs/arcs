package arcs.tools

import com.squareup.kotlinpoet.CodeBlock
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

// TODO(alxr) Dedupe repeated logic via HOF
fun <T> Set<T>.toGeneration(template: String = "%N") =
    toGeneration { builder, item -> builder.add(template, item) }

fun <T> Set<T>.toGeneration(template: (builder: CodeBlock.Builder, item: T) -> Unit) = buildCodeBlock {
    if (this@toGeneration.isEmpty()) {
        add("emptySet()")
        return build()
    }

    add("setOf(")
    this@toGeneration.forEachIndexed { idx, it ->
        template(this, it)
        if (idx != size - 1) { add(", ") }
    }
    add(")")
}
