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

import arcs.common.ReferenceId
import kotlin.reflect.KClass

/**
 * Defines an interpreter capable of serializing, deserializing, and identifying the value for an
 * entity's field.
 */
interface FieldValueInterpreter<T> {
  /** Identifies the [value]. */
  fun getReferenceId(value: T): ReferenceId

  /** Serializes the [value] to a [String]. */
  fun serialize(value: T): String

  /** Deserializes the [rawValue] to an instance of [T]. */
  fun deserialize(rawValue: String): T

  companion object {
    private val registeredInterpreters = mutableMapOf<KClass<*>, FieldValueInterpreter<*>>()

    /** Registers one or more [FieldValueInterpreter]s for later use. */
    fun register(vararg interpreters: Pair<KClass<*>, FieldValueInterpreter<*>>) {
      interpreters.forEach { (kClass, interpreter) ->
        registeredInterpreters[kClass] = interpreter
      }
    }

    /**
     * Returns whether or not a [FieldValueInterpreter] has been registered for the given [KClass].
     */
    fun containsInterpreterFor(kClass: KClass<*>): Boolean = kClass in registeredInterpreters

    /**
     * Gets the [FieldValueInterpreter] associated with the given [KClass].
     *
     * @throws IllegalArgumentException if no [FieldValueInterpreter] has been registered for
     *   [kClass].
     */
    @Suppress("UNCHECKED_CAST")
    fun <T> requireInterpreter(kClass: KClass<*>): FieldValueInterpreter<T> =
      requireNotNull(registeredInterpreters[kClass] as? FieldValueInterpreter<T>) {
        "No FieldValueInterpreter registered for $kClass"
      }

    /**
     * Gets a [ReferenceId] for the given value.
     *
     * @throws IllegalArgumentException if no [FieldValueInterpreter] has been registered for [T].
     */
    inline fun <reified T> getReferenceId(value: T): ReferenceId =
      requireInterpreter<T>(T::class).getReferenceId(value)

    /**
     * Serializes the given [value] to a [String].
     *
     * @throws IllegalArgumentException if no [FieldValueInterpreter] has been registered for [T].
     */
    inline fun <reified T> serialize(value: T): String =
      requireInterpreter<T>(T::class).serialize(value)

    /**
     * Deserializes a [T] instance from the given [rawValue].
     *
     * @throws IllegalArgumentException if no [FieldValueInterpreter] has been registered for [T].
     */
    inline fun <reified T> deserialize(rawValue: String): T =
      requireInterpreter<T>(T::class).deserialize(rawValue)
  }
}
