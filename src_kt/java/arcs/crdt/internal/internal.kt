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

package arcs.crdt.internal

/** Denotes an individual actor responsible for modifications to a Crdt. */
typealias Actor = String

/** Represents a referencable object, ie. one which can be referenced by a unique [id]. */
interface Referencable {
  /** Unique identifier of the Referencable object. */
  val id: String
}
