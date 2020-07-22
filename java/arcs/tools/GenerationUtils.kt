package arcs.tools

import com.squareup.kotlinpoet.CodeBlock
import com.squareup.kotlinpoet.buildCodeBlock

fun List<*>.toGeneration(template: String = "%L") =
    toGeneration { builder, item -> builder.add(template, item) }

fun <T> List<T>.toGeneration(
    template: (builder: CodeBlock.Builder, item: T) -> Unit
) = buildCodeBlock {
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

fun Set<*>.toGeneration(template: String = "%L") =
    toGeneration { builder, item -> builder.add(template, item) }

fun <T> Set<T>.toGeneration(
    template: (builder: CodeBlock.Builder, item: T) -> Unit
) = buildCodeBlock {
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

fun Map<*, *>.toGeneration(template: String = "%S to %L") =
    toGeneration { builder, entry -> builder.add(template, entry.key, entry.value) }

fun <K, V> Map<K, V>.toGeneration(
    template: (builder: CodeBlock.Builder, entry: Map.Entry<K, V>) -> Unit
) = buildCodeBlock {
    if (this@toGeneration.isEmpty()) {
        add("emptyMap()")
        return build()
    }

    add("mapOf(")
    this@toGeneration.entries.forEachIndexed { idx, entry ->
        template(this, entry)
        if (idx != size - 1) { add(", ") }
    }
    add(")")
}
