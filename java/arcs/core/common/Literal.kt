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

package arcs.core.common

/**
 * An interface which denotes a particular (and immutable) class as being a serializable/copyable
 * instance of a more complicated class.
 */
interface Literal

/** A list of [Literal]s that is itself a [Literal]. */
class LiteralList<T : Literal>(private val items: List<T>) : List<T> by items, Literal
