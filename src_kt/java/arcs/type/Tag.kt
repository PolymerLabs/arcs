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

package arcs.type

/** The allowable types of [Type]s. */
enum class Tag {
  Arc,
  BigCollection,
  Collection,
  Count,
  Entity,
  Handle,
  Interface,
  Reference,
  Relation,
  Singleton,
  Slot,
  TypeVariable,
}
