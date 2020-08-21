package arcs.core.policy.proto

import arcs.core.data.proto.PolicyConstraintsProto
import arcs.core.data.proto.decode
import arcs.core.data.proto.encode
import arcs.core.policy.PartialClaim
import arcs.core.policy.PolicyConstraints

fun PolicyConstraintsProto.decode(): PolicyConstraints {
    return PolicyConstraints(
        policy = policy.decode(),
        egressCheck = egressCheck.decode(),
        claims = typeClaimsList.associate { typeClaim ->
            typeClaim.schemaName to typeClaim.partialClaimsList.map { claim ->
                PartialClaim(
                    selectors = claim.selectorsList.map { it.decode() },
                    predicate = claim.predicate.decode()
                )
            }
        }
    )
}

fun PolicyConstraints.encode(): PolicyConstraintsProto {
    return PolicyConstraintsProto.newBuilder()
        .setPolicy(policy.encode())
        .setEgressCheck(egressCheck.encode())
        .addAllTypeClaims(
            claims.map { (schemaName, partialClaims) ->
                PolicyConstraintsProto.TypeClaims.newBuilder()
                    .setSchemaName(schemaName)
                    .addAllPartialClaims(partialClaims.map { it.encode() })
                    .build()
            }
        )
        .build()
}

private fun PartialClaim.encode(): PolicyConstraintsProto.PartialClaim {
    return PolicyConstraintsProto.PartialClaim.newBuilder()
        .addAllSelectors(selectors.map { it.encode() })
        .setPredicate(predicate.encode())
        .build()
}
