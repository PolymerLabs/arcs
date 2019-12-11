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

package arcs.core.util

/** Returns a JSON-representation of the [String]. */
fun String.toJson(): String = "\"$this\""

/** Returns the contents of a JSON-representation of a [String]. */
fun String.fromJson(): String = substring(1, length - 1)
