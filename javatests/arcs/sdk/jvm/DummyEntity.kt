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

package arcs.sdk.jvm

import arcs.sdk.Entity
import arcs.sdk.EntitySpec

/** Fake [Entity] implementation. */
data class DummyEntity(val text: String) : Entity {
    override var internalId = "abc"

    override fun schemaHash() = "def"

    /** Fake [EntitySpec] implementation for [DummyEntity]. */
    class Spec : EntitySpec<DummyEntity> {
        override fun create() = DummyEntity("default")
    }
}
