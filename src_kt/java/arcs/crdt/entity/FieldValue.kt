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

import arcs.common.Referencable
import arcs.common.ReferenceId

/**
 * Referencable wrapper of an actual value for an entity's field.
 *
 * **Note:** A [FieldValueInterpreter] must have been registered for [T] before instantiation.
 */
data class FieldValue<T : Any>(
  /** [ReferenceId] for the value. */
  override val id: ReferenceId,
  /** Raw string-representation of the value. */
  val serializedValue: String,
  /** @deprecated */
  @Deprecated(
    "Use getValue() instead.",
    ReplaceWith("getValue()"),
    DeprecationLevel.WARNING
  )
  var actualValue: T? = null
) : Referencable {
  /** Parsed value for the field. */
  @Suppress("DEPRECATION")
  inline fun <reified Out : T> getValue(): T =
    actualValue ?: FieldValueInterpreter.deserialize<Out>(serializedValue).also { actualValue = it }
}

/**
 * Pseudo-constructor for building a [FieldValue] from a given value of type [T].
 *
 * **Note:** A [FieldValueInterpreter] must have been registered for [T] before instantiation.
 */
inline fun <reified T : Any> FieldValue(value: T): FieldValue<T> =
  FieldValue(
    FieldValueInterpreter.getReferenceId(value),
    FieldValueInterpreter.serialize(value),
    value
  )

/**
 * Convert a [T] to a [FieldValue] (referencable).
 *
 * **Note:** A [FieldValueInterpreter] must have been registered for [T].
 */
inline fun <reified T : Any> T.toFieldValue(): FieldValue<T> = FieldValue(this)

/**
 * Convert a serialized [T] to a [FieldValue] with the given [ReferenceId].
 *
 * **Note:** A [FieldValueInterpreter] must have been registered for [T].
 */
inline fun <reified T : Any> String.toFieldValue(id: ReferenceId): FieldValue<T> =
  FieldValue(id, this)
