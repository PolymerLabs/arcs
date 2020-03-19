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
package arcs.core.entity

import arcs.core.data.Schema

typealias SchemaHash = String

/**
 * A registry for generated [Schema]s.
 */
object SchemaRegistry {
    private val entitySpecs = mutableMapOf<SchemaHash, EntitySpec<out Entity>>()

    /** Store a [Schema] in the registry. */
    fun register(entitySpec: EntitySpec<out Entity>) {
        entitySpecs[entitySpec.SCHEMA.hash] = entitySpec
    }

    /** Given a [SchemaHash], return the [EntitySpec] for that hash, if it exists. */
    fun getEntitySpec(hash: SchemaHash) = entitySpecs[hash]

    /** Given a [SchemaHash], return the [Schema] for that hash, if it exists. */
    fun getSchema(hash: SchemaHash) = entitySpecs[hash]?.SCHEMA

    /** Clears the registry, for testing purposes. */
    fun clearForTest() {
        entitySpecs.clear()
    }
}
