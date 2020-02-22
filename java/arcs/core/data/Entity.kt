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
    val id: String,
    val schema: Schema,
    val data: MutableMap<FieldName, Any?>
) {
    val entries: Set<Map.Entry<FieldName, Any?>>
        get() = data.entries

    fun put(key: FieldName, value: Any?): Any? {
        require(key in schema.fields.collections || key in schema.fields.singletons) {
            "Illegal field $key, not part of ${schema.name}'s schema."
        }
        return data.put(key, value)
    }

    fun toReference(): Reference<Entity> = TODO("not implemented")
}
