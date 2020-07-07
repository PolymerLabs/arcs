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

    /**
     * Returns the [Schema] stored in the registry for the given [SchemaHash].
     *
     * @throws NoSuchElementException if no schema has been registered for the requested schema hash
     */
    fun getSchema(hash: SchemaHash): Schema = schemas.getOrElse(hash) {
        throw NoSuchElementException("Schema hash '$hash' not found in SchemaRegistry.")
    }

    /** Clears the registry, for testing purposes. */
    fun clearForTest() {
        schemas.clear()
    }
}
