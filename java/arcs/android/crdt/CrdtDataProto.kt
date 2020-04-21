package arcs.android.crdt

import arcs.core.crdt.CrdtCount
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton

/** Constructs a [CrdtData] from the given [CrdtDataProto]. */
fun CrdtDataProto.toData(): CrdtData = when (dataCase) {
    CrdtDataProto.DataCase.COUNT -> count.toData()
    CrdtDataProto.DataCase.ENTITY -> entity.toData()
    CrdtDataProto.DataCase.SET -> set.toData()
    CrdtDataProto.DataCase.SINGLETON -> singleton.toData()
    CrdtDataProto.DataCase.DATA_NOT_SET, null -> throw UnsupportedOperationException(
        "Unknown CrdtData type: $dataCase."
    )
}

/** Serializes a [CrdtData] to its proto form. */
fun CrdtData.toProto(): CrdtDataProto {
    val proto = CrdtDataProto.newBuilder()
    when (this) {
        is CrdtCount.Data -> proto.count = toProto()
        is CrdtEntity.Data -> proto.entity = toProto()
        is CrdtSet.Data<*> -> proto.set = toProto()
        is CrdtSingleton.Data<*> -> proto.singleton = toProto()
        else -> throw UnsupportedOperationException("Unknown CrdtData type: $this.")
    }
    return proto.build()
}
