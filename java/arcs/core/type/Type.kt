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

/**
 * Representation of a type within Arcs.
 *
 * TODO: variableMap is implemented as a `MutableMap<Any, Any>`, but this has awful code-smell.
 *   Febreeze, please.
 */
interface Type {
    val tag: Tag
    val isResolved: Boolean
        get() = resolvedType != null
    val canEnsureResolved: Boolean
        get() = isResolved
    val resolvedType: Type?
        get() = this

    /** Gets a serialization-friendly description of the [Type]. */
    fun toLiteral(): TypeLiteral

    /**
     * If possible, ensure resolution.
     *
     * TODO: not sure why `maybe` and `ensure` are used together in the name?
     */
    fun maybeEnsureResolved(): Boolean = true

    /** Checks whether or not this [Type] is at least as specific as the given [other] [Type]. */
    fun isAtLeastAsSpecificAs(other: Type): Boolean {
        if (tag != other.tag) return false

        // Throw if they are the same tag but the implementation class hasn't overridden this
        // method.
        throw UnsupportedOperationException("$this does not support same-type specificity checking")
    }

    /**
     * Makes a copy of this [Type].
     *
     * When copying multiple types, variables that were associated with the same name before copying
     * should still be associated after copying. To maintain this property, create a `MutableMap()`
     * and pass it into all [copy] calls in the group.
     */
    fun copy(variableMap: MutableMap<Any, Any>): Type =
        TypeFactory.getType(
            requireNotNull(resolvedType) { "Cannot copy unresolved type." }
                .copy(variableMap)
                .toLiteral()
        )

    /**
     * Clone a [Type], maintaining resolution information.
     *
     * **Note:** This function _**SHOULD NOT BE USED**_ at the type level. In order for type
     * variable information to be maintained correctly, an entire context root needs to be cloned.
     */
    fun copyWithResolutions(variableMap: MutableMap<Any, Any>): Type =
        TypeFactory.getType(toLiteral())

    /** Produces a string-representation of this [Type], configurable with [options]. */
    fun toString(options: ToStringOptions): String = "${this.tag}"

    /** Options used with [Type.toString]. */
    data class ToStringOptions(
        val hideFields: Boolean = false,
        val pretty: Boolean = false
    )

    /** Defines a [Type] for data capable of being a container for data of another [Type]. */
    interface TypeContainer<T : Type> : Type {
        /** The [Type] of data contained by this [Type]. Think: kotlin's `typeParameter`. */
        val containedType: T
    }

    companion object {
        /**
         * Returns the deepest unique types contained by the given pair.
         *
         * Recursively traverses [type1] and [type2]'s [containedType]s until their [tag]s are equal
         * and neither has a [containedType].
         */
        tailrec fun unwrapPair(pair: Pair<Type, Type>): Pair<Type, Type> {
            val (type1, type2) = pair

            // Base case: tags are not equal.
            if (type1.tag != type2.tag) return pair
            // Base case: If they're not both containers of other types, we're done.
            if (type1 !is TypeContainer<*> || type2 !is TypeContainer<*>) return pair

            val contained1 = type1.containedType
            val contained2 = type2.containedType

            // "We need to go deeper." - Dom Cobb
            return unwrapPair(contained1 to contained2)
        }
    }
}
