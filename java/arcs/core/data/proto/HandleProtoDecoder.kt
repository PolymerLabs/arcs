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

/** Converts [Handle.Fate] into [HandleProto.Fate] enum. */
fun Handle.Fate.encode(): HandleProto.Fate = when (this) {
  Handle.Fate.CREATE -> HandleProto.Fate.CREATE
  Handle.Fate.USE -> HandleProto.Fate.USE
  Handle.Fate.MAP -> HandleProto.Fate.MAP
  Handle.Fate.COPY -> HandleProto.Fate.COPY
  Handle.Fate.JOIN -> HandleProto.Fate.JOIN
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
  type = if (hasType()) type.decode() else TypeVariable(name),
  annotations = annotationsList.map { it.decode() },
  associatedHandles = associatedHandlesList.map { requireNotNull(knownHandles[it]) }
)

/** Converts a [Handle] to a [HandleProto]. */
fun Handle.encode(): HandleProto {
  val builder = HandleProto.newBuilder()
    .setName(name)
    .setId(id)
    .setFate(fate.encode())
    .addAllTags(tags)
    .setType(type.encode())
    .addAllAnnotations(annotations.map { it.encode() })
    .addAllAssociatedHandles(associatedHandles.map { it.name })

  storageKey?.let { builder.setStorageKey(it) }

  return builder.build()
}
