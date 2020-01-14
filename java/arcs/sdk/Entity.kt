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

package arcs.sdk

interface Entity {
    var internalId: String
    fun schemaHash(): String
    fun isSet(): Boolean
    fun getFieldsNotSet(): List<String>
}

/**
 * Spec for an [Entity] type. Can create and deserialize new entities.
 *
 * Implementation classes are autogenerated for each entity type.
 */
interface EntitySpec<T : Entity> {
    /** Returns an empty new instance of [T]. */
    fun create(): T
}
