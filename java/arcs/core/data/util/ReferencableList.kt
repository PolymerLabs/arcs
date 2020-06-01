/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.data.util

import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import kotlin.reflect.KClass

/**
 * Represents a list of primitives which can be referenced - and thus used
 * as field values by CRDT Collections & Singletons.
 */
data class ReferencableList<T>(
    /** Type of primitive inside the list being converted into a referencable */
    private val klass: KClass<*>,
    /** The value */
    val value: List<T>
) : Referencable {
    private val klassRepr =
        "List<${ReferencablePrimitive.primitiveKClassMap.getOrElse(klass, klass::toString)}>"
    override val id: ReferenceId
        get() = "$klassRepr(${value.hashCode()})"

    override fun toString(): String = "List($value)"

    override fun hashCode(): Int = value.hashCode()

    override fun equals(other: Any?): Boolean {
        val otherRef = other as? Referencable ?: return false
        return otherRef.id == id
    }
}

inline fun <reified T> List<T>.toReferencable(): ReferencableList<T> =
    ReferencableList(T::class, this)
