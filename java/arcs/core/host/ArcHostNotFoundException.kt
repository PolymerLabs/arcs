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

package arcs.core.host

import arcs.sdk.Particle

/**
 * An [ArcHostNotFoundException] is thrown if a [Particle] has an annotation with
 * [TargetHost] that requests an [ArcHost] that is not registered with a [HostRegistry].
 */
class ArcHostNotFoundException(msg: String) : Exception(msg)
