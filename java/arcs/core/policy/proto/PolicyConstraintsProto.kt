package arcs.core.policy.proto

import arcs.core.data.proto.PolicyConstraintsProto
import arcs.core.data.proto.decode
import arcs.core.data.proto.encode
import arcs.core.policy.PolicyConstraints
import arcs.core.policy.SelectorClaim

fun PolicyConstraintsProto.decode(): PolicyConstraints {
  return PolicyConstraints(
    policy = policy.decode(),
    egressCheck = egressCheck.decode(),
    claims = schemaClaimsList.associate { schemaClaim ->
      schemaClaim.schemaName to schemaClaim.selectorClaimsList.map { claim ->
        SelectorClaim(
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
    .addAllSchemaClaims(
      claims.map { (schemaName, selectorClaims) ->
        PolicyConstraintsProto.SchemaClaims.newBuilder()
          .setSchemaName(schemaName)
          .addAllSelectorClaims(selectorClaims.map { it.encode() })
          .build()
      }
    )
    .build()
}

private fun SelectorClaim.encode(): PolicyConstraintsProto.SelectorClaim {
  return PolicyConstraintsProto.SelectorClaim.newBuilder()
    .addAllSelectors(selectors.map { it.encode() })
    .setPredicate(predicate.encode())
    .build()
}
