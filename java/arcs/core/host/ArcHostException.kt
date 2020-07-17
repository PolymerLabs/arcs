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

/**
 * An [ArcHostException] represents an error that occured during the operation of one of the
 * methods on [ArcHost]. Because [ArcHost] implementations can be distributed across process or
 * even device boundaries, this class must represent a serialization of the true platform
 * dependent exception.
 */
class ArcHostException(message: String, val stackTrace: String) : Exception(message)
