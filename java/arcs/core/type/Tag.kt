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

package arcs.core.type

/** The allowable types of [Type]s. */
// Commented-out tags are unused so far in the Kotlin codebase.
enum class Tag {
    // Arc,
    // BigCollection,
    Collection,
    Count,
    Entity,
    // Handle,
    // Interface,
    Reference,
    Tuple,
    Singleton,
    // Slot,
    TypeVariable,
}
