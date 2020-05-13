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

package arcs.core.data.proto

import arcs.core.data.AccessPath
import arcs.core.data.HandleConnectionSpec

/** Decodes an [AccessPathProto] into [AccesssPath]. */
fun AccessPathProto.decode(
    particleSpecName: String,
    connectionSpecs: Map<String, HandleConnectionSpec>
): AccessPath {
    val connectionSpec = connectionSpecs[handleConnection]
    requireNotNull(connectionSpec) {
        "Connection '$handleConnection' not found in connection specs!"
    }
    // TODO(bgogul): Selectors
    return AccessPath(particleSpecName, connectionSpec)
}
