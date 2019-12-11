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

package arcs.core.data

/** The name of a field within an entity. */
typealias FieldName = String

/**
 * TODO: needs implementation
 */
class Entity(
    val name: String,
    val data: MutableMap<FieldName, Any?>
) : AbstractMutableMap<FieldName, Any?>() {
    @Suppress("UNCHECKED_CAST")
    override val entries: MutableSet<MutableMap.MutableEntry<FieldName, Any?>>
        get() = data.entries

    override fun put(key: FieldName, value: Any?): Any? {
        require(key !in data) { "Illegal field $key, not part of $name's schema." }
        return data.put(key, value)
    }
}
