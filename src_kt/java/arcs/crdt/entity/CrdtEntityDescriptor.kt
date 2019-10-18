/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.crdt.entity

import kotlin.reflect.KClass

/**
 * Defines the fields capable of being managed by a Crdt-based Entity.
 *
 * TODO: determine how to support `Set<T : [Primitive | Referencable]>` field types as well.
 */
data class CrdtEntityDescriptor(
  /** Mapping from [EntityFieldName] to the expected type of the field. */
  private val descriptions: Map<EntityFieldName, KClass<*>>
) : Map<EntityFieldName, KClass<*>> by descriptions {
  /**
   * Constructor allowing for creation of a [CrdtEntityDescriptor] using [Pair] notation.
   *
   * For example:
   *
   * ```kotlin
   * val descriptor = CrdtEntityDescriptor(
   *   "name" to Text::class,
   *   "age" to Number::class
   * )
   * ```
   */
  constructor(vararg descriptions: Pair<EntityFieldName, KClass<*>>) :  this(mapOf(*descriptions))

  init {
    val unsupportedTypes = entries.filter { !it.value.isArcsSupportedFieldType }

    if (unsupportedTypes.isNotEmpty()) {
      throw IllegalArgumentException(
        "The following fields are of types which have no registered FieldValueInterpreters: " +
          unsupportedTypes.joinToString { "${it.key}(${it.value})" }
      )
    }
  }
}

private val KClass<*>.isArcsSupportedFieldType: Boolean
  get() = FieldValueInterpreter.containsInterpreterFor(this)


