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

import arcs.core.data.HandleMode
import arcs.core.data.Plan.HandleConnection
import arcs.core.data.TypeVariable
import arcs.core.storage.StorageKeyParser

/**
 * Converts a [HandleProto] into [HandleConnection].
 *
 * If a type is not set in the [HandleProto], it is initialized to a newly created TypeVariable.
*/
fun HandleProto.decodeAsHandleConnection(mode: HandleMode) = HandleConnection(
    // TODO(bgogul): name, fate, associatedHandles, ttl,
    storageKey = StorageKeyParser.parse(storageKey),
    mode = mode,
    type = if (hasType()) type.decode() else TypeVariable("$name"),
    ttl = null
)
