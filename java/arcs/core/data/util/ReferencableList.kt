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
import arcs.core.data.FieldType

/**
 * Represents a list of primitives which can be referenced - and thus used
 * as field values by CRDT Collections & Singletons.
 */
data class ReferencableList<T : Referencable>(
    val value: List<T>,
    val itemType: FieldType
) : Referencable {
    override val id: ReferenceId
        get() = "ReferencableList(${value.hashCode()})"

    override fun toString(): String = "List($value)"

    override fun hashCode(): Int = value.hashCode()

    override fun equals(other: Any?): Boolean {
        if (other is ReferencableList<*>) {
            return value.equals(other.value)
        }
        return false
    }
}

fun List<Referencable>.toReferencable(itemType: FieldType): ReferencableList<Referencable> {
    require(itemType is FieldType.ListOf) {
        "ReferencableLists must have List itemTypes, instead $itemType was provided"
    }
    return ReferencableList(this, itemType)
}
