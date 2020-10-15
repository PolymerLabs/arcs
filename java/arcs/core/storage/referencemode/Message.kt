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

package arcs.core.storage.referencemode

import arcs.core.common.Referencable
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.storage.ProxyMessage

/** Converts a general [ProxyMessage] into a reference mode-safe [ProxyMessage]. */
fun ProxyMessage<CrdtData, CrdtOperation, Any?>.toReferenceModeMessage():
  ProxyMessage<CrdtData, CrdtOperationAtTime, Referencable> {
    return when (this) {
      is ProxyMessage.ModelUpdate ->
        ProxyMessage.ModelUpdate(model, id)
      is ProxyMessage.Operations ->
        ProxyMessage.Operations(operations.toReferenceModeMessageOps(), id)
      is ProxyMessage.SyncRequest -> ProxyMessage.SyncRequest(id)
    }
  }

@Suppress("UNCHECKED_CAST")
private fun List<CrdtOperation>.toReferenceModeMessageOps(): List<CrdtOperationAtTime> {
  return this.map { op ->
    when (op) {
      is CrdtSingleton.Operation.Update<*> ->
        CrdtSingleton.Operation.Update(op.actor, op.versionMap, op.value)
      is CrdtSingleton.Operation.Clear<*> ->
        CrdtSingleton.Operation.Clear<Referencable>(op.actor, op.versionMap)
      is CrdtSet.Operation.Add<*> ->
        CrdtSet.Operation.Add(op.actor, op.versionMap, op.added)
      is CrdtSet.Operation.Remove<*> ->
        CrdtSet.Operation.Remove<Referencable>(op.actor, op.versionMap, op.removed)
      is CrdtSet.Operation.Clear<*> ->
        CrdtSet.Operation.Clear<Referencable>(op.actor, op.versionMap)
      else -> throw CrdtException("Unsupported operation for ReferenceModeStore: $this")
    }
  }
}
