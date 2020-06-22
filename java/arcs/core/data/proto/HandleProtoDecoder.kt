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

/**
 * Converts [HandleProto] into [Handle].
 *
 * If a type is not set in the [HandleProto], it is initialized to a newly created TypeVariable.
 * @param knownHandles is a map of [Handle]s used the the recipe level to decode associatedHandles.
 */
fun HandleProto.decode(knownHandles: Map<String, Handle> = emptyMap()) = Handle(
    name = name,
    id = id,
    fate = fate.decode(),
    tags = tagsList,
    storageKey = storageKey,
    type = if (hasType()) type.decode() else TypeVariable("$name"),
    annotations = annotationsList.map { it.decode() },
    associatedHandles = associatedHandlesList.map { requireNotNull(knownHandles[it]) }
)
