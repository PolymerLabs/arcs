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

package arcs.crdt

/** Exception describing an issue which has occurred while working with CRDT data. */
class CrdtException(message: String, cause: Throwable? = null) : Exception(message, cause)
