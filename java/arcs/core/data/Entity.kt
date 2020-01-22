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


/** Bare-bones entity data for usage in core/storage code. */
// TODO: Rename, or consolidate with the Entity class in the sdk package.
data class Entity(
    val schema: Schema,
    val data: MutableMap<FieldName, Any?>
) : AbstractMutableMap<FieldName, Any?>() {
    @Suppress("UNCHECKED_CAST")
    override val entries: MutableSet<MutableMap.MutableEntry<FieldName, Any?>>
        get() = data.entries

    override fun put(key: FieldName, value: Any?): Any? {
        require(key !in data) {
            "Illegal field $key, not part of ${schema.name}'s schema."
        }
        return data.put(key, value)
    }
}
