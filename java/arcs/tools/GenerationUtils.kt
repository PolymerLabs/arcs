package arcs.tools

import com.squareup.kotlinpoet.CodeBlock
import com.squareup.kotlinpoet.buildCodeBlock

/**
 * Utility to translate [List]s into a code-generated [List] collection.
 *
 * Will generate an empty collection when appropriate.
 *
 * @param template KotlinPoet template string to apply to each item in the collection.
 * @return generated [CodeBlock] of a [List].
 */
fun List<*>.toGeneration(template: String = "%L") =
    toGeneration { builder, item -> builder.add(template, item) }

/**
 * Utility to translate [List]s into a code-generated [List] collection.
 *
 * Will generate an empty collection when appropriate.
 *
 * @param template callback that combines a [CodeBlock.Builder] with an item in the collection.
 * @return generated [CodeBlock] of a [List].
 */
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

/**
 * Utility to translate [Set]s into a code-generated [Set] collection.
 *
 * Will generate an empty collection when appropriate.
 *
 * @param template KotlinPoet template string to apply to each item in the collection.
 * @return generated [CodeBlock] of a [Set].
 */
fun Set<*>.toGeneration(template: String = "%L") =
    toGeneration { builder, item -> builder.add(template, item) }

/**
 * Utility to translate [Set]s into a code-generated [Set] collection.
 *
 * Will generate an empty collection when appropriate.
 *
 * @param template callback that combines a [CodeBlock.Builder] with an item in the collection.
 * @return generated [CodeBlock] of a [List].
 */
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

/**
 * Utility to translate [Map]s into a code-generated [Map] collection.
 *
 * Will generate an empty collection when appropriate.
 *
 * @param template KotlinPoet template string to apply to each pair in the collection.
 * @return generated [CodeBlock] of a [Map].
 */
fun Map<*, *>.toGeneration(template: String = "%S to %L") =
    toGeneration { builder, entry -> builder.add(template, entry.key, entry.value) }

/**
 * Utility to translate [Map]s into a code-generated [Map] collection.
 *
 * Will generate an empty collection when appropriate.
 *
 * @param template callback that combines a [CodeBlock.Builder] with pairs in the collection.
 * @return generated [CodeBlock] of a [Map].
 */
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
