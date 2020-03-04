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
package arcs.core.data

/**
 * A registry for generated [Schema]s.
 */
object SchemaRegistry {
    private val schemas: MutableMap<String, Schema> = mutableMapOf()

    internal fun register(schema: Schema) {
        schemas[schema.hash] = schema
    }

    /** Given a schema hash as a String, return the schema for that has, if it exists. */
    fun fromHash(hash: String) = schemas[hash]
}
