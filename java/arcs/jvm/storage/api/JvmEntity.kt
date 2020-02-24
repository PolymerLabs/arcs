
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

package arcs.jvm.storage.api

import arcs.core.data.RawEntity
import arcs.core.storage.api.Entity
import arcs.core.storage.api.EntitySpec

/** JVM-specific extensions to the base [Entity] interface. */
interface JvmEntity : Entity {
    fun serialize(): RawEntity
}

interface JvmEntitySpec<T : Entity> : EntitySpec<T> {
    /**
     * Takes a [Map] representing a serialized representation of a [RawEntity] from the
     * storage layer, and converts it to a concrete entity class.
     * TODO: replace this with kotlinx.serialization
     */
    fun deserialize(data: RawEntity): T
}
