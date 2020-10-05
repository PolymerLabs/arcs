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

package arcs.android.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.MuxedProxyMessage

/** Constructs a [MuxedProxyMessage] from the given [MuxedProxyMessageProto]. */
fun MuxedProxyMessageProto.decode(): MuxedProxyMessage<CrdtData, CrdtOperation, Any?> {
  return MuxedProxyMessage(muxId, message.decode())
}

/** Serializes a [MuxedProxyMessage] to its proto form. */
fun MuxedProxyMessage<*, *, *>.toProto(): MuxedProxyMessageProto {
  return MuxedProxyMessageProto.newBuilder()
    .setMuxId(muxId)
    .setMessage(message.toProto())
    .build()
}
