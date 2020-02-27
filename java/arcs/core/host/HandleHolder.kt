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
package arcs.core.host

import arcs.core.storage.api.Entity
import arcs.core.storage.api.EntitySpec
import arcs.core.storage.api.Handle

/**
 * Interface used by [ArcHost]s to interact dynamically with code-generated [Handle] fields
 * used by [Particle]s.
 *
 * @property handles Key is a handle name, value is the corresponding [Handle].
 * @property entitySpecs Key is a handle name, value is the corresponding [EntitySpec].
 */
interface HandleHolder {
    val handles: Map<String, Handle>
    val entitySpecs: Map<String, EntitySpec<out Entity>>
}
