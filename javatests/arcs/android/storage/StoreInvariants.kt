/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.android.storage

import arcs.android.storage.database.DatabaseImpl
import arcs.core.common.Referencable
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.testing.CrdtSetHelper
import arcs.core.data.RawEntity
import arcs.core.storage.ProxyMessage
import arcs.core.storage.UntypedActiveStore
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CompletableDeferred

/**
 * Given a list of [ops], applies them to the [writeStore], reads the result back from [readStore]
 * and compares it to a CrdtModel to which the same [ops] are applied.
 */
suspend fun invariant_storeRoundTrip_sameAsCrdtModel(
  writeStore: UntypedActiveStore,
  readStore: UntypedActiveStore,
  ops: List<CrdtSet.Operation<RawEntity>>
) {
  writeStore.onProxyMessage(ProxyMessage.Operations(ops, 1))
  val model = getModelFromStore(readStore)
  val set = applyOpsToSet(ops).data

  assertThat(model.versionMap).isEqualTo(set.versionMap)
  assertThat(model.values).isEqualTo(set.values)
}

private suspend fun getModelFromStore(store: UntypedActiveStore): CrdtSet.Data<RawEntity> {
  val modelReceived = CompletableDeferred<CrdtSet.Data<RawEntity>>()
  val callbackToken = store.on {
    if (it is ProxyMessage.ModelUpdate) {
      modelReceived.complete(it.model as CrdtSet.Data<RawEntity>)
    }
  }
  store.onProxyMessage(ProxyMessage.SyncRequest(callbackToken))
  return modelReceived.await()
}

/**
 * Applies the given [ops] to a new crdt set, using the [DatabaseImpl.DATABASE_CRDT_ACTOR].
 */
private fun <T : Referencable> applyOpsToSet(ops: List<CrdtSet.Operation<T>>): CrdtSet<T> {
  val collection = CrdtSet<T>()
  val collectionHelper = CrdtSetHelper(DatabaseImpl.DATABASE_CRDT_ACTOR, collection)
  ops.forEach {
    when (it) {
      is CrdtSet.Operation.Add<T> -> collectionHelper.add(it.added)
      is CrdtSet.Operation.Remove<T> -> collectionHelper.remove(it.removed)
      is CrdtSet.Operation.Clear<T> -> collectionHelper.clear()
      else -> throw UnsupportedOperationException("Don't know how to apply $it")
    }
  }
  return collection
}
