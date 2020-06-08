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
    connectionSpecs: Map<String, HandleConnectionSpec>
): AccessPath {
    val connectionSpec = connectionSpecs[handleConnection]
    requireNotNull(connectionSpec) {
        "Connection '$handleConnection' not found in connection specs!"
    }
    val selectors = selectorsList.map {
        when (it.selectorCase) {
            AccessPathProto.Selector.SelectorCase.FIELD -> AccessPath.Selector.Field(it.field)
            else -> throw IllegalArgumentException(
                "Cannot decode a ${it.selectorCase.name} type to a [AccessPath.Selector]."
            )
        }
    }
    return AccessPath(particleSpec, connectionSpec, selectors)
}
