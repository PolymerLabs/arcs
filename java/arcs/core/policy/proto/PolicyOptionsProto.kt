package arcs.core.policy.proto

import arcs.core.data.proto.PolicyOptionsProto
import arcs.core.policy.PolicyOptions

fun PolicyOptionsProto.decode() = PolicyOptions(
    storeIdToTypeMap,
    emptyMap()
)

fun PolicyOptions.encode(): PolicyOptionsProto {
    return PolicyOptionsProto.newBuilder().putAllStoreIdToType(storeMap).build()
}
