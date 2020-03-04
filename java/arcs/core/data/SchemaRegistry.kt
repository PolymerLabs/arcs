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


typealias SchemaHash = String

/**
 * A registry for generated [Schema]s.
 */
object SchemaRegistry {
    private val schemas = mutableMapOf<SchemaHash, Schema>()

    /** Store a [Schema] in the registry. */
    fun register(schema: Schema) {
        schemas[schema.hash] = schema
    }

    /** Given a [SchemaHash], return the [Schema] for that hash, if it exists. */
    fun fromHash(hash: SchemaHash) = schemas[hash]
}
