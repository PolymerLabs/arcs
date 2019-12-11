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

package arcs.core.type

import arcs.core.common.Literal

/**
 * Registry for functions to turn a [TypeLiteral] into a [Type].
 *
 * When implementing a new [Type], it is suggested to register your type with the [TypeFactory]
 * within an `init` block inside of a `companion object`. For example:
 *
 * ```kotlin
 * class MyType : Type {
 *   override val tag: Tag = Tag.Something
 *
 *   override fun toLiteral() = Literal(tag)
 *
 *   data class Literal(override val tag: Tag) : TypeLiteral
 *
 *   companion object {
 *     init {
 *       TypeFactory.registerBuilder(Tag.Something) { MyType() }
 *     }
 *   }
 * }
 * ```
 */
object TypeFactory {
    private val lock = Any()
    private val builders = mutableMapOf<Tag, (TypeLiteral) -> Type>()

    /**
     * Registers a function capable of building a [Type] given a [TypeLiteral] for the specified
     * [Tag].
     */
    fun registerBuilder(tag: Tag, builder: (TypeLiteral) -> Type) = synchronized(lock) {
        builders[tag] = builder
    }

    /** Returns a [Type] instance based on the provided [Literal]. */
    fun getType(literal: Literal): Type = synchronized(lock) {
        val typeLiteral = requireNotNull(literal as? TypeLiteral) { "TypeLiteral required" }
        val builder = requireNotNull(builders[typeLiteral.tag]) {
            "Type with tag ${typeLiteral.tag} has no registered builder"
        }

        return builder(typeLiteral)
    }

    /** For use in `teardown()` methods in test cases. Clears any registered type builders. */
    /* internal */ fun clearRegistrationsForTesting() = synchronized(lock) { builders.clear() }
}
