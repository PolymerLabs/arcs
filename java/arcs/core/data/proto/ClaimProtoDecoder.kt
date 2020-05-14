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

package arcs.core.data.proto

import arcs.core.data.Claim
import arcs.core.data.HandleConnectionSpec

/** Decodes an [ClaimProto] into [Claim]. */
fun ClaimProto.decode(
    connectionSpecs: Map<String, HandleConnectionSpec>
): Claim {
    return when (claimCase) {
        ClaimProto.ClaimCase.DERIVES_FROM -> Claim.DerivesFrom(
            target = derivesFrom.target.decode(connectionSpecs),
            source = derivesFrom.source.decode(connectionSpecs)
        )
        ClaimProto.ClaimCase.ASSUME -> Claim.Assume(
            assume.accessPath.decode(connectionSpecs),
            assume.predicate.decode()
        )
        ClaimProto.ClaimCase.CLAIM_NOT_SET ->
            throw IllegalArgumentException("ClaimProto has unknown value.")
        else -> throw IllegalArgumentException("Cannot decode a [ClaimProto].")
    }
}
