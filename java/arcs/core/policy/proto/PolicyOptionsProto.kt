package arcs.core.policy.proto

import arcs.core.data.proto.PolicyOptionsProto
import arcs.core.policy.PolicyOptions

fun PolicyOptionsProto.decode() = PolicyOptions(storeIdToTypeMap)

fun PolicyOptions.encode(): PolicyOptionsProto {
    return PolicyOptionsProto.newBuilder().putAllStoreIdToType(storeMap).build()
}
