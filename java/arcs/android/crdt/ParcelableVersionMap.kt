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

package arcs.android.crdt

import android.os.Parcel
import arcs.android.util.readProto
import arcs.core.crdt.VersionMap

/** Constructs a [VersionMap] from the given [VersionMapProto]. */
@Suppress("FunctionName")
fun VersionMap(proto: VersionMapProto) = VersionMap(proto.versionMap)

/** Serializes a [VersionMap] to its proto form. */
fun VersionMap.toProto(): VersionMapProto = VersionMapProto.newBuilder()
    .putAllVersion(this.backingMap)
    .build()

/** Reads a [VersionMap] out of a [Parcel]. */
fun Parcel.readVersionMap(): VersionMap? =
    readProto(VersionMapProto.getDefaultInstance())?.let { VersionMap(it) }
