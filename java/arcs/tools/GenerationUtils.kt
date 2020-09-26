package arcs.tools

import com.squareup.kotlinpoet.CodeBlock
import com.squareup.kotlinpoet.buildCodeBlock
import java.lang.IllegalArgumentException

/**
 * Utility to translate [Collection]s into generated code.
 *
 * Only [List] and [Set] are supported. Will generate an empty collection when appropriate.
 *
 * @param template callback that combines a [CodeBlock.Builder] with an item in the collection.
 * @return generated [CodeBlock] of a [Collection].
 */
fun <C : Collection<T>, T> CodeBlock.Builder.addCollection(
  collection: C,
  template: (builder: CodeBlock.Builder, item: T) -> Unit
): CodeBlock.Builder {
  val simpleName = collection::class.simpleName.orEmpty()
  val lowered = simpleName.toLowerCase()
  val type = when {
    lowered.toLowerCase().contains("list") -> "List"
    lowered.contains("set") -> "Set"
    else -> throw IllegalArgumentException("Collection type [$simpleName] not supported.")
  }
  if (collection.isEmpty()) {
    add("empty$type()")
    return this
  }

  add("${type.toLowerCase()}Of(")
  collection.forEachIndexed { idx, it ->
    template(this, it)
    if (idx != collection.size - 1) {
      add(", ")
    }
  }
  add(")")
  return this
}

/** Shorthand for building a [CodeBlock] with a code-generated [Collection]. */
fun <C : Collection<T>, T> buildCollectionBlock(
  collection: C,
  template: (builder: CodeBlock.Builder, item: T) -> Unit
): CodeBlock = buildCodeBlock { addCollection(collection, template) }

/** Shorthand for building a [CodeBlock] with a code-generated [Collection]. */
fun <C : Collection<T>, T> buildCollectionBlock(collection: C, template: String = "%L") =
  buildCodeBlock { addCollection(collection, template) }

/**
 * Utility to translate [Collection]s into generated code.
 *
 * Only [List] and [Set] are supported. Will generate an empty collection when appropriate.
 *
 * @param template callback that combines a [CodeBlock.Builder] with an item in the collection.
 * @return generated [CodeBlock] of a [Collection].
 */
fun <C : Collection<T>, T> CodeBlock.Builder.addCollection(collection: C, template: String = "%L") =
  addCollection(collection) { builder, item -> builder.add(template, item) }

/**
 * Utility to translate [Map]s into a code-generated [Map] collection.
 *
 * Will generate an empty collection when appropriate.
 *
 * @param template callback that combines a [CodeBlock.Builder] with pairs in the collection.
 * @return generated [CodeBlock] of a [Map].
 */
fun <K, V> CodeBlock.Builder.addCollection(
  collection: Map<K, V>,
  template: (builder: CodeBlock.Builder, item: Map.Entry<K, V>) -> Unit
): CodeBlock.Builder {
  if (collection.isEmpty()) {
    add("emptyMap()")
    return this
  }

  add("mapOf(")
  collection.entries.forEachIndexed { idx, it ->
    template(this, it)
    if (idx != collection.size - 1) {
      add(", ")
    }
  }
  add(")")
  return this
}

/**
 * Utility to translate [Map]s into a code-generated [Map] collection.
 *
 * Will generate an empty collection when appropriate.
 *
 * @param template KotlinPoet template string to apply to each pair in the collection.
 * @return generated [CodeBlock] of a [Map].
 */
fun <K, V> CodeBlock.Builder.addCollection(collection: Map<K, V>, template: String = "%S to %L") =
  addCollection(collection) { builder, entry -> builder.add(template, entry.key, entry.value) }

/** Shorthand for building a [CodeBlock] with a code-generated [Map]. */
fun <K, V> buildCollectionBlock(
  collection: Map<K, V>,
  template: (builder: CodeBlock.Builder, item: Map.Entry<K, V>) -> Unit
): CodeBlock = buildCodeBlock { addCollection(collection, template) }

/** Shorthand for building a [CodeBlock] with a code-generated [Map]. */
fun <K, V> buildCollectionBlock(collection: Map<K, V>, template: String = "%S to %L") =
  buildCodeBlock { addCollection(collection, template) }
