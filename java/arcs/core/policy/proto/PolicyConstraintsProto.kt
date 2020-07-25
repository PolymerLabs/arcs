package arcs.core.policy.proto

import arcs.core.data.HandleConnectionSpec
import arcs.core.data.proto.PolicyConstraintsProto
import arcs.core.data.proto.decode
import arcs.core.data.proto.encode
import arcs.core.policy.PolicyConstraints

fun PolicyConstraintsProto.decode(
    connectionSpecs: Map<String, HandleConnectionSpec>
): PolicyConstraints {
    return PolicyConstraints(
        policy = policy.decode(),
        egressCheck = egressCheck.decode(),
        storeClaims = storeConstraintsList.associate { constraint ->
            constraint.storeId to constraint.claimsList.map { it.decode(connectionSpecs) }
        }
    )
}

fun PolicyConstraints.encode(): PolicyConstraintsProto {
    return PolicyConstraintsProto.newBuilder()
        .setPolicy(policy.encode())
        .setEgressCheck(egressCheck.encode())
        .addAllStoreConstraints(
            storeClaims.map { (storeId, claims) ->
                PolicyConstraintsProto.StoreConstraints.newBuilder()
                    .setStoreId(storeId)
                    .addAllClaims(claims.map { it.encode() })
                    .build()
            }
        )
        .build()
}
