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

import arcs.core.util.ArcsDuration
import arcs.core.util.ArcsInstant
import arcs.core.util.BigInt

/**
 * Re-export of types that all plaforms should implement.
 * See java/arcs/core/util/ for the platform independent interface and
 * java/arcs/core/util/platform/{platform}/Platform* for each platform's Implementation.
 */
typealias BigInt = BigInt
typealias ArcsInstant = ArcsInstant
typealias ArcsDuration = ArcsDuration

// Redoing these for now, don't know what else to do.

fun String.toBigInt(): BigInt = BigInt(this)

fun Number.toBigInt(): BigInt = when (this) {
  is BigInt -> this
  else -> BigInt.valueOf(this.toLong())
}
