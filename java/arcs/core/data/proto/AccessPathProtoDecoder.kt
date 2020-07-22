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
    val selectors = selectorsList.map { it.decode() }
    return AccessPath(particleSpec, connectionSpec, selectors)
}

fun AccessPath.encode(): AccessPathProto {
    val proto = AccessPathProto.newBuilder()
        .addAllSelectors(selectors.map { it.encode() })
    when (root) {
        is AccessPath.Root.Handle -> {
            val handleRoot = root as AccessPath.Root.Handle
            proto.handleConnection = handleRoot.handle.name
        }
        is AccessPath.Root.HandleConnection -> {
            val connectionRoot = root as AccessPath.Root.HandleConnection
            proto.particleSpec = connectionRoot.particle.spec.name
            proto.handleConnection = connectionRoot.connectionSpec.name
        }
        is AccessPath.Root.HandleConnectionSpec -> {
            val connectionSpecRoot = root as AccessPath.Root.HandleConnectionSpec
            proto.particleSpec = connectionSpecRoot.particleSpecName
            proto.handleConnection = connectionSpecRoot.connectionSpec.name
        }
        else -> throw UnsupportedOperationException("Unsupported AccessPath.Root type: $this")
    }
    return proto.build()
}

private fun AccessPathProto.Selector.decode(): AccessPath.Selector = when (selectorCase) {
    AccessPathProto.Selector.SelectorCase.FIELD -> AccessPath.Selector.Field(field)
    else -> throw UnsupportedOperationException("Unsupported AccessPathProto.Selector: $this")
}

private fun AccessPath.Selector.encode(): AccessPathProto.Selector {
    if (this !is AccessPath.Selector.Field) {
        throw UnsupportedOperationException("Unsupported Selector type: $this")
    }
    return AccessPathProto.Selector.newBuilder().setField(field).build()
}
