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

package arcs.core.crdt.extension

import arcs.core.common.Referencable
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.VersionMap
import arcs.core.data.RawEntity
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.util.Base64

/** Converts the [RawEntity] into a [CrdtEntity.Data] model, at the given version. */
fun RawEntity.toCrdtEntityData(versionMap: VersionMap): CrdtEntity.Data =
    CrdtEntity.Data(versionMap.copy(), this) { CrdtEntity.ReferenceImpl(it.id) }

private fun Any?.toReferencable(): Referencable {
    requireNotNull(this) { "Cannot create a referencable from a null value." }
    return when {
        ReferencablePrimitive.isSupportedPrimitive(this::class) -> {
            if (this is ByteArray) {
                ReferencablePrimitive(
                    ByteArray::class,
                    this,
                    valueRepr = Base64.encode(this)
                )
            } else {
                ReferencablePrimitive(this::class, this)
            }
        }
        this is Referencable -> this
        else -> throw IllegalArgumentException(
            "Entity contains non-referencable non-primitive values."
        )
    }
}
