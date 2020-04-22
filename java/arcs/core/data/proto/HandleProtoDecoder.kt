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

import arcs.core.data.Capabilities
import arcs.core.data.Recipe.Handle
import arcs.core.data.TypeVariable

/** Converts [HandleProto.Fate] into [Handle.Fate]. */
fun HandleProto.Fate.decode() = when (this) {
    HandleProto.Fate.UNSPECIFIED ->
        throw IllegalArgumentException("HandleProto.Fate value not set.")
    HandleProto.Fate.CREATE -> Handle.Fate.CREATE
    HandleProto.Fate.USE -> Handle.Fate.USE
    HandleProto.Fate.MAP -> Handle.Fate.MAP
    HandleProto.Fate.COPY -> Handle.Fate.COPY
    HandleProto.Fate.JOIN -> Handle.Fate.JOIN
    HandleProto.Fate.UNRECOGNIZED ->
        throw IllegalArgumentException("Invalid HandleProto.Fate value.")
}

/** Converts List<[HandleProto.Fate]> into [Capabilities]. */
fun List<HandleProto.Capability>.decode() = Capabilities(
    this.map {
        when (it) {
            HandleProto.Capability.PERSISTENT -> Capabilities.Capability.Persistent
            HandleProto.Capability.QUERYABLE -> Capabilities.Capability.Queryable
            HandleProto.Capability.TIED_TO_ARC -> Capabilities.Capability.TiedToArc
            HandleProto.Capability.TIED_TO_RUNTIME -> Capabilities.Capability.TiedToRuntime
            HandleProto.Capability.UNRECOGNIZED ->
                throw IllegalArgumentException("Invalid HandleProto.Capability value.")
        }
    }.toSet()
)

/**
 * Converts [HandleProto] into [Handle].
 *
 * If a type is not set in the [HandleProto], it is initialized to a newly created TypeVariable.
 */
fun HandleProto.decode() = Handle(
    name = name,
    fate = fate.decode(),
    storageKey = storageKey,
    type = if (hasType()) type.decode() else TypeVariable("$name"),
    capabilities = capabilitiesList.decode(),
    associatedHandles = getAssociatedHandlesList()
)
