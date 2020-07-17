package arcs.android.crdt

import arcs.core.crdt.CrdtCount
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton

/** Constructs a [CrdtOperation] from the given [CrdtOperationProto]. */
fun CrdtOperationProto.toOperation(): CrdtOperation = when (operationCase) {
    CrdtOperationProto.OperationCase.COUNT -> count.toOperation()
    CrdtOperationProto.OperationCase.ENTITY -> entity.toOperation()
    CrdtOperationProto.OperationCase.SET -> set.toOperation()
    CrdtOperationProto.OperationCase.SINGLETON -> singleton.toOperation()
    CrdtOperationProto.OperationCase.OPERATION_NOT_SET, null -> throw UnsupportedOperationException(
        "Unknown CrdtOperation type: $operationCase."
    )
}

/** Serializes a [CrdtOperation] to its proto form. */
fun CrdtOperation.toProto(): CrdtOperationProto {
    val proto = CrdtOperationProto.newBuilder()
    when (this) {
        is CrdtCount.Operation -> proto.count = toProto()
        is CrdtEntity.Operation -> proto.entity = toProto()
        is CrdtSet.Operation<*> -> proto.set = toProto()
        is CrdtSingleton.Operation<*> -> proto.singleton = toProto()
        else -> throw UnsupportedOperationException("Unknown CrdtOperation type: $this.")
    }
    return proto.build()
}
