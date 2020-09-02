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
package arcs.android.util

import android.os.Trace
import arcs.android.crdt.CrdtCountProto
import arcs.android.crdt.CrdtDataProto
import arcs.android.crdt.CrdtEntityProto
import arcs.android.crdt.CrdtEntityReferenceProto
import arcs.android.crdt.CrdtOperationProto
import arcs.android.crdt.CrdtSetProto
import arcs.android.crdt.CrdtSingletonProto
import arcs.android.crdt.RawEntityProto
import arcs.android.crdt.ReferencablePrimitiveProto
import arcs.android.crdt.ReferencableProto
import arcs.android.crdt.ReferencableSetProto
import arcs.android.crdt.ReferenceProto
import arcs.android.crdt.VersionMapProto
import arcs.android.storage.ProxyMessageProto
import java.util.concurrent.ExecutorService

/**
 * Run asynchronously as a cache warmer to suffer from Arcs protos initialization
 * overhead as well as cache misses on behalf of whoever needs Arcs capabilities.
 *
 * The initialization overhead typically comes from instantiating default instance
 * and parsing/building proto schema.
 *
 * Recommend executing [ProtoPrefetcher.prefetch] as early as possible i.e.
 * the entry of Application lifecycle: `onCreate()`
 */
object ProtoPrefetcher {
    /** Identify [ProtoPrefetcher] in thread lists and system traces. */
    private const val name = "ProtoPrefetcher"

    /** Procedures to be taken to warm up Arcs protos. */
    private val procedures = arrayOf<() -> Any>(
        ProxyMessageProto::getDefaultInstance,
        ProxyMessageProto.newBuilder()::build,
        ProxyMessageProto.SyncRequest::getDefaultInstance,
        ProxyMessageProto.SyncRequest.newBuilder()::build,
        ProxyMessageProto.ModelUpdate::getDefaultInstance,
        ProxyMessageProto.ModelUpdate.newBuilder()::build,
        ProxyMessageProto.Operations::getDefaultInstance,
        ProxyMessageProto.Operations.newBuilder()::build,
        CrdtDataProto::getDefaultInstance,
        CrdtDataProto.newBuilder()::build,
        CrdtOperationProto::getDefaultInstance,
        CrdtOperationProto.newBuilder()::build,
        CrdtCountProto::getDefaultInstance,
        CrdtCountProto.newBuilder()::build,
        CrdtCountProto.Data::getDefaultInstance,
        CrdtCountProto.Data.newBuilder()::build,
        CrdtCountProto.Operation::getDefaultInstance,
        CrdtCountProto.Operation.newBuilder()::build,
        CrdtCountProto.Operation.Increment::getDefaultInstance,
        CrdtCountProto.Operation.Increment.newBuilder()::build,
        CrdtCountProto.Operation.MultiIncrement::getDefaultInstance,
        CrdtCountProto.Operation.MultiIncrement.newBuilder()::build,
        CrdtEntityProto::getDefaultInstance,
        CrdtEntityProto.newBuilder()::build,
        CrdtEntityProto.Data::getDefaultInstance,
        CrdtEntityProto.Data.newBuilder()::build,
        CrdtEntityProto.Operation::getDefaultInstance,
        CrdtEntityProto.Operation.newBuilder()::build,
        CrdtEntityProto.Operation.SetSingleton::getDefaultInstance,
        CrdtEntityProto.Operation.SetSingleton.newBuilder()::build,
        CrdtEntityProto.Operation.ClearSingleton::getDefaultInstance,
        CrdtEntityProto.Operation.ClearSingleton.newBuilder()::build,
        CrdtEntityProto.Operation.AddToSet::getDefaultInstance,
        CrdtEntityProto.Operation.AddToSet.newBuilder()::build,
        CrdtEntityProto.Operation.RemoveFromSet::getDefaultInstance,
        CrdtEntityProto.Operation.RemoveFromSet.newBuilder()::build,
        CrdtEntityProto.Operation.ClearAll::getDefaultInstance,
        CrdtEntityProto.Operation.ClearAll.newBuilder()::build,
        CrdtSetProto::getDefaultInstance,
        CrdtSetProto.newBuilder()::build,
        CrdtSetProto.DataValue::getDefaultInstance,
        CrdtSetProto.DataValue.newBuilder()::build,
        CrdtSetProto.Data::getDefaultInstance,
        CrdtSetProto.Data.newBuilder()::build,
        CrdtSetProto.Operation::getDefaultInstance,
        CrdtSetProto.Operation.newBuilder()::build,
        CrdtSetProto.Operation.Add::getDefaultInstance,
        CrdtSetProto.Operation.Add.newBuilder()::build,
        CrdtSetProto.Operation.Remove::getDefaultInstance,
        CrdtSetProto.Operation.Remove.newBuilder()::build,
        CrdtSetProto.Operation.Clear::getDefaultInstance,
        CrdtSetProto.Operation.Clear.newBuilder()::build,
        CrdtSetProto.Operation.FastForward::getDefaultInstance,
        CrdtSetProto.Operation.FastForward.newBuilder()::build,
        CrdtSingletonProto::getDefaultInstance,
        CrdtSingletonProto.newBuilder()::build,
        CrdtSingletonProto.Data::getDefaultInstance,
        CrdtSingletonProto.Data.newBuilder()::build,
        CrdtSingletonProto.Operation::getDefaultInstance,
        CrdtSingletonProto.Operation.newBuilder()::build,
        CrdtSingletonProto.Operation.Update::getDefaultInstance,
        CrdtSingletonProto.Operation.Update.newBuilder()::build,
        CrdtSingletonProto.Operation.Clear::getDefaultInstance,
        CrdtSingletonProto.Operation.Clear.newBuilder()::build,
        ReferencableProto::getDefaultInstance,
        ReferencableProto.newBuilder()::build,
        ReferencableSetProto::getDefaultInstance,
        ReferencableSetProto.newBuilder()::build,
        RawEntityProto::getDefaultInstance,
        RawEntityProto.newBuilder()::build,
        CrdtEntityReferenceProto::getDefaultInstance,
        CrdtEntityReferenceProto.newBuilder()::build,
        ReferenceProto::getDefaultInstance,
        ReferenceProto.newBuilder()::build,
        ReferencablePrimitiveProto::getDefaultInstance,
        ReferencablePrimitiveProto.newBuilder()::build,
        VersionMapProto::getDefaultInstance,
        VersionMapProto.newBuilder()::build
    )

    /**
     * Execute [procedures] to warm up Arcs protos ahead-of-time at the specified [executorService].
     */
    fun prefetch(executorService: ExecutorService) = executorService.execute { prefetch() }

    /**
     * Execute [procedures] to warm up Arcs protos ahead-of-time.
     */
    fun prefetch() {
        Trace.beginSection(name)
        procedures.forEach { it() }
        Trace.endSection()
    }
}
