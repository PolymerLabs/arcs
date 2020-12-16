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

/** Converts the [RawEntity] into a [CrdtEntity.Data] model, at the given version. */
fun RawEntity.toCrdtEntityData(
  versionMap: VersionMap,
  referenceBuilder: (Referencable) -> CrdtEntity.Reference = { CrdtEntity.ReferenceImpl(it.id) }
): CrdtEntity.Data = CrdtEntity.Data(versionMap.copy(), this, referenceBuilder)
