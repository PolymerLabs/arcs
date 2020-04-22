package arcs.android.storage

import arcs.android.crdt.toData
import arcs.android.crdt.toOperation
import arcs.android.crdt.toProto
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.ProxyMessage
import com.google.protobuf.Int32Value

/** Constructs a [ProxyMessage] from the given [ProxyMessageProto]. */
fun ProxyMessageProto.toProxyMessage(): ProxyMessage<CrdtData, CrdtOperation, Any> {
    // Convert Int32Value to nullable Int.
    val id = if (hasId()) id.value else null
    return when (messageCase) {
        ProxyMessageProto.MessageCase.SYNC_REQUEST -> ProxyMessage.SyncRequest(
            id = id
        )
        ProxyMessageProto.MessageCase.MODEL_UPDATE -> ProxyMessage.ModelUpdate(
            id = id,
            model = modelUpdate.data.toData()
        )
        ProxyMessageProto.MessageCase.OPERATIONS -> ProxyMessage.Operations(
            id = id,
            operations = operations.operationsList.map { it.toOperation() }
        )
        ProxyMessageProto.MessageCase.MESSAGE_NOT_SET, null -> throw UnsupportedOperationException(
            "Unknown ProxyMessage type: $messageCase."
        )
    }
}

/** Serializes a [ProxyMessage] to its proto form. */
fun ProxyMessage<*, *, *>.toProto(): ProxyMessageProto {
    val proto = ProxyMessageProto.newBuilder()
    // Convert nullable Int to Int32Value.
    id?.let { proto.setId(Int32Value.of(it)) }
    when (this) {
        is ProxyMessage.SyncRequest -> {
            proto.syncRequest = ProxyMessageProto.SyncRequest.getDefaultInstance()
        }
        is ProxyMessage.ModelUpdate -> {
            proto.modelUpdate = ProxyMessageProto.ModelUpdate.newBuilder()
                .setData(model.toProto())
                .build()
        }
        is ProxyMessage.Operations -> {
            proto.operations = ProxyMessageProto.Operations.newBuilder()
                .addAllOperations(operations.map { it.toProto() })
                .build()
        }
        else -> throw UnsupportedOperationException("Unknown ProxyMessage type: $this.")
    }
    return proto.build()
}
