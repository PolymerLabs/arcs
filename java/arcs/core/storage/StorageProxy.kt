package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtModel
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.internal.VersionMap

/** ValueAndVersion is a tuple of a value of some type and a [VersionMap] provided from its [StorageProxy]. */
data class ValueAndVersion<T>(val value: T, val versionMap: VersionMap)

/**
 * StorageProxy is an intermediary between a [Handle] and the [Store] that the [Handle] wants to
 * communicate with. It also maintains a local copy of the backing [CrdtModel].
 */
// TODO: Connect to storage.
class StorageProxy<Data : CrdtData, Op : CrdtOperation, T>(
    val model: CrdtModel<Data, Op, T>
) {
    val versionMap = VersionMap()

    fun getParticleView() = ValueAndVersion(model.consumerView, versionMap.copy())

    fun applyOp(op: Op) = model.applyOperation(op)
}
