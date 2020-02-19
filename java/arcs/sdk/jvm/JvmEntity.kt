
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

package arcs.sdk

import arcs.core.data.RawEntity

/** JVM-specific extensions to the base [Entity] interface. */
interface JvmEntity : Entity {
    fun serialize(): RawEntity
}

interface JvmEntitySpec<T : Entity> : EntitySpec<T>
